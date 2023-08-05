import { Client } from 'pg';
import { usersTable, UserTokenInfo } from '../database/users-table';
import dayjs from 'dayjs';
import { Logger } from '../model/logger';

/**
 * Stores secure state values for OAuth authentication in the database
 */
export class AccessTokenManager {
  constructor(private db: Client) {}

  // TODO Cache mechanism?
  async getToken(logger: Logger, login: string): Promise<UserTokenInfo> {
    logger.debug(`[AccessTokenManager] Getting token for ${login}…`);
    const row = await usersTable.selectUserTokenInfo(this.db, login).then(({ rows }) => rows[0]);

    if (!row || !row.access_token || !row.expires) {
      throw new Error(`No access token found for login ${login}`);
    }

    logger.debug(`[AccessTokenManager] Found token for ${login} (expires: ${dayjs(row.expires).fromNow()})`);
    return {
      id: row.id,
      access_token: row.access_token,
      expires: row.expires,
    };
  }
}
