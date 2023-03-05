import { StateManager } from '../classes/state-manager';
import { Client } from 'pg';
import { FetchTwitchApiParams } from './fetch-twitch-api-params';
import { ChannelManager } from '../classes/channel-manager';

export interface AppHandlerDependencies {
  publicHost: string;
  botUsername: string;
  clientId: string;
  clientSecret: string;
  stateManager: StateManager;
  db: Client;
  getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
  channelManager: ChannelManager,
}
