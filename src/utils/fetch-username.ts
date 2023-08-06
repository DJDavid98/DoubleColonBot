import { fetchTwitchApiEndpoint } from './fetch-twitch-api-endpoint';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { TwitchApiEndpoint } from '../constants/twitch-api-endpoint';

export const fetchUsername = (params: FetchTwitchApiParams) => fetchTwitchApiEndpoint(params, TwitchApiEndpoint.GET_USERS, {});
