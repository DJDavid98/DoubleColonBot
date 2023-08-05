import { Client } from 'pg';
import { ChannelInfo, usersTable } from '../database/users-table';
import { Logger } from '../model/logger';
import { AppEventListener, AppEventManager } from './app-event-manager';

export type ChannelUpdatePayload = Array<ChannelInfo>;
export type ChannelsUpdateListener = AppEventListener<ChannelUpdatePayload>;

export class ChannelManager {
  private channelList: ChannelUpdatePayload;

  private readonly channelUpdateEventManager: AppEventManager<ChannelUpdatePayload>;

  constructor(private db: Client, private logger: Logger) {
    this.channelList = [];
    this.channelUpdateEventManager = new AppEventManager();
  }

  addListener(listener: ChannelsUpdateListener) {
    this.channelUpdateEventManager.addListener(listener);
    this.logger.debug('[ChannelManager] Registered a channel update event listener');
  }

  async updateChannels(logger: Logger) {
    logger.info('[ChannelManager] Updating chanel list…');
    const channelRows = await usersTable.selectLogins(this.db);
    this.channelList = channelRows.rows;
    logger.info('[ChannelManager] Chanel list updated, notifying listeners…');
    this.channelUpdateEventManager.fireEvent(this.channelList);
  }
}
