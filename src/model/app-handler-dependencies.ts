import { StateManager } from '../classes/state-manager';
import { Client } from 'pg';
import { FetchTwitchApiParams } from './fetch-twitch-api-params';

export interface AppHandlerDependencies {
  publicHost: string;
  clientId: string;
  clientSecret: string;
  stateManager: StateManager;
  db: Client;
  getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
}
