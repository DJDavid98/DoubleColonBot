import { config } from 'dotenv';

config();

const {
  PORT,
  HOST,
  NODE_ENV,
  PUBLIC_DOMAIN,
  TWITCH_LOGIN,
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  DATABASE_URL,
} = process.env;

/**
 * Type-safe process.env
 */
export const env = (() => {
  const values = {
    PORT: typeof PORT === 'string' ? Number.parseInt(PORT, 10) : undefined,
    HOST,
    NODE_ENV,
    PUBLIC_DOMAIN,
    TWITCH_LOGIN,
    TWITCH_CLIENT_ID,
    TWITCH_CLIENT_SECRET,
    DATABASE_URL,
  };

  type Values = typeof values;

  for (const key of Object.keys(values)) {
    if (values[key as keyof Values] !== undefined) continue;

    throw new Error(`${key} environment variable not set`);
  }

  return values as { [Key in keyof Values]: Exclude<Values[Key], undefined> };
})();
