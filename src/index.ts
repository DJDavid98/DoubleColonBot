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
import { Logger } from './model/logger';
import { correlationIdLoggerFactory } from './factories/correlation-id-logger-factory';
import { ChannelManager } from './classes/channel-manager';
import { RedisManager } from './classes/redis-manager';
import { TwitchEventSubManager } from './classes/twitch-event-sub-manager';

extend(relativeTime);

process.title = 'DoubleColonBot';

const startTimeMs = performance.now();

(async () => {
  let db: DbClient;
  let stateManager: StateManager;
  let accessTokenManager: AccessTokenManager;
  let channelManager: ChannelManager;
  let twitchEventSubManager: TwitchEventSubManager;
  let redisManager: RedisManager;

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
  const getFetchTwitchApiParams = async (logger: Logger) => {
    const botInto = await accessTokenManager.getBotInfo();
    return ({
      clientId,
      token: botInto.access_token,
      accessTokenManager,
      logger,
    });
  };

  try {
    db = await databaseClientFactory(startupLogger);
    channelManager = new ChannelManager(db, startupLogger);
    twitchEventSubManager = new TwitchEventSubManager({
      logger: startupLogger,
      getFetchTwitchApiParams,
      getBotInfo: () => accessTokenManager.getBotInfo(),
    });
    accessTokenManager = new AccessTokenManager({
      db,
      publicHost,
      channelManager,
      twitchEventSubManager,
      botUsername,
      logger: startupLogger,
    });

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
      accessTokenManager,
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
      channelManager,
      twitchEventSubManager,
    });
  } catch (error) {
    startupLogger.error('Bot startup failure');
    console.error(error);
    process.exit(1);
    return;
  }

  const chatManager = new ChatManager({
    db,
    accessTokenManager,
    publicHost,
    getFetchTwitchApiParams,
    channelManager,
    websocketManager,
    redisManager,
    twitchEventSubManager,
    logger: startupLogger,
    startTimeMs,
  });

  await twitchEventSubManager.connect(startupLogger);
  try {
    const botInfo = await accessTokenManager.getBotInfo();
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
