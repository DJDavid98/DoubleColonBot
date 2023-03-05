import express, { Express } from 'express';
import http from 'node:http';

export interface WebServer {
  publicHost: string;
  app: Express;
}

interface WebServerFactoryParams {
  host: string;
  port: number;
  publicDomain: string;
  botUsername: string;
}

export const webServerFactory = (
  deps: WebServerFactoryParams,
): WebServer => {
  const app = express();

  app.get('/', (req, res) => {
    res.redirect(`https://twitch.tv/${deps.botUsername}`);
  });

  const server = http.createServer(app);
  server.listen(deps.port, deps.host);

  console.info(`[Express] Server listening on ${deps.host}:${deps.port}`);

  return { publicHost: `https://${deps.publicDomain}`, app };
};
