import { Logger } from '../model/logger';

const sanitizeInitBeforeLog = (init: RequestInit): RequestInit => {
  const clonedInit = structuredClone(init);
  if (typeof clonedInit.headers === 'object' && 'authorization' in clonedInit.headers) {
    clonedInit.headers.authorization = clonedInit.headers.authorization.replace(/^([a-z]+ )(.*)$/i, (_, prefix, token) => {
      return prefix + '*'.repeat(token.length);
    });
  }
  return clonedInit;
};

/**
 * Wrapper around the built-in fetch function that logs the request URL and init options
 */
export const loggedFetch = (logger: Logger, url: string, init: RequestInit) => {
  const { method, ...restInit } = sanitizeInitBeforeLog(init);
  logger.debug(`[fetch] ${method ?? 'GET'} ${url} ${JSON.stringify(restInit, (key, value) => value instanceof URLSearchParams ? value.toString() : value)}`);
  return fetch(url, init);
};
