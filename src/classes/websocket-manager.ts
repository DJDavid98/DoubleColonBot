import type http from 'node:http';
import { Server, Socket } from 'socket.io';
import { Logger } from '../model/logger';
import { WebsocketMessage } from '../model/websocket-message';

export class WebsocketManager {
  private io: Server;

  constructor(server: http.Server, private logger: Logger) {
    this.io = new Server(server); // Create socket.io instance
    this.io.on('connection', this.onConnection.bind(this));
  }

  private onConnection(socket: Socket) {
    // socket.on('message', this.onMessage.bind(this, socket));
    socket.on('joinRoom', this.joinRoom.bind(this, socket));
    // Add any other event listeners or custom logic for new connections here
  }

  private joinRoom(socket: Socket, roomName: string) {
    socket.join(roomName);
    this.logger.debug(`Socket ${socket.id} joined room ${roomName}`);
  }

  public sendToRoom(roomName: string, message: WebsocketMessage) {
    this.io.to(roomName).emit('message', message);
    this.logger.debug(`Message sent to room ${roomName}: ${JSON.stringify(message)}`);
  }
}
