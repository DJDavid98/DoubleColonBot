import { databaseClientFactory } from './factories/database-client-factory';
import { webServerFactory } from './factories/web-server-factory';
import { env } from './constants/env';
import { Client as DbClient } from 'pg';
import { verifyBotAccessToken } from './utils/verify-bot-access-token';
import { StateManager } from './classes/state-manager';
import { registerAppHandlers } from './utils/register-app-handlers';
import { AccessTokenManager } from './classes/access-token-manager';
import { getAuthStartUrl } from './utils/get-auth-start-url';
import { ChatManager } from './classes/chat-manager';

import { extend } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { refreshToken } from './utils/refresh-token';
import { Logger } from './model/logger';
import { correlationIdLoggerFactory } from './factories/correlation-id-logger-factory';
import { FetchTwitchApiParams } from './model/fetch-twitch-api-params';
import { ChannelManager } from './classes/channel-manager';
import { RedisManager } from './classes/redis-manager';

extend(relativeTime);

process.title = 'DoubleColonBot';

(async () => {
  let db: DbClient;
  let stateManager: StateManager;
  let accessTokenManager: AccessTokenManager;
  let channelManager: ChannelManager;
  let redisManager: RedisManager;
  let getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
  let botToken: string;

  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  const botUsername = env.TWITCH_LOGIN;
  const startupLogger = correlationIdLoggerFactory('startup');
  const { publicHost, app, websocketManager } = webServerFactory({
    host: env.HOST,
    port: env.PORT,
    publicDomain: env.PUBLIC_DOMAIN,
    logger: startupLogger,
  });

  try {
    db = await databaseClientFactory(startupLogger);
    redisManager = new RedisManager();
    await redisManager.initClient(startupLogger);
    channelManager = new ChannelManager(db);
    stateManager = new StateManager(db);
    await stateManager.startCleanupInterval(startupLogger);
    accessTokenManager = new AccessTokenManager(db);

    getFreshAccessToken = async (logger: Logger, token: string) => {
      const updatingBotToken = token === botToken;
      await refreshToken({ logger, db, publicHost, access_token: token, clientId, clientSecret, channelManager });
      if (updatingBotToken) {
        botToken = await accessTokenManager.getToken(logger, botUsername);
      }
    };
    // Handlers need to be registered before verifying the token otherwise we can't use any of the endpoints
    await registerAppHandlers(app, {
      stateManager,
      publicHost,
      clientId,
      clientSecret,
      db,
      getFreshAccessToken,
      botUsername,
      channelManager,
    });
    // Verify that we have the bot token on file
    await verifyBotAccessToken({
      botUsername,
      publicHost,
      accessTokenManager,
      clientId,
      db,
      logger: startupLogger,
      getFreshAccessToken,
      channelManager,
    });

    botToken = await accessTokenManager.getToken(startupLogger, botUsername);
  } catch (error) {
    startupLogger.error('Bot startup failure');
    console.error(error);
    process.exit(1);
    return;
  }

  const chatManager = new ChatManager(db, {
    options: { debug: env.NODE_ENV === 'development' },
    identity: {
      username: botUsername,
      password: `oauth:${botToken}`,
    },
  }, {
    publicHost,
    getFetchTwitchApiParams: (logger) => ({
      clientId,
      token: botToken,
      getFreshAccessToken,
      logger,
    }),
    channelManager,
    websocketManager,
    redisManager,
  });

  await chatManager.waitForConnection(startupLogger);
  await channelManager.updateChannels(startupLogger);

  startupLogger.info('Bot started successfully');
  startupLogger.info(`To authenticate additional users, direct them to: ${getAuthStartUrl(publicHost)}`);
})();
