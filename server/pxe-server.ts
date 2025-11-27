import dgram from "dgram";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";

// TFTP opcodes
const TFTP_OPCODES = {
  RRQ: 1,   // Read request
  WRQ: 2,   // Write request  
  DATA: 3,  // Data packet
  ACK: 4,   // Acknowledgment
  ERROR: 5  // Error packet
};

// TFTP error codes
const TFTP_ERRORS = {
  FILE_NOT_FOUND: 1,
  ACCESS_VIOLATION: 2,
  DISK_FULL: 3,
  ILLEGAL_OPERATION: 4,
  UNKNOWN_TID: 5,
  FILE_EXISTS: 6,
  NO_SUCH_USER: 7
};

export class TFTPServer {
  private server: dgram.Socket;
  private port: number;
  private rootPath: string;
  private activeTransfers: Map<string, any> = new Map();

  constructor(port: number = 6969, rootPath: string = "./pxe-files") {
    this.port = port;
    this.rootPath = rootPath;
    this.server = dgram.createSocket("udp4");
    
    // Ensure root directory exists
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath, { recursive: true });
    }
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on("message", this.handleMessage.bind(this));
      
      this.server.on("error", (err) => {
        console.error("TFTP Server error:", err);
        reject(err);
      });

      this.server.bind(this.port, "0.0.0.0", () => {
        console.log(`TFTP Server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.server.close();
    this.activeTransfers.clear();
  }

  private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const opcode = msg.readUInt16BE(0);
      
      switch (opcode) {
        case TFTP_OPCODES.RRQ:
          this.handleReadRequest(msg, rinfo);
          break;
        case TFTP_OPCODES.ACK:
          this.handleAck(msg, rinfo);
          break;
        default:
          this.sendError(rinfo, TFTP_ERRORS.ILLEGAL_OPERATION, "Unsupported operation");
      }
    } catch (error) {
      console.error("Error handling TFTP message:", error);
      this.sendError(rinfo, TFTP_ERRORS.ILLEGAL_OPERATION, "Invalid packet");
    }
  }

  private handleReadRequest(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    let offset = 2; // Skip opcode
    
    // Extract filename
    const filenameEnd = msg.indexOf(0, offset);
    const filename = msg.toString("ascii", offset, filenameEnd);
    offset = filenameEnd + 1;
    
    // Extract mode
    const modeEnd = msg.indexOf(0, offset);
    const mode = msg.toString("ascii", offset, modeEnd).toLowerCase();
    
    console.log(`TFTP Read request: ${filename} (mode: ${mode}) from ${rinfo.address}:${rinfo.port}`);
    
    // Validate mode
    if (mode !== "octet" && mode !== "binary") {
      this.sendError(rinfo, TFTP_ERRORS.ILLEGAL_OPERATION, "Unsupported mode");
      return;
    }
    
    // Validate and resolve file path
    const filePath = this.resolveFilePath(filename);
    if (!filePath) {
      this.sendError(rinfo, TFTP_ERRORS.ACCESS_VIOLATION, "Access denied");
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      this.sendError(rinfo, TFTP_ERRORS.FILE_NOT_FOUND, "File not found");
      return;
    }
    
    // Start file transfer
    this.startFileTransfer(filePath, rinfo);
  }

  private resolveFilePath(filename: string): string | null {
    // Remove leading slash and normalize path
    const normalizedName = filename.replace(/^\/+/, "").replace(/\\/g, "/");
    
    // Prevent directory traversal
    if (normalizedName.includes("..") || normalizedName.includes("~")) {
      return null;
    }
    
    // Resolve full path
    const fullPath = path.resolve(this.rootPath, normalizedName);
    
    // Ensure path is within root directory
    if (!fullPath.startsWith(path.resolve(this.rootPath))) {
      return null;
    }
    
    return fullPath;
  }

  private startFileTransfer(filePath: string, rinfo: dgram.RemoteInfo): void {
    const transferId = `${rinfo.address}:${rinfo.port}`;
    
    try {
      const fileStats = fs.statSync(filePath);
      const fileStream = createReadStream(filePath);
      
      const transfer = {
        stream: fileStream,
        blockNumber: 1,
        address: rinfo.address,
        port: rinfo.port,
        totalSize: fileStats.size,
        sentBytes: 0
      };
      
      this.activeTransfers.set(transferId, transfer);
      this.sendNextBlock(transferId);
      
    } catch (error) {
      console.error("Error starting file transfer:", error);
      this.sendError(rinfo, TFTP_ERRORS.ACCESS_VIOLATION, "Cannot read file");
    }
  }

  private sendNextBlock(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (!transfer) return;
    
    const blockData = Buffer.alloc(512);
    const bytesRead = fs.readSync(transfer.stream.fd, blockData, 0, 512, transfer.sentBytes);
    
    // Create DATA packet
    const packet = Buffer.alloc(4 + bytesRead);
    packet.writeUInt16BE(TFTP_OPCODES.DATA, 0);
    packet.writeUInt16BE(transfer.blockNumber, 2);
    blockData.copy(packet, 4, 0, bytesRead);
    
    // Send packet
    this.server.send(packet, transfer.port, transfer.address, (err) => {
      if (err) {
        console.error("Error sending TFTP data:", err);
        this.activeTransfers.delete(transferId);
      }
    });
    
    transfer.sentBytes += bytesRead;
    
    // If this is the last block (less than 512 bytes), end transfer
    if (bytesRead < 512) {
      transfer.stream.close();
      // Keep transfer active until final ACK
    }
  }

  private handleAck(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    const blockNumber = msg.readUInt16BE(2);
    const transferId = `${rinfo.address}:${rinfo.port}`;
    const transfer = this.activeTransfers.get(transferId);
    
    if (!transfer) {
      this.sendError(rinfo, TFTP_ERRORS.UNKNOWN_TID, "Unknown transfer");
      return;
    }
    
    if (blockNumber === transfer.blockNumber) {
      // Check if transfer is complete
      if (transfer.sentBytes >= transfer.totalSize) {
        console.log(`TFTP Transfer complete: ${transferId}`);
        this.activeTransfers.delete(transferId);
        return;
      }
      
      // Send next block
      transfer.blockNumber++;
      this.sendNextBlock(transferId);
    }
  }

  private sendError(rinfo: dgram.RemoteInfo, errorCode: number, message: string): void {
    const msgBuffer = Buffer.from(message, "ascii");
    const packet = Buffer.alloc(4 + msgBuffer.length + 1);
    
    packet.writeUInt16BE(TFTP_OPCODES.ERROR, 0);
    packet.writeUInt16BE(errorCode, 2);
    msgBuffer.copy(packet, 4);
    packet[4 + msgBuffer.length] = 0; // Null terminator
    
    this.server.send(packet, rinfo.port, rinfo.address);
  }

  // Utility method to add boot files
  public addBootFile(filename: string, content: Buffer | string): void {
    const filePath = path.join(this.rootPath, filename);
    fs.writeFileSync(filePath, content);
    console.log(`Added boot file: ${filename}`);
  }
}

// PXE HTTP Server for serving larger files and images
export class PXEHTTPServer {
  private httpPort: number;
  private imagesPath: string;

  constructor(httpPort: number = 8080, imagesPath: string = "./pxe-images") {
    this.httpPort = httpPort;
    this.imagesPath = imagesPath;
    
    // Ensure images directory exists
    if (!fs.existsSync(imagesPath)) {
      fs.mkdirSync(imagesPath, { recursive: true });
    }
  }

  // This integrates with the existing Express server
  public setupRoutes(app: any): void {
    // Serve PXE boot files with proper MIME types
    app.get("/pxe-files/:filename(*)", (req: any, res: any) => {
      const filename = req.params.filename;
      const filePath = path.join("./pxe-files", filename);
      
      if (!fs.existsSync(filePath) || !filePath.startsWith(path.resolve("./pxe-files"))) {
        return res.status(404).send("File not found");
      }
      
      // Determine MIME type based on file extension
      const mimeTypes: { [key: string]: string } = {
        '.efi': 'application/x-efi',
        '.0': 'application/octet-stream',
        '.bin': 'application/octet-stream',
        '.rom': 'application/octet-stream',
        '.cfg': 'text/plain',
        '.txt': 'text/plain',
      };
      
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.sendFile(path.resolve(filePath));
    });

    // Serve OS images for deployment
    app.get("/pxe-images/:filename(*)", (req: any, res: any) => {
      const filename = req.params.filename;
      const filePath = path.join(this.imagesPath, filename);
      
      if (!fs.existsSync(filePath) || !filePath.startsWith(path.resolve(this.imagesPath))) {
        return res.status(404).send("Image not found");
      }
      
      // Set appropriate headers for large file downloads
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(filePath)}"`,
        'Cache-Control': 'no-cache'
      });
      
      res.sendFile(path.resolve(filePath));
    });
  }

  // Add Secure Boot bootloader files
  public addSecureBootFiles(): void {
    // Create directory for Secure Boot files if it doesn't exist
    const secureBootDir = path.join("./pxe-files", "efi");
    if (!fs.existsSync(secureBootDir)) {
      fs.mkdirSync(secureBootDir, { recursive: true });
    }

    // Note: These are placeholder stubs. In production, you would:
    // 1. Download signed shim.efi from your certificate authority
    // 2. Download grubx64.efi (signed for your environment)
    // 3. Configure GRUB with your boot parameters
    
    console.log("[PXEHTTPServer] Secure Boot file directory initialized at:", secureBootDir);
  }
}

