import { Client } from 'pg';
import { usersTable } from '../database/users-table';
import { fetchAccessToken } from './fetch-access-token';
import { handleAccessTokenUpdate } from './handle-access-token-update';
import { Logger } from '../model/logger';

interface RefreshTokenParams {
  db: Client;
  publicHost: string;
  access_token: string;
  clientId: string;
  clientSecret: string;
  logger: Logger;
}

export const refreshToken = async ({
  db,
  publicHost,
  access_token,
  clientId,
  clientSecret,
  logger,
}: RefreshTokenParams): Promise<void> => {
  const user = await usersTable.selectRefreshToken(db, access_token).then(({ rows }) => rows[0]);
  if (!user || !user.refresh_token) {
    throw new Error('Could not find refresh token for provided access token');
  }

  const { refresh_token } = user;
  // Get a new access token
  const tokenResponse = await fetchAccessToken({
    logger,
    publicHost,
    input: { refresh_token },
    clientId,
    clientSecret,
  });
  const appResponse = await handleAccessTokenUpdate({
    logger,
    tokenResponse,
    clientId: clientId,
    db: db,
    // We're in the function that's supposed to refresh the token, if this fails all hope is lost
    getFreshAccessToken: null,
  });
  if (appResponse.log) {
    logger(appResponse.log.severity, appResponse.log.message);
  }

  if (appResponse.statusCode !== 200) {
    throw new Error('Failed to refresh access token');
  }
};
