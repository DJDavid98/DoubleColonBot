import { TwitchEventSubBanNotificationMessageEventData } from '../model/twicth-event-sub';

export const getTimeoutDurationInSeconds = (data: Pick<TwitchEventSubBanNotificationMessageEventData, 'banned_at' | 'ends_at'>): number | undefined => {
  if (data.ends_at === null) return undefined;

  const startDate = new Date(data.banned_at);
  const endDate = new Date(data.ends_at);

  return Math.round((endDate.getTime() - startDate.getTime()) / 1e3);
};
