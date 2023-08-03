import express, { Express } from 'express';
import http from 'node:http';
import { Logger } from '../model/logger';
import { WebsocketManager } from '../classes/websocket-manager';

export interface WebServer {
  publicHost: string;
  app: Express;
  websocketManager: WebsocketManager;
}

interface WebServerFactoryParams {
  host: string;
  port: number;
  publicDomain: string;
  logger: Logger;
}

export const webServerFactory = (
  deps: WebServerFactoryParams,
): WebServer => {
  const app = express();

  const server = http.createServer(app);
  server.listen(deps.port, deps.host);

  deps.logger.info(`[Express] Server listening on ${deps.host}:${deps.port}`);

  return {
    publicHost: `https://${deps.publicDomain}`,
    app,
    websocketManager: new WebsocketManager(server, deps.logger),
  };
};
