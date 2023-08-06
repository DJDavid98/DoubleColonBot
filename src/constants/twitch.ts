import { TwitchApiEndpoint } from './twitch-api-endpoint';
import { TwitchEventSubChannelBanCondition, TwitchEventSubChannelFollowCondition } from '../model/twicth-event-sub';

export const OAUTH_AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';

export const OAUTH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

export const API_BASE_URL = 'https://api.twitch.tv/helix';

export const MODERATION_READ_SCOPE = 'moderation:read';
export const MANAGE_BANS_SCOPE = 'moderator:manage:banned_users';
export const MODERATE_SCOPE = 'channel:moderate';
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
  // See bans
  MODERATE_SCOPE, MODERATION_READ_SCOPE, MANAGE_BANS_SCOPE,
  // Read list of followers (for new follow alerts)
  READ_FOLLOWERS_SCOPE,
] as const;

export interface TwitchApiEndpointParams {
  [TwitchApiEndpoint.GET_USERS]: {
    id?: string[];
    login?: string[];
  };
  [TwitchApiEndpoint.GET_BANNED_USERS]: {
    broadcaster_id: string;
    user_id?: string[];
    first?: number;
    after?: string;
    before?: string;
  };
  [TwitchApiEndpoint.GET_SEARCH_CATEGORIES]: {
    query: string;
    first?: number;
    after?: string;
  };
  [TwitchApiEndpoint.PATCH_CHANNELS]: {
    broadcaster_id: string;
    game_id: string;
  };
  [TwitchApiEndpoint.GET_CHANNELS_FOLLOWERS]: {
    broadcaster_id: string;
    user_id?: string;
    first?: number;
    after?: string;
  };
  [TwitchApiEndpoint.POST_FOLLOW_EVENTSUB_SUBSCRIPTION]: TwitchEventSubChannelFollowCondition & {
    session_id: string;
  };
  [TwitchApiEndpoint.POST_BAN_EVENTSUB_SUBSCRIPTION]: TwitchEventSubChannelBanCondition & {
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
  [TwitchApiEndpoint.POST_FOLLOW_EVENTSUB_SUBSCRIPTION]: 'POST',
  [TwitchApiEndpoint.POST_BAN_EVENTSUB_SUBSCRIPTION]: 'POST',
  [TwitchApiEndpoint.DELETE_EVENTSUB_SUBSCRIPTION]: 'DELETE',
};

export const URL_ENCODED_CONTENT_TYPE_HEADER = { 'Content-Type': 'application/x-www-form-urlencoded' } as const;

export const JSON_ENCODED_CONTENT_TYPE_HEADER = { 'Content-Type': 'application/json' } as const;
