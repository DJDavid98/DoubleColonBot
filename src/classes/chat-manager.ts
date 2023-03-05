import { Client as DbClient } from 'pg';
import { ChatUserstate, Client, Options } from 'tmi.js';
import { CommandName, isKnownCommand } from '../constants/command-name';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { fetchTwitchApiEndpoint } from '../utils/fetch-twitch-api-endpoint';
import { SearchCategory, validateSearchCategories } from '../validation/validate-search-categories';
import { getRandomString } from '../utils/random';
import { correlationIdLoggerFactory } from '../utils/correlation-id-logger-factory';
import levenshtein from 'js-levenshtein';
import { plural } from '../utils/plural';
import { usersTable } from '../database/users-table';
import { getAuthStartUrl } from '../utils/get-auth-start-url';
import { TwitchApiEndpoint } from '../constants/twitch-api-endpoint';
import { Logger } from '../model/logger';

const commandRegex = /^!([\da-z]+)(?:\s+(.*))?$/i;

interface ChatCommand {
  name: CommandName;
  params?: string;
}

type MessageReply = (reply: string, success?: boolean) => Promise<unknown>;

interface ChatManagerDeps {
  publicHost: string;
  getFetchTwitchApiParams: (logger: Logger) => FetchTwitchApiParams;
}

export class ChatManager {
  private client: Client;

  constructor(private db: DbClient, options: Options, private deps: ChatManagerDeps) {
    this.client = new Client(options);
    this.client.on('message', (...params) => this.handleMessage(...params));
  }

  async waitForConnection() {
    await this.client.connect();
  }

  private parseCommand(log: Logger, message: string): ChatCommand | undefined {
    const match = message.match(commandRegex);
    if (match === null) {
      return undefined;
    }
    const [, name, params] = match;
    const normalizedName = name?.toLowerCase();
    if (!isKnownCommand(normalizedName)) {
      log.debug(`Ignoring unknown command ${normalizedName}`);
      return;
    }
    const trimmedParams = params.trim();
    return { name: normalizedName, params: trimmedParams.length > 0 ? trimmedParams : undefined };
  }

  private async getChannelAccessToken(reply: MessageReply, log: Logger, login: string): Promise<{ token: string, id: string } | undefined> {
    log.debug(`Retrieving access token for login ${login}`);
    const userTokenRows = await usersTable.selectUser(this.db, login);
    if (userTokenRows.rowCount === 1) {
      const { access_token, id } = userTokenRows.rows[0];
      if (access_token) {
        log.debug(`Found access token, broadcaster #${id}`);
        return { token: access_token, id };
      } else {
        log.debug(`No access token found for broadcaster #${id}`);
      }
    } else {
      log.debug('No users found in database');
    }

    await reply(`You are not authenticated with the bot, please use ${getAuthStartUrl(this.deps.publicHost)} to fix that`);
    return undefined;
  }

  private handleMessage(channel: string, tags: ChatUserstate, message: string, self: boolean) {
    if (self) return;
    const correlationId = getRandomString();
    const log = correlationIdLoggerFactory(correlationId);

    const parsedCommand = this.parseCommand(log, message);
    if (!parsedCommand) {
      return;
    }

    const messageReply: MessageReply = (reply, success = false) => {
      let replyText = reply;
      if (!success) {
        replyText += ` (${correlationId})`;
      }
      return this.client.say(channel, `@${tags.username} ${replyText}`);
    };
    return this.handleCommand(channel, messageReply, log, tags, parsedCommand.name, parsedCommand.params);
  }

  private isStreamer(login: string, tags: ChatUserstate) {
    return tags.username === login;
  }

  private isMod(login: string, tags: ChatUserstate) {
    return tags.mod === true || this.isStreamer(login, tags);
  }

  private async handleCommand(channel: string, reply: MessageReply, log: Logger, tags: ChatUserstate, name: CommandName, params?: string): Promise<unknown> {
    const login = channel.replace(/^#/, '');
    switch (name) {
      case CommandName.category:
      case CommandName.game: {
        {
          if (!this.isMod(login, tags)) {
            return reply('Only channel moderators can use this command');
          }
          if (!params) {
            return reply(`Please provide the name of the ${name}`);
          }

          const query = params;
          log.debug(`Executing category search for query "${query}"`);
          const fetchTwitchApiParams = this.deps.getFetchTwitchApiParams(log);
          const searchResponse = await fetchTwitchApiEndpoint(fetchTwitchApiParams, TwitchApiEndpoint.GET_SEARCH_CATEGORIES, { query }).then(r => r.json());
          const search = validateSearchCategories(searchResponse);
          if (!search.value || search.error) {
            log.error(search.error.annotate());
            return reply(`Could not search ${plural(name, true)}, please try again later`);
          }

          const categories = search.value.data;
          log.debug(`Found ${plural('category', categories.length)}`);
          let bestMatch: SearchCategory;
          switch (categories.length) {
            case 0: {
              return reply(`No matching ${name} was found, please try a different name`);
            }
            case 1: {
              bestMatch = categories[0];
              break;
            }
            default: {
              const distances = categories.reduce((d, cat) => ({
                ...d,
                [cat.name]: levenshtein(query, cat.name),
              }), {} as Record<string, number>);
              const categoriesByDistance = categories.sort((a, b) => distances[a.name] - distances[b.name]);
              log.debug(`Categories sorted by distance: ${JSON.stringify(categoriesByDistance, null, 4)}`);
              bestMatch = categoriesByDistance[0];
            }
          }

          const newCategoryName = bestMatch.name;
          log.info(`Found best matching category "${newCategoryName}" #${bestMatch.id}`);

          const userToken = await this.getChannelAccessToken(reply, log, login);
          if (!userToken) {
            return;
          }

          const broadcaster_id = userToken.id;
          const game_id = bestMatch.id;
          log.info(`Updating channel of broadcaster #${broadcaster_id} with game #${game_id}`);
          const updateResponse = await fetchTwitchApiEndpoint({
            ...fetchTwitchApiParams,
            token: userToken.token,
          }, TwitchApiEndpoint.PATCH_CHANNELS, {
            broadcaster_id,
            game_id,
          });
          if (updateResponse.status !== 204) {
            log.error(`Could not update game, HTTP ${updateResponse.status} response: ${await updateResponse.text()}`);
            return reply(`Failed to update ${name}, please try again later.`);
          }

          log.info('Stream category update successful');
          return reply(`Stream ${name} set to ${newCategoryName}`, true);
        }
      }
      default: {
        throw new Error(`Unhandled command ${name}`);
      }
    }
  }
}
