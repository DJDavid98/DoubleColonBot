import { validateAccessToken } from '../validation/validate-access-token';
import { JsonResponseProps } from '../factories/json-response-factory';
import { Client } from 'pg';
import { Logger } from '../model/logger';
import { updateUser } from './update-user';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';

export interface HandleAccessTokenUpdateDeps {
  tokenResponse: unknown;
  clientId: string;
  db: Client;
  logger: Logger;
  getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
}

export const handleAccessTokenUpdate = async (deps: HandleAccessTokenUpdateDeps): Promise<JsonResponseProps> => {
  const token = validateAccessToken(deps.tokenResponse);
  if (!token.value || token.error) {
    return {
      statusCode: 500,
      log: {
        severity: 'error',
        message: `Failed to validate access token: ${token.error.annotate()}`,
      },
      body: 'Could not get an access token, please try again later.',
    };
  }

  return updateUser({ ...deps, token: token.value });
};
