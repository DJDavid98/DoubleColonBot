import Joi, { ValidationResult } from 'joi';

export interface AuthorizationCode {
  code: string;
  scope: string;
  state: string;
}

const authorizationCodeSchema = Joi.object<AuthorizationCode>({
  code: Joi.string().required(),
  scope: Joi.string().required(),
  state: Joi.string().required(),
});

export const validateAuthorizationCode = (params: unknown): ValidationResult<AuthorizationCode> =>
  authorizationCodeSchema.validate(params, { stripUnknown: true });
