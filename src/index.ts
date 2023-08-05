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
import { TwitchEventSubManager } from './classes/twitch-event-sub-manager';
import { UserTokenInfo } from './database/users-table';

extend(relativeTime);

process.title = 'DoubleColonBot';

(async () => {
  let db: DbClient;
  let stateManager: StateManager;
  let accessTokenManager: AccessTokenManager;
  let channelManager: ChannelManager;
  let twitchEventSubManager: TwitchEventSubManager;
  let redisManager: RedisManager;
  let getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
  let botInfo: UserTokenInfo;

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
  const getFetchTwitchApiParams = (logger: Logger) => ({
    clientId,
    token: botInfo.access_token,
    getFreshAccessToken,
    logger,
  });

  try {
    db = await databaseClientFactory(startupLogger);
    accessTokenManager = new AccessTokenManager(db);
    getFreshAccessToken = async (logger: Logger, token: string) => {
      const updatingBotToken = token === botInfo.access_token;
      await refreshToken({
        logger,
        db,
        publicHost,
        access_token: token,
        clientId,
        clientSecret,
        channelManager,
        twitchEventSubManager,
      });
      if (updatingBotToken) {
        botInfo = await accessTokenManager.getToken(logger, botUsername);
      }
    };
    twitchEventSubManager = new TwitchEventSubManager({
      logger: startupLogger,
      getFetchTwitchApiParams,
      getBotInfo: () => botInfo,
    });

    channelManager = new ChannelManager(db, startupLogger);
    redisManager = new RedisManager();
    await redisManager.initClient(startupLogger);
    stateManager = new StateManager(db);
    await stateManager.startCleanupInterval(startupLogger);

    // Handlers need to be registered before verifying the token otherwise we can't use any of the endpoints
    registerAppHandlers(app, {
      stateManager,
      publicHost,
      clientId,
      clientSecret,
      db,
      getFreshAccessToken,
      botUsername,
      channelManager,
      twitchEventSubManager,
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
      twitchEventSubManager,
    });

    botInfo = await accessTokenManager.getToken(startupLogger, botUsername);
  } catch (error) {
    startupLogger.error('Bot startup failure');
    console.error(error);
    process.exit(1);
    return;
  }

  const chatManager = new ChatManager(db, {
    publicHost,
    getFetchTwitchApiParams,
    channelManager,
    websocketManager,
    redisManager,
    twitchEventSubManager,
    logger: startupLogger,
  });

  await twitchEventSubManager.connect(startupLogger);
  try {
    await chatManager.connect(startupLogger, {
      options: { debug: env.NODE_ENV === 'development' },
      identity: {
        username: botUsername,
        password: `oauth:${botInfo.access_token}`,
      },
      connection: {
        reconnect: true,
        maxReconnectAttempts: 10,
        reconnectInterval: 5,
      },
      logger: correlationIdLoggerFactory('ChatClient'),
    });
  } catch (error) {
    startupLogger.error('Chat connection failure');
    console.error(error);
    process.exit(1);
    return;
  }
  await channelManager.updateChannels(startupLogger);

  startupLogger.info('Bot started successfully');
  startupLogger.info(`To authenticate additional users, direct them to: ${getAuthStartUrl(publicHost)}`);
})();
