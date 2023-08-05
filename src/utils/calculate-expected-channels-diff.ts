import { ChannelInfo } from '../database/users-table';

export const calculateExpectedChannelsDiff = (newChannels: Array<ChannelInfo>, currentChannels: string[]) => {
  const newChannelsSet = new Set(newChannels.map(({ login }) => login));
  const currentChannelsSet = new Set(currentChannels);

  const joinChannels = newChannels.filter(newChannel => !currentChannelsSet.has(newChannel.login));
  const partChannels = currentChannels.filter(currentChannel => !newChannelsSet.has(currentChannel));

  return {
    joinChannels,
    partChannels,
  };
};
