import {
  API_BASE_URL,
  JSON_ENCODED_CONTENT_TYPE_HEADER,
  TWITCH_ENDPOINT_METHODS,
  TwitchApiEndpointParams,
  URL_ENCODED_CONTENT_TYPE_HEADER,
} from '../constants/twitch';
import { loggedFetch } from './logged-fetch';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { TwitchApiEndpoint } from '../constants/twitch-api-endpoint';

const getTwitchEndpointPath = <E extends TwitchApiEndpoint>(
  endpoint: E,
  ...paramsInput: TwitchApiEndpointParams[E] extends never ? [] : [TwitchApiEndpointParams[E]]
): string => {
  const params = paramsInput[0];
  // noinspection JSUnreachableSwitchBranches
  switch (endpoint) {
    case TwitchApiEndpoint.GET_USERS: {
      return '/users';
    }
    case TwitchApiEndpoint.GET_SEARCH_CATEGORIES: {
      const { first, after, query } = params as TwitchApiEndpointParams[TwitchApiEndpoint.GET_SEARCH_CATEGORIES];
      const queryParams = new URLSearchParams({ query });
      if (typeof first === 'number') queryParams.set('first', String(first));
      if (typeof after === 'string') queryParams.set('after', after);
      return `/search/categories?${queryParams}`;
    }
    case TwitchApiEndpoint.PATCH_CHANNELS: {
      const { broadcaster_id } = params as TwitchApiEndpointParams[TwitchApiEndpoint.PATCH_CHANNELS];
      const queryParams = new URLSearchParams({ broadcaster_id });
      return `/channels?${queryParams}`;
    }
    case TwitchApiEndpoint.POST_EVENTSUB_SUBSCRIPTION: {
      return '/eventsub/subscriptions';
    }
    case TwitchApiEndpoint.DELETE_EVENTSUB_SUBSCRIPTION: {
      const { id } = params as TwitchApiEndpointParams[TwitchApiEndpoint.DELETE_EVENTSUB_SUBSCRIPTION];
      const queryParams = new URLSearchParams({ id });
      return `/eventsub/subscriptions?${queryParams}`;
    }
    default: {
      throw new Error(`Cannot find URL for Twitch endpoint ${endpoint}`);
    }
  }
};

const getTwitchEndpointBody = <E extends TwitchApiEndpoint>(
  endpoint: E,
  params: TwitchApiEndpointParams[E],
): RequestInit['body'] => {
  // noinspection JSUnreachableSwitchBranches
  switch (endpoint) {
    case TwitchApiEndpoint.PATCH_CHANNELS: {
      // TODO Try to find a less ugly solution for this
      const { game_id } = params as TwitchApiEndpointParams[TwitchApiEndpoint.PATCH_CHANNELS];
      return new URLSearchParams({ game_id });
    }
    case TwitchApiEndpoint.POST_EVENTSUB_SUBSCRIPTION: {
      const {
        broadcaster_user_id,
        moderator_user_id,
        session_id,
      } = params as TwitchApiEndpointParams[TwitchApiEndpoint.POST_EVENTSUB_SUBSCRIPTION];
      return JSON.stringify({
        type: 'channel.follow',
        version: '2',
        condition: {
          broadcaster_user_id,
          moderator_user_id,
        },
        transport: {
          method: 'websocket',
          session_id,
        },
      });
    }
    default: {
      return undefined;
    }
  }
};

export const fetchTwitchApiEndpoint = async <E extends TwitchApiEndpoint>(
  deps: FetchTwitchApiParams,
  endpoint: E,
  ...rest: (TwitchApiEndpointParams[E] extends never ? [] : [TwitchApiEndpointParams[E]])
): Promise<Response> => {
  const [params] = rest;
  if (deps.token === undefined) {
    throw new TypeError('The token dependency is mandatory');
  }
  let headers = {
    'authorization': `Bearer ${deps.token}`,
    'client-id': deps.clientId,
  };
  const body = getTwitchEndpointBody(endpoint, params as never);
  if (body !== undefined) {
    headers = body instanceof URLSearchParams ? { ...headers, ...URL_ENCODED_CONTENT_TYPE_HEADER } : { ...headers, ...JSON_ENCODED_CONTENT_TYPE_HEADER };
  }
  const response = await loggedFetch(deps.logger, API_BASE_URL + getTwitchEndpointPath(endpoint, ...rest), {
    method: TWITCH_ENDPOINT_METHODS[endpoint],
    headers,
    body,
  });

  if (response.status === 401 && deps.getFreshAccessToken !== null) {
    deps.logger.info('Unauthorized response received from Twitch API, attempting a token refresh…');
    // Looks like our token might have expired, let's try to fix it
    await deps.getFreshAccessToken(deps.logger, deps.token);
    deps.logger.info('Token refresh finished, re-executing request…');
    return fetchTwitchApiEndpoint({
      ...deps,
      // Avoid infinite loop by removing the refresh function
      getFreshAccessToken: null,
    }, endpoint, ...rest);
  }

  return response;
};
