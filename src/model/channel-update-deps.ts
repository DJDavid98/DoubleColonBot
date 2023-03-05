export interface ChannelUpdateDeps {
  updateChannels: string;
  onChannelsUpdated: (handler: (channels: string[]) => unknown) => void;
}
