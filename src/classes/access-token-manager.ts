import { Client } from 'pg';
import { usersTable } from '../database/users-table';
import dayjs from 'dayjs';
import { Logger } from '../model/logger';

/**
 * Stores secure state values for OAuth authentication in the database
 */
export class AccessTokenManager {
  constructor(private db: Client) {}

  // TODO Cache mechanism?
  async getToken(logger: Logger, username: string): Promise<string> {
    logger.debug(`[AccessTokenManager] Getting token for ${username}…`);
    const row = await usersTable.selectUser(this.db, username).then(({ rows }) => rows[0]);

    if (!row || !row.access_token) {
      throw new Error(`No access token found for user ${username}`);
    }

    logger.debug(`[AccessTokenManager] Found token for ${username} (expires: ${dayjs(row.expires).fromNow()})`);
    return row.access_token;
  }
}
