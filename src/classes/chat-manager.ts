import { Client as DbClient } from 'pg';
import { ChatUserstate, Client, Options } from 'tmi.js';
import { CommandName, isKnownCommand } from '../constants/command-name';
import { FetchTwitchApiParams } from '../model/fetch-twitch-api-params';
import { fetchTwitchApiEndpoint } from '../utils/fetch-twitch-api-endpoint';
import { SearchCategory, validateSearchCategories } from '../validation/validate-search-categories';
import { getRandomString } from '../utils/random';
import { correlationIdLoggerFactory } from '../factories/correlation-id-logger-factory';
import levenshtein from 'js-levenshtein';
import { plural } from '../utils/plural';
import { usersTable } from '../database/users-table';
import { getAuthStartUrl } from '../utils/get-auth-start-url';
import { TwitchApiEndpoint } from '../constants/twitch-api-endpoint';
import { Logger } from '../model/logger';
import { ChannelManager } from './channel-manager';
import { formatCorrelationId } from '../utils/format-correlation-id';
import { normalizeChannelName } from '../utils/normalize-channel-name';
import { calculateExpectedChannelsDiff } from '../utils/calculate-expected-channels-diff';
import { WebsocketManager } from './websocket-manager';
import { PronounManager } from './pronoun-manager';
import { RedisManager } from './redis-manager';
import { chatSettingsTable } from '../database/chat-settings-table';
import { WebsocketMessageType } from '../constants/webocket-message-type';
import { ChatSettings, ChatSettingsInput, tables } from '../database/database-schema';
import { getExceptionMessage } from '../utils/get-exteption-message';
import { env } from '../constants/env';

const commandRegex = /^!([\da-z]+)(?:\s+(.*))?$/i;

interface ChatCommand {
  name: CommandName;
  params?: string;
}

type MessageReply = (reply: string, success?: boolean) => Promise<unknown>;

interface ChatManagerDeps {
  publicHost: string;
  getFetchTwitchApiParams: (logger: Logger) => FetchTwitchApiParams;
  channelManager: ChannelManager;
  websocketManager: WebsocketManager;
  redisManager: RedisManager;
}

export class ChatManager {
  private client: Client;

  constructor(private db: DbClient, options: Options, private deps: ChatManagerDeps) {
    this.client = new Client(options);
    this.client.on('chat', (...params) => {
      // Ignore self messages
      if (params[3]) return;
      void this.handleChat(...params);
    });
    this.client.on('clearchat', (channel) => {
      void this.deps.websocketManager.sendToRoom(normalizeChannelName(channel), WebsocketMessageType.clearChat);
    });
    deps.channelManager.addListener(async newChannels => {
      const currentChannels = this.client.getChannels().map((c) => normalizeChannelName(c));

      const { joinChannels, partChannels } = calculateExpectedChannelsDiff(newChannels, currentChannels);
      for (const joinChannel of joinChannels) {
        await this.client.join(joinChannel);
      }
      for (const partChannel of partChannels) {
        await this.client.part(partChannel);
      }
    });
  }

  async waitForConnection(log: Logger) {
    log.debug('Waiting for WS client connection…');
    await this.client.connect();
  }

  private parseCommand(log: Logger, message: string): ChatCommand | undefined {
    const match = message.match(commandRegex);
    if (match === null) {
      return undefined;
    }
    const [, name, params = ''] = match;
    const normalizedName = name?.toLowerCase();
    if (!isKnownCommand(normalizedName)) {
      log.debug(`Ignoring unknown command ${normalizedName}`);
      return;
    }
    const trimmedParams = params.trim();
    return { name: normalizedName, params: trimmedParams.length > 0 ? trimmedParams : undefined };
  }

  private async getChannelAccessToken(reply: MessageReply, log: Logger, login: string): Promise<{
    token: string,
    id: string
  } | undefined> {
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

  private async handleChat(channel: string, tags: ChatUserstate, message: string, self: boolean) {
    // Self detection is not perfect, replies will go through
    if (self || this.getUsername(tags) === env.TWITCH_LOGIN) return;
    const correlationId = getRandomString();
    const log = correlationIdLoggerFactory(correlationId);
    const login = normalizeChannelName(channel);

    const parsedCommand = this.parseCommand(log, message);
    if (!parsedCommand) {
      await this.handleChatMessage(login, message, log, tags);

      // Not a command, no further processing done
      return;
    }

    const messageReply: MessageReply = (reply, success = false) => {
      let replyText = reply;
      if (!success) {
        replyText += ` ${formatCorrelationId(correlationId)}`;
      }
      return this.client.raw(`@reply-parent-msg-id=${tags.id} PRIVMSG ${channel} :${replyText}`);
      // return this.client.say(channel, `@${tags.username} ${replyText}`);
    };
    return this.handleCommand(login, messageReply, log, tags, parsedCommand.name, parsedCommand.params);
  }

  private getUsername(tags: ChatUserstate): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Let's hope this is always available
    return tags.username!;
  }

  private getDisplayName(tags: ChatUserstate) {
    return tags['display-name'];
  }

  private isStreamer(login: string, tags: ChatUserstate) {
    return this.getUsername(tags) === login;
  }

  private isMod(login: string, tags: ChatUserstate) {
    return tags.mod === true || this.isStreamer(login, tags);
  }

  private getPronounManager(log: Logger) {
    return new PronounManager(this.deps.redisManager, log);
  }

