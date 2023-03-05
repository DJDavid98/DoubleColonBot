import { Logger } from './logger';

export interface FetchTwitchApiParams {
  token: string;
  clientId: string;
  logger: Logger;
  getFreshAccessToken: ((log: Logger, token: string) => Promise<void>) | null;
}
