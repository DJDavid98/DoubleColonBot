export const calculateExpectedChannelsDiff = (newChannels: string[], currentChannels: string[]) => {
  const newChannelsSet = new Set(newChannels);
  const currentChannelsSet = new Set(currentChannels);

  const joinChannels = newChannels.filter(newChannel => !currentChannelsSet.has(newChannel));
  const partChannels = currentChannels.filter(currentChannel => !newChannelsSet.has(currentChannel));

  return {
    joinChannels,
    partChannels,
  };
};