// DHCP Proxy for PXE boot discovery
export class DHCPProxy {
  private server: dgram.Socket;
  private port: number;
  private serverIP: string;
  private bootFilename: string;

  constructor(port: number = 4067, serverIP: string = "0.0.0.0", bootFilename: string = "pxelinux.0") {
    this.port = port;
    this.serverIP = serverIP;
    this.bootFilename = bootFilename;
    this.server = dgram.createSocket("udp4");
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.on("message", this.handleDHCPMessage.bind(this));
      
      this.server.on("error", (err) => {
        console.error("DHCP Proxy error:", err);
        reject(err);
      });

      this.server.bind(this.port, "0.0.0.0", () => {
        console.log(`DHCP Proxy listening on port ${this.port}`);
        resolve();
      });
    });
  }

  stop(): void {
    this.server.close();
  }

  private handleDHCPMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    // Parse DHCP message
    if (msg.length < 240) return; // Minimum DHCP packet size
    
    const op = msg[0];
    const htype = msg[1];
    const hlen = msg[2];
    const xid = msg.readUInt32BE(4);
    
    // Only respond to DHCP DISCOVER/REQUEST for PXE clients
    if (op === 1) { // BOOTREQUEST
      // Check for PXE vendor class identifier
      const vendorClassPos = this.findDHCPOption(msg, 60);
      if (vendorClassPos !== -1) {
        const vendorClass = msg.toString('ascii', vendorClassPos + 2, vendorClassPos + 2 + msg[vendorClassPos + 1]);
        
        if (vendorClass.startsWith('PXEClient')) {
          console.log(`PXE client detected: ${rinfo.address}`);
          this.sendPXEResponse(msg, rinfo, xid);
        }
      }
    }
  }

  private findDHCPOption(msg: Buffer, optionCode: number): number {
    let pos = 240; // Start of options (after fixed header)
    
    while (pos < msg.length && msg[pos] !== 255) { // 255 = End option
      if (msg[pos] === optionCode) {
        return pos;
      }
      pos += 2 + msg[pos + 1]; // Skip option code, length, and data
    }
    
    return -1;
  }

  private sendPXEResponse(originalMsg: Buffer, rinfo: dgram.RemoteInfo, xid: number): void {
    // Create DHCP OFFER/ACK for PXE
    const response = Buffer.alloc(548); // Standard DHCP packet size
    
    // DHCP Header
    response[0] = 2; // BOOTREPLY
    response[1] = originalMsg[1]; // htype
    response[2] = originalMsg[2]; // hlen
    response[3] = 0; // hops
    response.writeUInt32BE(xid, 4); // xid
    response.writeUInt16BE(0, 8); // secs
    response.writeUInt16BE(0x8000, 10); // flags (broadcast)
    
    // Copy client hardware address
    originalMsg.copy(response, 28, 28, 28 + originalMsg[2]);
    
    // Server name and boot filename
    const serverName = "Bootah64x-PXE";
    Buffer.from(serverName).copy(response, 44, 0, Math.min(serverName.length, 64));
    Buffer.from(this.bootFilename).copy(response, 108, 0, Math.min(this.bootFilename.length, 128));
    
    // DHCP Options
    let optionsPos = 240;
    
    // Magic cookie
    response.writeUInt32BE(0x63825363, optionsPos);
    optionsPos += 4;
    
    // DHCP Message Type (OFFER)
    response[optionsPos++] = 53; // Option code
    response[optionsPos++] = 1;  // Length
    response[optionsPos++] = 2;  // DHCPOFFER
    
    // Server Identifier
    const serverIPParts = this.serverIP.split('.').map(Number);
    response[optionsPos++] = 54; // Option code
    response[optionsPos++] = 4;  // Length
    serverIPParts.forEach(part => response[optionsPos++] = part);
    
    // TFTP Server Name
    response[optionsPos++] = 66; // Option code
    response[optionsPos++] = serverName.length;
    Buffer.from(serverName).copy(response, optionsPos);
    optionsPos += serverName.length;
    
    // Bootfile Name
    response[optionsPos++] = 67; // Option code
    response[optionsPos++] = this.bootFilename.length;
    Buffer.from(this.bootFilename).copy(response, optionsPos);
    optionsPos += this.bootFilename.length;
    
    // End option
    response[optionsPos++] = 255;
    
    // Send response
    this.server.send(response.slice(0, optionsPos), 68, rinfo.address);
    console.log(`Sent PXE response to ${rinfo.address}`);
  }
}