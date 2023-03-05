import { databaseClientFactory } from './factories/database-client-factory';
import { webServerFactory } from './factories/web-server-factory';
import { env } from './constants/env';
import { Client as DbClient } from 'pg';
import { verifyBotAccessToken } from './utils/verify-bot-access-token';
import { StateManager } from './classes/state-manager';
import { registerAppHandlers } from './utils/register-app-handlers';
import { AccessTokenManager } from './classes/access-token-manager';
import { getAuthStartUrl } from './utils/get-auth-start-url';
import { usersTable } from './database/users-table';
import { ChatManager } from './classes/chat-manager';

import { extend } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { refreshToken } from './utils/refresh-token';
import { Logger } from './model/logger';
import { correlationIdLoggerFactory } from './utils/correlation-id-logger-factory';
import { FetchTwitchApiParams } from './model/fetch-twitch-api-params';

extend(relativeTime);

process.title = 'DoubleColonBot';

(async () => {
  let db: DbClient;
  let stateManager: StateManager;
  let accessTokenManager: AccessTokenManager;
  let getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
  let botToken: string;

  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  const botUsername = env.TWITCH_LOGIN;
  const { publicHost, app } = webServerFactory({
    host: env.HOST,
    port: env.PORT,
    publicDomain: env.PUBLIC_DOMAIN,
    botUsername,
  });

  const startupLogger = correlationIdLoggerFactory('startup');
  try {
    db = await databaseClientFactory();
    stateManager = new StateManager(db);
    await stateManager.startCleanupInterval();
    accessTokenManager = new AccessTokenManager(db);

    getFreshAccessToken = async (logger: Logger, token: string) => {
      const updatingBotToken = token === botToken;
      await refreshToken({ logger, db, publicHost, access_token: token, clientId, clientSecret });
      if (updatingBotToken) {
        botToken = await accessTokenManager.getToken(logger, botUsername);
      }
    };
    // Handlers need to be registered before verifying the token otherwise we can't use any of the endpoints
    await registerAppHandlers(app, { stateManager, publicHost, clientId, clientSecret, db, getFreshAccessToken });
    // Verify that we have the bot token on file
    await verifyBotAccessToken({
      botUsername,
      publicHost,
      accessTokenManager,
      clientId,
      db,
      logger: startupLogger,
      getFreshAccessToken,
    });

    botToken = await accessTokenManager.getToken(startupLogger, botUsername);
  } catch (error) {
    console.error('Bot startup failure');
    console.error(error);
    process.exit(1);
    return;
  }

  const channelRows = await usersTable.selectLogins(db);
  const channels = channelRows.rows.map(({ login }) => login);
  console.info(`Starting bot with channels: ${channels.join(', ')}`);
  const chatManager = new ChatManager(db, {
    options: { debug: env.NODE_ENV === 'development' },
    identity: {
      username: botUsername,
      password: `oauth:${botToken}`,
    },
    channels,
  }, {
    publicHost,
    getFetchTwitchApiParams: (logger) => ({
      clientId,
      token: botToken,
      getFreshAccessToken,
      logger,
    }),
  });
  await chatManager.waitForConnection();

  console.info('Bot started successfully');
  console.info(`To authenticate additional users, direct them to: ${getAuthStartUrl(publicHost)}`);
})();
