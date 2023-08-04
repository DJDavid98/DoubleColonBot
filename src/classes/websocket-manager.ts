import type http from 'node:http';
import { Server, Socket } from 'socket.io';
import { Logger } from '../model/logger';
import { ClientToServerEvents, ServerToClientEvents } from '../model/socket-events';

export class WebsocketManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(server: http.Server, private logger: Logger) {
    this.io = new Server(server, {
      serveClient: false,
      cors: { origin: /^(https?:\/\/)?(localhost(:\d+)?|overlay.djdavid98.art)$/ },
    }); // Create socket.io instance
    this.io.on('connection', this.onConnection.bind(this));
  }

  private onConnection(socket: Socket) {
    socket.on('joinRoom', this.joinRoom.bind(this, socket));
  }

  private joinRoom(socket: Socket, roomName: string) {
    socket.join(roomName);
    this.logger.debug(`Socket ${socket.id} joined room ${roomName}`);
  }

  public sendToRoom<EventType extends keyof ServerToClientEvents>(roomName: string, type: EventType, ...message: Parameters<ServerToClientEvents[EventType]>) {
    this.io.to(roomName).emit(type, ...message);
    this.logger.debug(`Message ${type} sent to room ${roomName}: ${JSON.stringify(message)}`);
  }
}
