import { Express } from 'express';
import { expressPaths } from '../constants/express-paths';
import { AppHandlerDependencies } from '../model/app-handler-dependencies';
import { redirectTargetHandler } from '../handlers/redirect-target-handler';
import { authStartHandler } from '../handlers/auth-start-handler';

export const registerAppHandlers = (app: Express, deps: AppHandlerDependencies) => {
  app.get(expressPaths.getRedirectTarget(), redirectTargetHandler(deps));

  app.get(expressPaths.getAuthStart(), authStartHandler(deps));
};
