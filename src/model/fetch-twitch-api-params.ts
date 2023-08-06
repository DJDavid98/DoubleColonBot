import { Logger } from './logger';
import { AccessTokenManager } from '../classes/access-token-manager';

export interface FetchTwitchApiParams {
  token: string;
  clientId: string;
  logger: Logger;
  accessTokenManager: AccessTokenManager | null;
}
