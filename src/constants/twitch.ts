import { TwitchApiEndpoint } from './twitch-api-endpoint';

export const OAUTH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';

export const OAUTH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export const API_BASE_URL = 'https://api.twitch.tv/helix';

export const READ_FOLLOWERS_SCOPE = 'moderator:read:followers';

/**
 * List of Twitch scopes needed for the bot to function
 * @see https://dev.twitch.tv/docs/authentication/scopes/#chat-and-pubsub-scopes
 */
export const BOT_REQUIRED_SCOPES = [
  // Setting currently played game
  'channel:manage:broadcast',
  // Read chat messages
  'chat:read',
  // Send chat messages
  'chat:edit',
  // Read list of followers (for new follow alerts)
  READ_FOLLOWERS_SCOPE,
] as const;

export interface TwitchApiEndpointParams {
  [TwitchApiEndpoint.GET_USERS]: never;
  [TwitchApiEndpoint.GET_SEARCH_CATEGORIES]: {
    query: string;
    first?: number;
    after?: string;
  };
  [TwitchApiEndpoint.PATCH_CHANNELS]: {
    broadcaster_id: string;
    game_id: string;
  };
  [TwitchApiEndpoint.POST_EVENTSUB_SUBSCRIPTION]: {
    broadcaster_user_id: string;
    moderator_user_id: string;
    session_id: string;
  };
  [TwitchApiEndpoint.DELETE_EVENTSUB_SUBSCRIPTION]: {
    id: string;
  };
}

/**
 * Mapping of HTTP request methods (other than GET) in case an endpoint needs a special type
 */
export const TWITCH_ENDPOINT_METHODS: Partial<Record<TwitchApiEndpoint, 'POST' | 'PATCH' | 'PUT' | 'DELETE'>> = {
  [TwitchApiEndpoint.PATCH_CHANNELS]: 'PATCH',
  [TwitchApiEndpoint.POST_EVENTSUB_SUBSCRIPTION]: 'POST',
  [TwitchApiEndpoint.DELETE_EVENTSUB_SUBSCRIPTION]: 'DELETE',
};

export const URL_ENCODED_CONTENT_TYPE_HEADER = { 'Content-Type': 'application/x-www-form-urlencoded' } as const;

export const JSON_ENCODED_CONTENT_TYPE_HEADER = { 'Content-Type': 'application/json' } as const;