  private async handleChatMessage(login: string, message: string, log: Logger, inputTags: ChatUserstate): Promise<unknown> {
    if (inputTags['message-type'] !== 'chat' || message.startsWith('!')) return;

    const username = this.getUsername(inputTags);
    switch (username) {
      case 'kofistreambot': {
        const donationMatch = message.match(/^Thank you for your support, ([^!]+)!$/);
        if (donationMatch) {
          this.deps.websocketManager.sendToRoom(login, WebsocketMessageType.donation, { from: donationMatch[1] });
          return;
        }
        break;
      }
    }

    const displayName = this.getDisplayName(inputTags);
    const tags = await this.getEnhancedTags(username, inputTags);
    const pronouns = await this.getPronounManager(log).getPronoun(username);
    this.deps.websocketManager.sendToRoom(login, WebsocketMessageType.chat, {
      name: displayName || username,
      message,
      pronouns,
      tags,
    });
  }

  private async getEnhancedTags(username: string, tags: ChatUserstate): Promise<ChatUserstate> {
    // define constant with defaults
    const finalTags: ChatUserstate = {
      ...tags,
    };

    const { rows } = await chatSettingsTable.selectChatSetting(this.db, username);
    if (rows.length === 1) {
      const [userSettings] = rows;
      if (userSettings.name_color) {
        finalTags.color = `#${userSettings.name_color}`;
      }
    }

    return finalTags;
  }

  private async handleCommand(login: string, reply: MessageReply, log: Logger, tags: ChatUserstate, name: CommandName, params?: string): Promise<unknown> {
    const username = this.getUsername(tags);
    switch (name) {
      case CommandName.chat: {
        const validSettingNames = tables.chat_settings.columns.filter(v => v !== tables.chat_settings.primaryKey);
        if (!params) {
          return reply(`Please provide a setting name (${validSettingNames.join(', ')}) and a value, separated by a space`);
        }
        const isValidSettingName = (inputSetting: string): inputSetting is Exclude<keyof ChatSettings, typeof tables.chat_settings.primaryKey> => validSettingNames.includes(inputSetting as keyof ChatSettings);

        const currentSettings = await chatSettingsTable.selectChatSetting(this.db, username).then(({ rows }) => rows[0]);

        const resetMatch = params.match(/^reset(?:\s*([_a-z]+))?$/);
        if (resetMatch) {
          if (!currentSettings) {
            return reply('You do not have any saved chat overlay settings');
          }

          // Reset a specific setting
          const resetSetting = resetMatch[1];
          if (resetSetting) {
            if (!isValidSettingName(resetSetting)) {
              return reply(`Cannot reset unknown setting ${resetSetting}`);
            }

            try {
              await chatSettingsTable.updateChatSetting(this.db, username, resetSetting, null);
            } catch {
              log('error', `Failed to reset setting ${resetSetting} for username ${username}`);
              return reply(`Could not reset setting ${resetSetting} in the database`);
            }
            return reply(`Chat overlay setting ${resetSetting} reset to default`, true);
          }

          // Reset all settings
          try {
            await chatSettingsTable.deleteChatSetting(this.db, username);
          } catch {
            log('error', `Failed to delete settings for username ${username}`);
            return reply('Could not remove settings from database');
          }
          return reply('Chat overlay settings reset to defaults', true);
        }

        const matches = params.match(/^([_a-z]+)\s*("?)(.*)\2$/i);
        if (!matches) {
          return reply('Please provide a setting name, followed by a space and the value');
        }

        const [, settingName, , settingValue] = matches;
        if (!isValidSettingName(settingName)) {
          return reply(`Cannot change unknown setting ${settingName}`);
        }

        const chatSettings: ChatSettingsInput = { login: username };
        switch (settingName) {
          case 'name_color': {
            const colorMatch = settingValue.trim().match(/^#?([\da-f]{6})$/i);
            if (!colorMatch) {
              return reply('This setting expects a HEX color value, for example: #abc123');
            }
            chatSettings[settingName] = colorMatch[1];
            break;
          }
          default: {
            return reply('This setting cannot be changed via commands', true);
          }
        }

        try {
          await (currentSettings ? chatSettingsTable.updateChatSetting(this.db, username, settingName, chatSettings[settingName] ?? null) : chatSettingsTable.createChatSetting(this.db, chatSettings));
        } catch (error) {
          log('error', `Failed to save settings ${JSON.stringify(chatSettings)}: ${getExceptionMessage(error)}`);
          return reply('Could not save settings in database');
        }

        return reply(`Chat overlay settings updated, to clear use !chat reset ${settingName}`, true);
      }
      case CommandName.pronouns: {
        const pronounManager = this.getPronounManager(log);
        let targetUser: string;
        if (params) {
          const usernameMatch = params.trim().match(/^@?(\w{1,25})$/i);
          if (!usernameMatch) {
            return reply('Please provide a valid username (or no parameters for the streamer\'s pronouns)');
          }
          targetUser = usernameMatch[1];
        } else {
          targetUser = login;
        }
        let pronouns = null;
        try {
          pronouns = await pronounManager.getPronoun(targetUser);
        } catch {
          return reply('Could not retrieve streamer\'s pronouns');
        }

        if (pronouns === null) {
          if (targetUser === login && this.isStreamer(targetUser, tags)) {
            return reply(`You don't seem to have your pronouns set, visit ${PronounManager.serviceUrl} to change it (updates in ~5 minutes)`, true);
          }

          return reply(`Seems like ${targetUser} hasn't set their pronouns`, true);
        }

        return reply(`${targetUser} uses ${pronouns} pronouns`, true);
      }
      case CommandName.category:
      case CommandName.game: {
        if (!this.isMod(username, tags)) {
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
      default: {
        throw new Error(`Unhandled command ${name}`);
      }
    }
  }
}
