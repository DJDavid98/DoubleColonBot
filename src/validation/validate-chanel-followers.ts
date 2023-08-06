import Joi from 'joi';

/**
 * Channel followers response body
 * @see https://dev.twitch.tv/docs/api/reference/#get-channel-followers
 */
export interface ChannelFollowers {
  total: number;
}

const schema = Joi.object<ChannelFollowers>({
  total: Joi.number().required(),
});

export const validateChannelFollowers = (data: unknown) => schema.validate(data, { stripUnknown: true });
