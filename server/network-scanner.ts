import { execSync, spawn } from 'child_process';
import os from 'os';
import { promises as dns } from 'dns';

export interface DiscoveredDevice {
  macAddress: string;
  ipAddress: string;
  hostname?: string;
  manufacturer?: string;
}

export class NetworkScanner {
  private getLocalNetworkInfo(): { ip: string; subnet: string; cidr: number } | null {
    const interfaces = os.networkInterfaces();
    
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      
      const ipv4 = addrs.find(addr => addr.family === 'IPv4' && !addr.internal);
      if (ipv4) {
        const ip = ipv4.address;
        const netmask = ipv4.netmask;
        
        // Calculate CIDR from netmask
        const cidr = this.netmaskToCIDR(netmask);
        const subnet = this.getSubnet(ip, netmask);
        
        return { ip, subnet, cidr };
      }
    }
    
    return null;
  }

  private netmaskToCIDR(netmask: string): number {
    const parts = netmask.split('.').map(Number);
    let cidr = 0;
    
    for (let i = 0; i < 4; i++) {
      const octet = parts[i];
      for (let j = 7; j >= 0; j--) {
        if ((octet & (1 << j)) !== 0) {
          cidr++;
        } else {
          return cidr;
        }
      }
    }
    
    return cidr;
  }

  private getSubnet(ip: string, netmask: string): string {
    const ipParts = ip.split('.').map(Number);
    const maskParts = netmask.split('.').map(Number);
    const subnet = ipParts.map((part, i) => part & maskParts[i]).join('.');
    return subnet;
  }

  private generateIPRange(subnet: string, cidr: number): string[] {
    const ips: string[] = [];
    const parts = subnet.split('.').map(Number);
    const hostBits = 32 - cidr;
    const hostCount = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
    
    // For /24 network (255.255.255.0), scan 1-254
    if (cidr === 24) {
      for (let i = 1; i < 255; i++) {
        ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`);
      }
    } else if (cidr === 25) {
      // /25 = 128 hosts per subnet
      const start = Math.floor(parts[3] / 128) * 128;
      for (let i = start + 1; i < start + 127; i++) {
        ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`);
      }
    } else {
      // Default to class C range
      for (let i = 1; i < 255; i++) {
        ips.push(`${parts[0]}.${parts[1]}.${parts[2]}.${i}`);
      }
    }
    
    return ips;
  }

  async scanNetwork(): Promise<DiscoveredDevice[]> {
    const networkInfo = this.getLocalNetworkInfo();
    if (!networkInfo) {
      console.log('No local network interface found');
      return [];
    }

    const { ip, subnet, cidr } = networkInfo;
    console.log(`[NetworkScanner] Scanning network: ${subnet}/${cidr} from ${ip}`);

    const discoveredDevices: DiscoveredDevice[] = [];

    try {
      // Try ARP scan first (most reliable for local network)
      const arpDevices = await this.arpScan(subnet, cidr);
      discoveredDevices.push(...arpDevices);
      console.log(`[NetworkScanner] ARP scan found ${arpDevices.length} devices`);
    } catch (error) {
      console.log(`[NetworkScanner] ARP scan failed, trying ping sweep...`);
      
      try {
        // Fallback to ping sweep
        const pingDevices = await this.pingSweep(subnet, cidr);
        discoveredDevices.push(...pingDevices);
        console.log(`[NetworkScanner] Ping sweep found ${pingDevices.length} devices`);
      } catch (error) {
        console.error('[NetworkScanner] Ping sweep also failed:', error);
      }
    }

    return discoveredDevices;
  }

  private async arpScan(subnet: string, cidr: number): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];

    try {
      // Try arp-scan command (Linux/Mac)
      const output = execSync(`arp-scan -l 2>/dev/null || arp-scan -I eth0 ${subnet}/${cidr} 2>/dev/null || true`).toString();
      
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F:]{17})\s+(.*)/);
        if (match) {
          devices.push({
            ipAddress: match[1],
            macAddress: match[2].toUpperCase(),
            manufacturer: match[3]?.trim(),
          });
        }
      }
    } catch (error) {
      // Fallback to ARP table parsing
      try {
        const arpOutput = execSync('arp -a').toString();
        const lines = arpOutput.split('\n');
        
        for (const line of lines) {
          // Parse: hostname (ip) at mac [ether] ...
          const match = line.match(/\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-fA-F:]{17})/);
          if (match) {
            devices.push({
              ipAddress: match[1],
              macAddress: match[2].toUpperCase(),
            });
          }
        }
      } catch (innerError) {
        throw new Error('ARP scan failed');
      }
    }

    return devices;
  }

  private async pingSweep(subnet: string, cidr: number): Promise<DiscoveredDevice[]> {
    const devices: DiscoveredDevice[] = [];
    const ips = this.generateIPRange(subnet, cidr);
    
    // Limit concurrent pings to avoid overwhelming network
    const batchSize = 20;
    
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const promises = batch.map(ip => this.pingHost(ip));
      
      const results = await Promise.allSettled(promises);
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          devices.push(result.value);
        }
      }
    }

    return devices;
  }

  private async pingHost(ip: string): Promise<DiscoveredDevice | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 1000);
      
      const ping = spawn('ping', ['-c', '1', '-W', '500', ip], {
        stdio: 'ignore'
      });

      ping.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          // Host is reachable
          this.getHostInfo(ip).then(device => resolve(device)).catch(() => resolve(null));
        } else {
          resolve(null);
        }
      });

      ping.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  private async getHostInfo(ip: string): Promise<DiscoveredDevice | null> {
    try {
      // Try to get hostname
      let hostname: string | undefined = undefined;
      try {
        const result = await dns.reverse(ip);
        hostname = result[0];
      } catch {
        // Hostname lookup failed, continue without it
      }

      // Try to get MAC address from ARP table
      let macAddress = this.getMACFromArp(ip) || '00:00:00:00:00:00';

      return {
        ipAddress: ip,
        macAddress,
        hostname,
      };
    } catch (error) {
      return null;
    }
  }

  private getMACFromArp(ip: string): string | null {
    try {
      const arpOutput = execSync('arp -a').toString();
      const lines = arpOutput.split('\n');
      
      for (const line of lines) {
        if (line.includes(ip)) {
          const match = line.match(/([0-9a-fA-F:]{17})/);
          if (match) {
            return match[1].toUpperCase();
          }
        }
      }
    } catch {
      // ARP failed
    }
    
    return null;
  }
}
