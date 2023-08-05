import { identityMap } from '../utils/identity-map';

export type TwitchEventSubSubscriptionType = 'channel.follow';

export const TwitchEventSubMessageType = identityMap([
  'session_welcome',
  'session_keepalive',
  'session_reconnect',
  'notification',
  'revocation',
]);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type TwitchEventSubMessageType = keyof typeof TwitchEventSubMessageType;

interface BaseTwitchEventSubMessageMetadata<Type extends string> {
  message_id: string;
  message_type: Type,
  message_timestamp: string,
}

export interface TwitchEventSubWelcomeMessage {
  metadata: BaseTwitchEventSubMessageMetadata<'session_welcome'>;
  payload: {
    session: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: number;
      reconnect_url: null;
    };
  };
}

export interface TwitchEventSubKeepaliveMessage {
  metadata: BaseTwitchEventSubMessageMetadata<'session_keepalive'>;
  payload: Record<string, never>;
}

export interface TwitchEventSubReconnectMessage {
  metadata: BaseTwitchEventSubMessageMetadata<'session_reconnect'>;
  payload: {
    session: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: null;
      reconnect_url: string;
    };
  };
}

interface TwitchEventSubNotificationMessageSubscriptionData {
  id: string;
  status: string;
  type: TwitchEventSubSubscriptionType;
  version: string;
  cost: number;
  condition: {
    broadcaster_user_id: string;
  };
  transport: {
    method: 'websocket';
    session_id: string;
  };
  created_at: string;
}

export interface TwitchEventSubNotificationMessageEventData {
  user_id: string;
  user_login: string;
  user_name: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  followed_at: string;
}

export interface TwitchEventSubNotificationMessage {
  metadata: BaseTwitchEventSubMessageMetadata<'notification'>;
  payload: {
    subscription: TwitchEventSubNotificationMessageSubscriptionData;
    event: TwitchEventSubNotificationMessageEventData;
  };
}

export interface TwitchEventSubRevocationMessage {
  metadata: BaseTwitchEventSubMessageMetadata<'revocation'> & {
    subscription_type: TwitchEventSubSubscriptionType;
    subscription_version: string;
  };
  payload: {
    subscription: TwitchEventSubNotificationMessageSubscriptionData;
  };
}

export type TwitchEventSubMessageTypeMap = {
  [TwitchEventSubMessageType.session_welcome]: TwitchEventSubWelcomeMessage;
  [TwitchEventSubMessageType.session_keepalive]: TwitchEventSubKeepaliveMessage;
  [TwitchEventSubMessageType.session_reconnect]: TwitchEventSubReconnectMessage;
  [TwitchEventSubMessageType.notification]: TwitchEventSubNotificationMessage;
  [TwitchEventSubMessageType.revocation]: TwitchEventSubRevocationMessage;
};
export type TwitchEventSubMessage = TwitchEventSubMessageTypeMap[keyof TwitchEventSubMessageTypeMap];

export interface TwitchEventSubSubscription {
  data: Array<{
    id: string,
    status: string,
    type: TwitchEventSubSubscriptionType,
    version: string,
    cost: number,
    condition: {
      broadcaster_user_id: string,
      moderator_user_id?: string
    },
    transport: {
      method: 'websocket';
      session_id: string;
    },
    created_at: string
  }>,
  total: number,
  total_cost: number,
  max_total_cost: number
}

export interface FollowEventSubscription {
  broadcasterId: string;
  /**
   * Only defined for existing subscriptions
   */
  id?: string;
}
