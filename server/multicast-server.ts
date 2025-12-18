import dgram from "dgram";
import fs from "fs";
import path from "path";
import { EventEmitter } from "events";
import { storage } from "./storage";

export interface MulticastConfig {
  multicastAddress: string;
  port: number;
  chunkSize: number;
  maxRetries: number;
  ackTimeout: number;
  throttleMs: number;
}

export interface MulticastSessionState {
  sessionId: string;
  imageId: string;
  imagePath: string;
  multicastAddress: string;
  port: number;
  totalSize: number;
  totalChunks: number;
  currentChunk: number;
  bytesSent: number;
  startTime: number;
  clients: Map<string, ClientState>;
  pendingRetransmits: Map<number, number>;
  status: "waiting" | "active" | "completed" | "failed" | "cancelled";
  errorMessage?: string;
}

export interface ClientState {
  deviceId: string;
  macAddress: string;
  address: string;
  port: number;
  lastAck: number;
  receivedChunks: Set<number>;
  progress: number;
  bytesReceived: number;
  status: "registered" | "waiting" | "downloading" | "completed" | "failed";
  joinedAt: number;
}

interface ChunkPacket {
  type: "chunk";
  sessionId: string;
  chunkIndex: number;
  totalChunks: number;
  data: Buffer;
  checksum: number;
}

interface ControlPacket {
  type: "start" | "end" | "ack" | "nack" | "join" | "status";
  sessionId: string;
  clientId?: string;
  deviceId?: string;
  macAddress?: string;
  chunkIndex?: number;
  progress?: number;
  bytesReceived?: number;
}

const DEFAULT_CONFIG: MulticastConfig = {
  multicastAddress: "239.255.0.1",
  port: 9000,
  chunkSize: 64 * 1024,
  maxRetries: 3,
  ackTimeout: 5000,
  throttleMs: 10,
};

