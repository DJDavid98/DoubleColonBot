import {
  TwitchEventSubMessage,
  TwitchEventSubMessageType,
  TwitchEventSubSubscription,
} from '../model/twicth-event-sub';
import typia from 'typia';

export const validateTwitchEventSubMessage = typia.createValidate<TwitchEventSubMessage>();

export const isValidTwitchEventSubMessageType = typia.createIs<TwitchEventSubMessageType>();

export const isValidateTwitchEventSubSubscription = typia.createIs<TwitchEventSubSubscription>();
