import { expressPaths } from '../constants/express-paths';

export const getAuthStartUrl = (publicHost: string) => publicHost + expressPaths.getAuthStart();
