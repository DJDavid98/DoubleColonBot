import {
  API_BASE_URL,
  TWITCH_ENDPOINT_METHODS,
  TwitchApiEndpointParams,
  URL_ENCODED_CONTENT_TYPE_HEADER,
} from '../constants/twitch';
import { loggedFetch } from './logged-fetch';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { TwitchApiEndpoint } from '../constants/twitch-api-endpoint';

const getTwitchEndpointPath = <E extends TwitchApiEndpoint>(
  endpoint: E,
  params: TwitchApiEndpointParams[E],
): string => {
  switch (endpoint) {
    case TwitchApiEndpoint.GET_USERS: {
      return '/users';
    }
    case TwitchApiEndpoint.GET_SEARCH_CATEGORIES: {
      // TODO Try to find a less ugly solution for this
      const { first, after, query } = params as TwitchApiEndpointParams[TwitchApiEndpoint.GET_SEARCH_CATEGORIES];
      const queryParams = new URLSearchParams({ query });
      if (typeof first === 'number') queryParams.set('first', String(first));
      if (typeof after === 'string') queryParams.set('after', after);
      return `/search/categories?${queryParams}`;
    }
    case TwitchApiEndpoint.PATCH_CHANNELS: {
      // TODO Try to find a less ugly solution for this
      const { broadcaster_id } = params as TwitchApiEndpointParams[TwitchApiEndpoint.PATCH_CHANNELS];
      const queryParams = new URLSearchParams({ broadcaster_id });
      return `/channels?${queryParams}`;
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
  switch (endpoint) {
    case TwitchApiEndpoint.PATCH_CHANNELS: {
      // TODO Try to find a less ugly solution for this
      const { game_id } = params as TwitchApiEndpointParams[TwitchApiEndpoint.PATCH_CHANNELS];
      return new URLSearchParams({ game_id });
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
  let headers = {
    'authorization': `Bearer ${deps.token}`,
    'client-id': deps.clientId,
  };
  const body = getTwitchEndpointBody(endpoint, params as never);
  if (body !== undefined && body instanceof URLSearchParams) {
    headers = { ...headers, ...URL_ENCODED_CONTENT_TYPE_HEADER };
  }
  const response = await loggedFetch(deps.logger, API_BASE_URL + getTwitchEndpointPath(endpoint, params as never), {
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
