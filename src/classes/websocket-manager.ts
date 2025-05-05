import type http from 'node:http';
import { Server, Socket } from 'socket.io';
import { Logger } from '../model/logger';
import { ClientToServerEvents, ServerToClientEvents } from '../model/socket-events';

export class WebsocketManager {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(server: http.Server, private readonly logger: Logger) {
    this.io = new Server(server, {
      serveClient: false,
      cors: { origin: /^(https?:\/\/)?(localhost(:\d+)?|overlay\.djdavid98\.art|personal-bsdp-overlay-djdavid98(?:-team)?\.vercel\.app|personal-bsdp-overlay-git-([\da-z/-]+)-djdavid98-team\.vercel\.app|overlay\.went\.tf|beat-saber-overlay\.pages\.dev)$/ },
    }); // Create socket.io instance
    this.io.on('connection', this.onConnection.bind(this));

    process.on('exit', () => {
      logger.info('[WebsocketManager] Process exiting, closing connection…');
      this.io.close();
    });
  }

  private onConnection(socket: Socket) {
    socket.on('joinRoom', this.joinRoom.bind(this, socket));
  }

  private joinRoom(socket: Socket, roomName: string) {
    socket.join(roomName);
    this.logger.debug(`Socket ${socket.id} joined room ${roomName}`);
    socket.emit('joinedRoom', roomName);
  }

  public sendToRoom<EventType extends keyof ServerToClientEvents>(roomName: string, type: EventType, ...message: Parameters<ServerToClientEvents[EventType]>) {
    this.io.to(roomName).emit(type, ...message);
    this.logger.debug(`Message ${type} sent to room ${roomName}: ${JSON.stringify(message)}`);
  }
}
