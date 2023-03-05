import { Client } from 'pg';
import { usersTable } from '../database/users-table';
import { Logger } from '../model/logger';

export type ChannelsUpdateListener = (channels: string[]) => unknown;

export class ChannelManager {
  private channelList: string[];

  private readonly updateListeners: Set<ChannelsUpdateListener>;

  constructor(private db: Client) {
    this.channelList = [];
    this.updateListeners = new Set();
  }

  addListener(listener: ChannelsUpdateListener) {
    this.updateListeners.add(listener);
  }

  removeListener(listener: ChannelsUpdateListener) {
    this.updateListeners.delete(listener);
  }

  async updateChannels(logger: Logger) {
    logger.info('Updating chanel list…');
    const channelRows = await usersTable.selectLogins(this.db);
    this.channelList = channelRows.rows.map(({ login }) => login);
    logger.debug(`channelList: ${JSON.stringify(this.channelList)}`);
    logger.info('Chanel list updated, notifying listeners…');
    for (const listener of this.updateListeners) {
      listener(this.channelList);
    }
  }
}
