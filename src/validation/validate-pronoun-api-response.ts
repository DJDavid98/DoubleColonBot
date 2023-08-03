import Joi, { ValidationResult } from 'joi';

export type UserPronounApiResponse = [{
  id: string;
  login: string;
  pronoun_id: string;
}];

const userPronounsSchema = Joi.array<UserPronounApiResponse>().items({
  id: Joi.string().required(),
  login: Joi.string().required(),
  pronoun_id: Joi.string().required(),
});

export const validateUserPronounApiResponse = (params: unknown): ValidationResult<UserPronounApiResponse> =>
  userPronounsSchema.validate(params, { stripUnknown: true });


export type PronounsApiResponse = Array<{
  name: string;
  display: string;
}>;

const pronounsSchema = Joi.array<PronounsApiResponse>().items({
  name: Joi.string().required(),
  display: Joi.string().required(),
}).min(1);

export const validatePronounsApiResponse = (params: unknown): ValidationResult<PronounsApiResponse> =>
  pronounsSchema.validate(params, { stripUnknown: true });
