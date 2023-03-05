import { expressPaths } from '../constants/express-paths';

export const getRedirectUri = (publicHost: string) => publicHost + expressPaths.getRedirectTarget();