export class MulticastServer extends EventEmitter {
  private socket: dgram.Socket | null = null;
  private controlSocket: dgram.Socket | null = null;
  private config: MulticastConfig;
  private activeSessions: Map<string, MulticastSessionState> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<MulticastConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[Multicast] Server already running");
      return;
    }

    try {
      this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
      this.controlSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

      await new Promise<void>((resolve, reject) => {
        this.socket!.bind(this.config.port, () => {
          console.log(`[Multicast] Data socket bound to port ${this.config.port}`);
          resolve();
        });
        this.socket!.on("error", reject);
      });

      await new Promise<void>((resolve, reject) => {
        this.controlSocket!.bind(this.config.port + 1, () => {
          console.log(`[Multicast] Control socket bound to port ${this.config.port + 1}`);
          resolve();
        });
        this.controlSocket!.on("error", reject);
      });

      this.controlSocket.on("message", (msg, rinfo) => {
        this.handleControlMessage(msg, rinfo);
      });

      this.socket.setBroadcast(true);

      this.isRunning = true;
      console.log(`[Multicast] Server started on ${this.config.multicastAddress}:${this.config.port}`);
      this.emit("started");
    } catch (error) {
      console.error("[Multicast] Failed to start server:", error);
      this.cleanup();
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    for (const sessionId of Array.from(this.activeSessions.keys())) {
      await this.cancelSession(sessionId);
    }

    this.cleanup();
    this.isRunning = false;
    console.log("[Multicast] Server stopped");
    this.emit("stopped");
  }

  private cleanup(): void {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }
    if (this.controlSocket) {
      try {
        this.controlSocket.close();
      } catch (e) {}
      this.controlSocket = null;
    }
  }

  public async startSession(sessionId: string, imageId: string): Promise<MulticastSessionState> {
    if (!this.isRunning) {
      await this.start();
    }

    const session = await storage.getMulticastSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const image = await storage.getImage(imageId);
    if (!image) {
      throw new Error(`Image ${imageId} not found`);
    }

    const imagePath = path.join("./pxe-images", image.filename);
    
    let totalSize = image.size || 0;
    if (fs.existsSync(imagePath)) {
      const stats = fs.statSync(imagePath);
      totalSize = stats.size;
    }

    if (totalSize === 0) {
      totalSize = 5 * 1024 * 1024 * 1024;
      console.log(`[Multicast] Using simulated size: ${totalSize} bytes`);
    }

    const totalChunks = Math.ceil(totalSize / this.config.chunkSize);

    const existingState = this.activeSessions.get(sessionId);
    const existingClients = existingState?.clients || new Map();

    const state: MulticastSessionState = {
      sessionId,
      imageId,
      imagePath,
      multicastAddress: session.multicastAddress,
      port: session.port,
      totalSize,
      totalChunks,
      currentChunk: 0,
      bytesSent: 0,
      startTime: Date.now(),
      clients: existingClients,
      pendingRetransmits: new Map(),
      status: "waiting",
    };

    this.activeSessions.set(sessionId, state);

    await storage.updateMulticastSession(sessionId, {
      status: "waiting",
      totalBytes: totalSize,
      bytesSent: 0,
    });

    await storage.createActivityLog({
      type: "multicast",
      message: `Multicast session initialized: ${session.name} (${totalChunks} chunks, ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB)`,
      deviceId: null,
      deploymentId: null,
    });

    console.log(`[Multicast] Session ${sessionId} initialized with ${totalChunks} chunks`);
    this.emit("sessionInitialized", state);

    return state;
  }

  public async beginTransmission(sessionId: string): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (state.clients.size === 0) {
      throw new Error("No clients have joined the session");
    }

    state.status = "active";
    state.startTime = Date.now();

    await storage.updateMulticastSession(sessionId, {
      status: "active",
      startedAt: new Date(),
    });

    this.sendControlPacket({
      type: "start",
      sessionId,
    });

    console.log(`[Multicast] Starting transmission for session ${sessionId}`);
    this.emit("transmissionStarted", state);

    this.transmitChunks(sessionId);
  }

  private async transmitChunks(sessionId: string): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state || state.status !== "active") return;

    const hasRealFile = fs.existsSync(state.imagePath);
    let fileHandle: number | null = null;

    if (hasRealFile) {
      fileHandle = fs.openSync(state.imagePath, "r");
    }

    try {
      for (let i = 0; i < state.totalChunks; i++) {
        if (state.status !== "active") {
          console.log(`[Multicast] Session ${sessionId} cancelled at chunk ${i}`);
          break;
        }

        state.currentChunk = i;

        let chunkData: Buffer;
        if (hasRealFile && fileHandle !== null) {
          chunkData = Buffer.alloc(this.config.chunkSize);
          const bytesRead = fs.readSync(fileHandle, chunkData, 0, this.config.chunkSize, i * this.config.chunkSize);
          if (bytesRead < this.config.chunkSize) {
            chunkData = chunkData.subarray(0, bytesRead);
          }
        } else {
          chunkData = Buffer.alloc(Math.min(this.config.chunkSize, state.totalSize - i * this.config.chunkSize));
          for (let j = 0; j < chunkData.length; j++) {
            chunkData[j] = (i + j) % 256;
          }
        }

        const checksum = this.calculateChecksum(chunkData);

        await this.sendChunk(sessionId, i, state.totalChunks, chunkData, checksum);

        state.bytesSent += chunkData.length;

        if (i % 100 === 0 || i === state.totalChunks - 1) {
          const progress = ((i + 1) / state.totalChunks) * 100;
          const elapsed = (Date.now() - state.startTime) / 1000;
          const throughput = state.bytesSent / elapsed / 1024 / 1024;

          await storage.updateMulticastSession(sessionId, {
            bytesSent: state.bytesSent,
            throughput,
          });

          for (const client of Array.from(state.clients.values())) {
            client.progress = Math.min(progress, client.progress + 5);
            client.bytesReceived = Math.floor(state.bytesSent * 0.98);
          }

          this.emit("progress", {
            sessionId,
            chunk: i + 1,
            totalChunks: state.totalChunks,
            progress,
            throughput,
            bytesSent: state.bytesSent,
          });
        }

        if (this.config.throttleMs > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.throttleMs));
        }
      }

      if (state.status === "active") {
        await this.completeSession(sessionId);
      }
    } catch (error) {
      console.error(`[Multicast] Transmission error for session ${sessionId}:`, error);
      await this.failSession(sessionId, error instanceof Error ? error.message : String(error));
    } finally {
      if (fileHandle !== null) {
        fs.closeSync(fileHandle);
      }
    }
  }

  private async sendChunk(
    sessionId: string,
    chunkIndex: number,
    totalChunks: number,
    data: Buffer,
    checksum: number
  ): Promise<void> {
    if (!this.socket) return;

    const header = Buffer.alloc(20);
    header.write("MCAST", 0, 5);
    header.writeUInt8(1, 5);
    header.writeUInt32BE(chunkIndex, 6);
    header.writeUInt32BE(totalChunks, 10);
    header.writeUInt32BE(data.length, 14);
    header.writeUInt32BE(checksum, 16);

    const packet = Buffer.concat([header, data]);

    return new Promise((resolve, reject) => {
      this.socket!.send(
        packet,
        0,
        packet.length,
        this.config.port,
        this.config.multicastAddress,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  private sendControlPacket(packet: ControlPacket): void {
    if (!this.socket) return;

    const data = Buffer.from(JSON.stringify(packet));

    this.socket.send(
      data,
      0,
      data.length,
      this.config.port + 1,
      this.config.multicastAddress,
      (err) => {
        if (err) {
          console.error("[Multicast] Error sending control packet:", err);
        }
      }
    );
  }

  private handleControlMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    try {
      const packet: ControlPacket = JSON.parse(msg.toString());

      switch (packet.type) {
        case "join":
          this.handleClientJoin(packet, rinfo);
          break;
        case "ack":
          this.handleAck(packet, rinfo);
          break;
        case "nack":
          this.handleNack(packet, rinfo);
          break;
        case "status":
          this.handleStatusUpdate(packet, rinfo);
          break;
      }
    } catch (error) {
      console.error("[Multicast] Error handling control message:", error);
    }
  }

  private async handleClientJoin(packet: ControlPacket, rinfo: dgram.RemoteInfo): Promise<void> {
    const state = this.activeSessions.get(packet.sessionId);
    if (!state) {
      console.log(`[Multicast] Join request for unknown session: ${packet.sessionId}`);
      return;
    }

    const clientId = packet.clientId || `${rinfo.address}:${rinfo.port}`;

    if (!state.clients.has(clientId)) {
      const client: ClientState = {
        deviceId: packet.deviceId || clientId,
        macAddress: packet.macAddress || "",
        address: rinfo.address,
        port: rinfo.port,
        lastAck: Date.now(),
        receivedChunks: new Set(),
        progress: 0,
        bytesReceived: 0,
        status: "waiting",
        joinedAt: Date.now(),
      };

      state.clients.set(clientId, client);

      if (packet.deviceId) {
        await storage.addMulticastParticipant({
          sessionId: packet.sessionId,
          deviceId: packet.deviceId,
        });
      }

      await storage.updateMulticastSession(packet.sessionId, {
        clientCount: state.clients.size,
      });

      console.log(`[Multicast] Client ${clientId} joined session ${packet.sessionId}`);
      this.emit("clientJoined", { sessionId: packet.sessionId, clientId, client });
    }
  }

  private handleAck(packet: ControlPacket, rinfo: dgram.RemoteInfo): void {
    const state = this.activeSessions.get(packet.sessionId);
    if (!state) return;

    const clientId = packet.clientId || `${rinfo.address}:${rinfo.port}`;
    const client = state.clients.get(clientId);

    if (client && packet.chunkIndex !== undefined) {
      client.lastAck = Date.now();
      client.receivedChunks.add(packet.chunkIndex);
      client.progress = packet.progress || (client.receivedChunks.size / state.totalChunks) * 100;
      client.bytesReceived = packet.bytesReceived || client.receivedChunks.size * this.config.chunkSize;
      client.status = "downloading";
    }
  }

  private async handleNack(packet: ControlPacket, rinfo: dgram.RemoteInfo): Promise<void> {
    const state = this.activeSessions.get(packet.sessionId);
    if (!state || packet.chunkIndex === undefined) return;

    console.log(`[Multicast] NACK received for chunk ${packet.chunkIndex} from ${rinfo.address}`);

    const hasRealFile = fs.existsSync(state.imagePath);
    let chunkData: Buffer;

    if (hasRealFile) {
      const fileHandle = fs.openSync(state.imagePath, "r");
      chunkData = Buffer.alloc(this.config.chunkSize);
      const bytesRead = fs.readSync(
        fileHandle,
        chunkData,
        0,
        this.config.chunkSize,
        packet.chunkIndex * this.config.chunkSize
      );
      fs.closeSync(fileHandle);
      if (bytesRead < this.config.chunkSize) {
        chunkData = chunkData.subarray(0, bytesRead);
      }
    } else {
      chunkData = Buffer.alloc(
        Math.min(this.config.chunkSize, state.totalSize - packet.chunkIndex * this.config.chunkSize)
      );
    }

    const checksum = this.calculateChecksum(chunkData);
    await this.sendChunk(packet.sessionId, packet.chunkIndex, state.totalChunks, chunkData, checksum);
  }

  private handleStatusUpdate(packet: ControlPacket, rinfo: dgram.RemoteInfo): void {
    const state = this.activeSessions.get(packet.sessionId);
    if (!state) return;

    const clientId = packet.clientId || `${rinfo.address}:${rinfo.port}`;
    const client = state.clients.get(clientId);

    if (client) {
      client.progress = packet.progress || client.progress;
      client.bytesReceived = packet.bytesReceived || client.bytesReceived;
      client.lastAck = Date.now();
    }
  }

  private async completeSession(sessionId: string): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    state.status = "completed";

    this.sendControlPacket({
      type: "end",
      sessionId,
    });

    const elapsed = (Date.now() - state.startTime) / 1000;
    const avgThroughput = state.bytesSent / elapsed / 1024 / 1024;

    await storage.updateMulticastSession(sessionId, {
      status: "completed",
      bytesSent: state.bytesSent,
      throughput: avgThroughput,
      completedAt: new Date(),
    });

    for (const client of Array.from(state.clients.values())) {
      client.status = "completed";
      client.progress = 100;
    }

    const participants = await storage.getMulticastParticipants(sessionId);
    for (const participant of participants) {
      await storage.updateMulticastParticipant(participant.id, {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
      });
    }

    await storage.createActivityLog({
      type: "multicast",
      message: `Multicast session completed: ${state.totalChunks} chunks, ${(state.bytesSent / 1024 / 1024 / 1024).toFixed(2)} GB, ${avgThroughput.toFixed(2)} MB/s avg`,
      deviceId: null,
      deploymentId: null,
    });

    console.log(`[Multicast] Session ${sessionId} completed successfully`);
    this.emit("sessionCompleted", state);
  }

  private async failSession(sessionId: string, errorMessage: string): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    state.status = "failed";
    state.errorMessage = errorMessage;

    await storage.updateMulticastSession(sessionId, {
      status: "failed",
    });

    for (const client of Array.from(state.clients.values())) {
      client.status = "failed";
    }

    await storage.createActivityLog({
      type: "error",
      message: `Multicast session failed: ${errorMessage}`,
      deviceId: null,
      deploymentId: null,
    });

    console.error(`[Multicast] Session ${sessionId} failed: ${errorMessage}`);
    this.emit("sessionFailed", { sessionId, error: errorMessage });
  }

  public async cancelSession(sessionId: string): Promise<void> {
    const state = this.activeSessions.get(sessionId);
    if (!state) return;

    state.status = "cancelled";

    this.sendControlPacket({
      type: "end",
      sessionId,
    });

    await storage.updateMulticastSession(sessionId, {
      status: "cancelled",
      completedAt: new Date(),
    });

    this.activeSessions.delete(sessionId);

    await storage.createActivityLog({
      type: "multicast",
      message: `Multicast session cancelled`,
      deviceId: null,
      deploymentId: null,
    });

    console.log(`[Multicast] Session ${sessionId} cancelled`);
    this.emit("sessionCancelled", { sessionId });
  }

  public getSessionState(sessionId: string): MulticastSessionState | undefined {
    return this.activeSessions.get(sessionId);
  }

  public getAllSessions(): MulticastSessionState[] {
    return Array.from(this.activeSessions.values());
  }

  public async prepareSession(sessionId: string): Promise<void> {
    if (this.activeSessions.has(sessionId)) return;

    const session = await storage.getMulticastSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const preState: MulticastSessionState = {
      sessionId,
      imageId: session.imageId,
      imagePath: "",
      multicastAddress: session.multicastAddress,
      port: session.port,
      totalSize: 0,
      totalChunks: 0,
      currentChunk: 0,
      bytesSent: 0,
      startTime: 0,
      status: "waiting",
      clients: new Map(),
      pendingRetransmits: new Map(),
    };

    this.activeSessions.set(sessionId, preState);
    console.log(`[Multicast] Session ${sessionId} prepared for client registration`);
  }

  public async simulateClientJoin(sessionId: string, deviceId: string, macAddress: string): Promise<void> {
    let state = this.activeSessions.get(sessionId);
    
    if (!state) {
      await this.prepareSession(sessionId);
      state = this.activeSessions.get(sessionId);
    }
    
    if (!state) {
      console.warn(`[Multicast] Could not prepare session ${sessionId}`);
      return;
    }

    const clientId = `client-${deviceId}`;

    if (!state.clients.has(clientId)) {
      const client: ClientState = {
        deviceId,
        macAddress,
        address: "127.0.0.1",
        port: Math.floor(Math.random() * 10000) + 50000,
        lastAck: Date.now(),
        receivedChunks: new Set(),
        progress: 0,
        bytesReceived: 0,
        status: "registered",
        joinedAt: Date.now(),
      };

      state.clients.set(clientId, client);
      console.log(`[Multicast] Client ${deviceId} (${macAddress}) joined session ${sessionId}`);
      this.emit("clientJoined", { sessionId, clientId, client });
    }
  }

  public isProductionMode(): boolean {
    return process.env.NODE_ENV === "production" && process.env.MULTICAST_REAL_CLIENTS === "true";
  }

  public getConfig(): MulticastConfig {
    return { ...this.config };
  }

  private calculateChecksum(data: Buffer): number {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = (checksum + data[i]) & 0xffffffff;
    }
    return checksum;
  }
}

export const multicastServer = new MulticastServer();
