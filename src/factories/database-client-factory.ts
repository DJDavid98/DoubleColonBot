import pg, { Client } from 'pg';
import { env } from '../constants/env';
import { Logger } from '../model/logger';

export const databaseClientFactory = async (logger: Logger): Promise<Client> => new Promise((res, rej) => {
  const db = new pg.Client(env.DATABASE_URL);

  db.connect(err => {
    if (err !== null) {
      logger.error('[Database] Connection failed');
      console.error(err);
      rej();
      return;
    }

    logger.info('[Database] Connection successful');
    res(db);
  });

  db.on('error', err => {
    const fatal = 'fatal' in err;
    logger.error(`[Database] Error (fatal:${fatal})`);
    console.error(err);
    if (fatal) process.exit();
  });

  process.on('exit', () => {
    logger.info('[Database] Process exiting, closing connection…');
    db
      .end()
      .then(() => logger.info('[Database] Disconnected'))
      .catch((error) => {
        logger.error('[Database] error during disconnection');
        logger.error(error);
      });
  });
});
