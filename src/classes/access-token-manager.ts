import { Client } from 'pg';
import { usersTable, UserTokenInfo } from '../database/users-table';
import dayjs from 'dayjs';
import { Logger } from '../model/logger';
import { Users } from '../database/database-schema';
import { ChannelManager } from './channel-manager';
import { TwitchEventSubManager } from './twitch-event-sub-manager';
import { fetchAccessToken } from '../utils/fetch-access-token';
import { handleAccessTokenUpdate } from '../utils/handle-access-token-update';
import { env } from '../constants/env';

export interface AccessTokenManagerDeps {
  db: Client;
  channelManager: ChannelManager;
  twitchEventSubManager: TwitchEventSubManager;
  publicHost: string;
  botUsername: string;
  logger: Logger;
}

/**
 * Stores secure state values for OAuth authentication in the database
 */
export class AccessTokenManager {
  private botInfo: UserTokenInfo | undefined;

  constructor(private deps: AccessTokenManagerDeps) {}

  async getBotInfo() {
    if (!this.botInfo) {
      this.botInfo = await this.getToken(this.deps.logger, this.deps.botUsername);
    }
    return this.botInfo;
  }

  // TODO Cache mechanism?
  async getToken(logger: Logger, login: string): Promise<UserTokenInfo> {
    logger.debug(`[AccessTokenManager] Getting token for ${login}…`);
    const row = await usersTable.selectUserTokenInfo(this.deps.db, 'login', login).then(({ rows }) => rows[0]);

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

  async getChannelToken<Column extends keyof Users>(log: Logger, column: Column, value: Users[Column]): Promise<UserTokenInfo | undefined> {
    log.debug(`Retrieving access token for ${column} ${value}`);
    const userTokenRows = await usersTable.selectUserTokenInfo(this.deps.db, column, value);
    if (userTokenRows.rowCount === 1) {
      const [row] = userTokenRows.rows;
      if (row.access_token && row.expires) {
        log.debug(`Found access token, broadcaster #${row.id}`);
        return {
          id: row.id,
          access_token: row.access_token,
          expires: row.expires,
        };
      } else {
        log.debug(`No access token found for broadcaster #${row.id}`);
      }
    } else {
      log.debug('No users found in database');
    }

    return undefined;
  }

  async getFreshAccessToken(logger: Logger, token: string) {
    const botInfo = await this.getBotInfo();
    const updatingBotToken = token === botInfo.access_token;
    await this.refreshToken(logger, token);
    if (updatingBotToken) {
      this.botInfo = await this.getToken(logger, this.deps.botUsername);
    }
  }

  private async refreshToken(logger: Logger, access_token: string): Promise<void> {
    const user = await usersTable.selectRefreshToken(this.deps.db, access_token).then(({ rows }) => rows[0]);
    if (!user || !user.refresh_token) {
      throw new Error('Could not find refresh token for provided access token');
    }

    const clientId = env.TWITCH_CLIENT_ID;
    const clientSecret = env.TWITCH_CLIENT_SECRET;
    const { refresh_token } = user;
    // Get a new access token
    const tokenResponse = await fetchAccessToken({
      logger,
      publicHost: this.deps.publicHost,
      input: { refresh_token },
      clientId,
      clientSecret,
    });
    const appResponse = await handleAccessTokenUpdate({
      tokenResponse,
      updateUserDeps: {
        logger,
        clientId,
        db: this.deps.db,
        // We're in the method that's supposed to refresh the token, if this fails all hope is lost
        accessTokenManager: null,
        channelManager: this.deps.channelManager,
        twitchEventSubManager: this.deps.twitchEventSubManager,
      },
    });
    if (appResponse.log) {
      logger(appResponse.log.severity, appResponse.log.message);
    }

    if (appResponse.statusCode !== 200) {
      throw new Error('Failed to refresh access token');
    }
  }
}
