import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { fetchUsername } from './fetch-username';
import { usersTable } from '../database/users-table';
import dayjs from 'dayjs';
import { validateUsers } from '../validation/validate-users';
import { JsonResponseProps } from '../factories/json-response-factory';
import { Client } from 'pg';
import { AccessToken } from '../validation/validate-access-token';
import { UsersInput } from '../database/database-schema';
import { Logger } from '../model/logger';
import { ChannelManager } from '../classes/channel-manager';
import { TwitchEventSubManager } from '../classes/twitch-event-sub-manager';

export interface UpdateUserDeps {
  /**
   * When string is passed, this acts as a token refresher, otherwise it will write the provided token response to DB
   */
  token: string;
  updateTokens: AccessToken | undefined;
  clientId: string;
  logger: Logger;
  getFreshAccessToken: FetchTwitchApiParams['getFreshAccessToken'];
  db: Client;
  channelManager: ChannelManager;
  twitchEventSubManager: TwitchEventSubManager;
}

/**
 * Basic API call to update the locally stored information of the current user (mainly the display name)
 *
 * This has the added bonus of triggering a token update in case it has expired
 */
export const updateUser = async (deps: UpdateUserDeps): Promise<JsonResponseProps> => {
  const now = dayjs();

  deps.logger.debug('Updating user information…');

  // Grab the username
  const fetchTwitchApiParams: FetchTwitchApiParams = deps;
  const usersResponse = await fetchUsername(fetchTwitchApiParams).then(r => r.json());
  const users = validateUsers(usersResponse);
  if (!users.value || users.error) {
    return {
      statusCode: 500,
      log: {
        severity: 'error',
        message: `Failed to retrieve users: ${users.error.annotate()}`,
      },
      body: 'Could not retrieve user information, please try again later.',
    };
  }
  const [firstUser] = users.value.data;
  if (!firstUser) {
    return {
      statusCode: 500,
      log: {
        severity: 'error',
        message: 'No users found in Twitch API response',
      },
      body: 'Could not retrieve user information, please try again later.',
    };
  }

  const { login, display_name, id } = firstUser;

  // Save data
  let updateData: UsersInput = {
    id,
    login,
    display_name,
  };
  if (deps.updateTokens !== undefined) {
    updateData = {
      ...updateData,
      expires: now.add(deps.updateTokens.expires_in, 'seconds').toDate(),
      scope: deps.updateTokens.scope,
      access_token: deps.updateTokens.access_token,
      refresh_token: deps.updateTokens.refresh_token,
    };
  }

  deps.logger.info(`Creating or updating user ${login} #${id}…`);
  await usersTable.createUser(deps.db, updateData);

  await deps.channelManager.updateChannels(deps.logger);

  return {
    statusCode: 200,
    log: {
      severity: 'info',
      message: `User ${login} successfully authenticated`,
    },
    body: `Welcome, ${display_name}! You can now close this window.`,
  };
};
