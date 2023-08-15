import {
  FollowEventSubscription,
  TwitchEventSubChannelFollowCondition,
  TwitchEventSubFollowNotificationMessage,
  TwitchEventSubFollowNotificationMessageEventData,
  TwitchEventSubMessageTypeMap,
} from '../model/twicth-event-sub';
import {
  isValidateTwitchEventSubSubscription,
  isValidTwitchEventSubMessageType,
  validateTwitchEventSubMessage,
} from '../validation/validate-twitch-event-sub-data';
import { Logger } from '../model/logger';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { fetchTwitchApiEndpoint } from '../utils/fetch-twitch-api-endpoint';
import { TwitchApiEndpoint } from '../constants/twitch-api-endpoint';
import { AppEventListener, AppEventManager } from './app-event-manager';
import { keyBy } from 'lodash';
import WebSocket from 'ws';
import { DeferredPromise } from './deferred-promise';
import { KeepaliveManager } from './keepalive-manager';
import { correlationIdLoggerFactory } from '../factories/correlation-id-logger-factory';
import { getRandomUuid } from '../utils/random';
import { getExceptionMessage } from '../utils/get-exteption-message';
import { UserTokenInfo } from '../database/users-table';

type MessageTypeHandlers = {
  [k in keyof TwitchEventSubMessageTypeMap]: (data: TwitchEventSubMessageTypeMap[k]) => void | Promise<void>
};

export type FollowEventPayload = TwitchEventSubFollowNotificationMessageEventData;
export type FollowEventListener = AppEventListener<FollowEventPayload>;

interface TwitchEventSubManagerParams {
  logger: Logger;
  getFetchTwitchApiParams: (logger: Logger) => Promise<FetchTwitchApiParams>;
  getBotInfo: () => Promise<UserTokenInfo>;
}

export class TwitchEventSubManager {
  private connection: WebSocket | undefined;

  private reConnection: WebSocket | null = null;

  private sessionId: DeferredPromise<string> = new DeferredPromise();

  private readonly messageTypeHandlers: MessageTypeHandlers;

  private followEventSubscriptions: Array<FollowEventSubscription> = [];

  private readonly followEventManager = new AppEventManager<FollowEventPayload>();

  private readonly keepaliveManager: KeepaliveManager | undefined;

  constructor(private readonly deps: TwitchEventSubManagerParams) {
    this.keepaliveManager = new KeepaliveManager('TwitchEventSub', 5e3);
    this.messageTypeHandlers = {
      session_welcome: async (data) => {
        this.sessionId?.setValue(data.payload.session.id);
        this.keepaliveManager?.startTimeout(data.payload.session.keepalive_timeout_seconds, this.reconnect.bind(this));
        if (this.reConnection) {
          this.connection?.close();
          this.connection = this.reConnection;
          this.reConnection = null;
        }

        await this.processFollowEventsSubs(this.followEventSubscriptions);
      },
      session_keepalive: () => {},
      session_reconnect: async data => {
        await this.reconnect(data.payload.session.reconnect_url);
      },
      notification: (data) => {
        switch (data.payload.subscription.type) {
          case 'channel.follow': {
            this.followEventManager.fireEvent((data as TwitchEventSubFollowNotificationMessage).payload.event);
            break;
          }
        }
      },
      revocation: async (data) => {
        switch (data.payload.subscription.type) {
          case 'channel.follow': {
            // Remove revoked subscription from the list
            await this.unsubscribeFromFollowEvents(this.deps.logger, {
              broadcasterId: (data.payload.subscription.condition as TwitchEventSubChannelFollowCondition).broadcaster_user_id,
            });
            return;
          }
        }
      },
    };

    process.on('exit', () => {
      this.deps.logger.info('[TwitchEventSubManager] Process exiting, closing connection…');
      this.connection?.close();
      this.reConnection?.close();
    });
  }

  async connect(logger: Logger): Promise<void> {
    logger.info('Connecting to EventSub websocket…');
    this.connection = await this.createConnection();
  }

  async subscribeToFollowEvents(subs: Array<FollowEventSubscription>): Promise<void> {
    this.followEventSubscriptions = [...this.followEventSubscriptions, ...(await this.processFollowEventsSubs(subs))];
  }

