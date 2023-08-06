import { StateManager } from '../classes/state-manager';
import { Client } from 'pg';
import { ChannelManager } from '../classes/channel-manager';
import { TwitchEventSubManager } from '../classes/twitch-event-sub-manager';
import { AccessTokenManager } from '../classes/access-token-manager';

export interface AppHandlerDependencies {
  publicHost: string;
  botUsername: string;
  clientId: string;
  clientSecret: string;
  stateManager: StateManager;
  db: Client;
  accessTokenManager: AccessTokenManager;
  channelManager: ChannelManager,
  twitchEventSubManager: TwitchEventSubManager,
}
