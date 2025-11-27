import * as dgram from 'dgram';
import { EventEmitter } from 'events';

export interface PXEDevice {
  macAddress: string;
  ipAddress?: string;
  hostname?: string;
  detectedAt: Date;
  bootType: 'DHCP' | 'TFTP' | 'HTTP';
  lastSeen: Date;
}

/**
 * PXE Traffic Sniffer - Monitors network traffic for PXE boot activity
 * Listens on DHCP (67/68) and TFTP (69) ports for device boot requests
 */
export class PXETrafficSniffer extends EventEmitter {
  private dhcpServer?: dgram.Socket;
  private tftpServer?: dgram.Socket;
  private pxeDevices: Map<string, PXEDevice> = new Map();
  private isRunning = false;

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.startDHCPMonitoring();
      this.startTFTPMonitoring();
      this.isRunning = true;
      console.log('[PXETrafficSniffer] Started monitoring for PXE boot traffic');
    } catch (error) {
      console.error('[PXETrafficSniffer] Failed to start:', error);
    }
  }

  stop(): void {
    if (this.dhcpServer) {
      this.dhcpServer.close();
    }
    if (this.tftpServer) {
      this.tftpServer.close();
    }
    this.isRunning = false;
    console.log('[PXETrafficSniffer] Stopped monitoring PXE traffic');
  }

  private startDHCPMonitoring(): void {
    this.dhcpServer = dgram.createSocket('udp4');

    this.dhcpServer.on('message', (msg, rinfo) => {
      try {
        const pxeDevice = this.parseDHCPPacket(msg, rinfo);
        if (pxeDevice) {
          this.recordPXEDevice(pxeDevice);
          this.emit('pxe-detected', pxeDevice);
        }
      } catch (error) {
        // Silently ignore parse errors
      }
    });

    this.dhcpServer.on('error', (error: any) => {
      // Port may already be in use or not accessible - that's ok
      console.debug('[PXETrafficSniffer] DHCP monitoring error (expected):', error.code);
    });

    // Try to bind to DHCP port, but don't fail if it's already bound
    try {
      this.dhcpServer.bind(67, '0.0.0.0');
    } catch (error) {
      console.debug('[PXETrafficSniffer] Could not bind to DHCP port 67 (expected)');
    }
  }

  private startTFTPMonitoring(): void {
    this.tftpServer = dgram.createSocket('udp4');

    this.tftpServer.on('message', (msg, rinfo) => {
      try {
        const pxeDevice = this.parseTFTPPacket(msg, rinfo);
        if (pxeDevice) {
          this.recordPXEDevice(pxeDevice);
          this.emit('pxe-detected', pxeDevice);
        }
      } catch (error) {
        // Silently ignore parse errors
      }
    });

    this.tftpServer.on('error', (error: any) => {
      console.debug('[PXETrafficSniffer] TFTP monitoring error (expected):', error.code);
    });

    // Try to bind to TFTP port
    try {
      this.tftpServer.bind(69, '0.0.0.0');
    } catch (error) {
      console.debug('[PXETrafficSniffer] Could not bind to TFTP port 69 (expected)');
    }
  }

  private parseDHCPPacket(buffer: Buffer, rinfo: dgram.RemoteInfo): PXEDevice | null {
    // DHCP packet structure
    if (buffer.length < 240) return null;

    // Check for DHCP magic cookie at offset 236
    const magicCookie = buffer.readUInt32BE(236);
    if (magicCookie !== 0x63825363) return null;

    // Extract client MAC address (offset 28, 6 bytes)
    const macAddress = this.formatMAC(buffer.slice(28, 34));

    // Parse DHCP options to find PXE request
    let isPXERequest = false;
    let bootFilename = '';

    // DHCP options start at offset 240
    let offset = 240;
    while (offset < buffer.length) {
      const option = buffer[offset];
      if (option === 255) break; // End of options
      if (option === 0) {
        offset++;
        continue;
      }

      const length = buffer[offset + 1];
      const value = buffer.slice(offset + 2, offset + 2 + length);

      // Check for PXE-specific options
      if (option === 93 || option === 60) {
        // Client System Architecture or Vendor Class Identifier
        const str = value.toString('utf-8', 0, Math.min(20, length));
        if (
          str.includes('PXE') ||
          str.includes('Etherboot') ||
          str.includes('pxelinux') ||
          str.includes('ipxe')
        ) {
          isPXERequest = true;
        }
      }

      // Option 67: Bootfile name
      if (option === 67) {
        bootFilename = value.toString('utf-8', 0, length);
        if (bootFilename.includes('pxe') || bootFilename.includes('ipxe')) {
          isPXERequest = true;
        }
      }

      offset += 2 + length;
    }

    if (isPXERequest) {
      return {
        macAddress,
        ipAddress: rinfo.address,
        detectedAt: new Date(),
        bootType: 'DHCP',
        lastSeen: new Date(),
      };
    }

    return null;
  }

  private parseTFTPPacket(buffer: Buffer, rinfo: dgram.RemoteInfo): PXEDevice | null {
    // TFTP packet structure
    // Opcodes: 1=RRQ (read request), 2=WRQ (write request)
    if (buffer.length < 4) return null;

    const opcode = buffer.readUInt16BE(0);

    // Read Request (opcode 1) - typical for PXE boot
    if (opcode === 1 || opcode === 2) {
      const filename = buffer.toString('utf-8', 2, Math.min(100, buffer.length)).split('\0')[0];

      // Check if filename looks like a PXE bootfile
      if (
        filename.includes('pxe') ||
        filename.includes('bootx64') ||
        filename.includes('bootia32') ||
        filename.includes('bootaa64') ||
        filename.includes('pxelinux') ||
        filename.includes('ipxe')
      ) {
        // We don't have MAC from TFTP, but we can identify PXE activity
        return {
          macAddress: 'unknown', // Will be updated when device is seen via DHCP
          ipAddress: rinfo.address,
          detectedAt: new Date(),
          bootType: 'TFTP',
          lastSeen: new Date(),
        };
      }
    }

    return null;
  }

  private formatMAC(buffer: Buffer): string {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }

  private recordPXEDevice(device: PXEDevice): void {
    const key = device.macAddress;

    if (this.pxeDevices.has(key)) {
      const existing = this.pxeDevices.get(key)!;
      existing.lastSeen = new Date();
      if (device.ipAddress) {
        existing.ipAddress = device.ipAddress;
      }
      if (device.hostname) {
        existing.hostname = device.hostname;
      }
    } else {
      this.pxeDevices.set(key, device);
    }

    console.log(
      `[PXETrafficSniffer] PXE device detected: ${device.macAddress} (${device.bootType}) from ${device.ipAddress}`
    );
  }

  getPXEDevices(): PXEDevice[] {
    // Filter out devices not seen in last 5 minutes
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const devices = Array.from(this.pxeDevices.values()).filter((d) => d.lastSeen > cutoff);
    return devices;
  }

  getPXEDevice(macAddress: string): PXEDevice | undefined {
    return this.pxeDevices.get(macAddress.toUpperCase());
  }

  clearPXEDevice(macAddress: string): void {
    this.pxeDevices.delete(macAddress.toUpperCase());
  }

  clearExpiredPXEDevices(): void {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    const expired = Array.from(this.pxeDevices.keys()).filter(
      (key) => this.pxeDevices.get(key)!.lastSeen < cutoff
    );

    for (const key of expired) {
      this.pxeDevices.delete(key);
    }

    if (expired.length > 0) {
      console.log(`[PXETrafficSniffer] Cleaned up ${expired.length} expired PXE device records`);
    }
  }
}

// Global instance
export const pxeTrafficSniffer = new PXETrafficSniffer();