  async unsubscribeFromFollowEvents(logger: Logger, sub: FollowEventSubscription): Promise<void> {
    this.followEventSubscriptions = this.followEventSubscriptions.filter(value =>
      // Remove revoked subscription from the list
      sub.broadcasterId !== value.broadcasterId,
    );
    if (sub.id) {
      await fetchTwitchApiEndpoint(await this.deps.getFetchTwitchApiParams(logger), TwitchApiEndpoint.DELETE_EVENTSUB_SUBSCRIPTION, { id: sub.id });
    }
  }

  addFollowEventListener(listener: FollowEventListener) {
    this.followEventManager.addListener(listener);
  }

  private async reconnect(connectionUrl?: string) {
    this.deps.logger('info', '[TwitchEventSubManager] Connection lost, reconnecting…');
    this.sessionId = new DeferredPromise();
    // Remove IDs from subscriptions to make sure they are re-created
    this.followEventSubscriptions = this.followEventSubscriptions.map(({ id: _, ...sub }) => sub);
    this.reConnection = await this.createConnection(connectionUrl);
  }

  private async createConnection(connectionUrl = 'wss://eventsub.wss.twitch.tv/ws'): Promise<WebSocket> {
    this.deps.logger('info', `[TwitchEventSubManager] Creating websocket connection to ${connectionUrl}`);
    return new Promise(resolve => {
      const newConnection = new WebSocket(connectionUrl);
      newConnection.addEventListener('message', async (event) => {
        const data = JSON.parse(event.data.toString());
        const validator = validateTwitchEventSubMessage(data);
        if (validator.success) {
          const messageType = data.metadata.message_type;
          if (!isValidTwitchEventSubMessageType(messageType)) {
            this.deps.logger('warn', `[TwitchEventSubManager] Received invalid message: ${event.data}`);
            return;
          }
          this.keepaliveManager?.resetTimer();
          if (messageType in this.messageTypeHandlers) {
            try {
              await this.messageTypeHandlers[messageType](data as never);
            } catch (error) {
              this.deps.logger('error', `[TwitchEventSubManager] Error while calling handler for message type ${messageType}: ${getExceptionMessage(error)}`);
            }
          } else {
            this.deps.logger('debug', `[TwitchEventSubManager] No handler defined for message type ${messageType}`);
          }
        } else {
          this.deps.logger('debug', `[TwitchEventSubManager] Received invalid message: ${event.data}\nErrors: ${JSON.stringify(validator.errors, null, 2)}`);
        }
      });
      newConnection.addEventListener('open', (data) => {
        this.deps.logger('debug', `[TwitchEventSubManager] Connection opened to ${data.target.url}`);
        resolve(newConnection);
      });
      newConnection.addEventListener('close', (event) => {
        this.deps.logger('warn', `[TwitchEventSubManager] Connection closed: ${event.reason || 'Unknown reason'} (code: ${event.code})`);
      });
    });
  }

  private async processFollowEventsSubs(subs: Array<FollowEventSubscription>): Promise<Array<FollowEventSubscription>> {
    const logger = correlationIdLoggerFactory(`TwitchEventSubManager#processFollowEventsSubs:${getRandomUuid()}`);
    const sessionId = await this.sessionId.promise;
    const existingSubscriptions = keyBy(this.followEventSubscriptions, (v: FollowEventSubscription) => v.broadcasterId);
    // Register subscriptions and add their IDs
    return Promise.all(subs.map(async (value): Promise<FollowEventSubscription> => {
      const { broadcasterId } = value;
      if (broadcasterId in existingSubscriptions) {
        const existingSubscription = existingSubscriptions[broadcasterId];
        if (existingSubscription.id) {
          return existingSubscription;
        }
      }

      logger('info', `Creating new follow event subscription for broadcaster #${broadcasterId}…`);
      const botInfo = await this.deps.getBotInfo();
      const response = await fetchTwitchApiEndpoint(await this.deps.getFetchTwitchApiParams(logger), TwitchApiEndpoint.POST_FOLLOW_EVENTSUB_SUBSCRIPTION, {
        broadcaster_user_id: broadcasterId,
        moderator_user_id: botInfo.id,
        session_id: sessionId,
      });
      if (!response.ok) {
        logger('error', `Failed to create follow event subscription (HTTP ${response.status}) ${await response.text()}`);
        return value;
      }

      const result = await response.json();
      if (!isValidateTwitchEventSubSubscription(result) || result.data.length === 0) {
        logger('error', 'Received invalid event subscription response');
        throw new Error('Invalid event subscription response');
      }
      return { ...value, id: result.data[0].id };
    }));
  }
}
