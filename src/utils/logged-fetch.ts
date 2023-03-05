import { Logger } from '../model/logger';

/**
 * Wrapper around the built-in fetch function that logs the request URL and init options
 */
export const loggedFetch = (logger: Logger, url: string, init: RequestInit) => {
  const { method, ...restInit } = init;
  logger.debug(`[fetch] ${method ?? 'GET'} ${url} ${JSON.stringify(restInit, (key, value) => value instanceof URLSearchParams ? value.toString() : value)}`);
  return fetch(url, init);
};
