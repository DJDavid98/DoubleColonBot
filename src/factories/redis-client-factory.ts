import Redis from 'ioredis';
import { env } from '../constants/env';
import { LoggerFunction } from '../model/logger';

export const redisClientFactory = async (log: LoggerFunction): Promise<Redis> => {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, keyPrefix: env.REDIS_PREFIX });

  redis.on('connect', () => {
    log('info', '[Redis] Connected');
  });
  redis.on('close', () => {
    log('info', '[Redis] Disconnected');
  });

  return redis.connect().then(() => redis);
};
