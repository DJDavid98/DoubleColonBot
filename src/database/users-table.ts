import { Client } from 'pg';
import { TableTypes, Users, UsersInput } from './database-schema';
import { runInsertQuery } from './common';

export const usersTable = {
  selectUser: (db: Client, login: Users['login']) =>
    db.query<TableTypes['users']['select']>('SELECT * FROM users WHERE login = $1', [login]),
  selectUserAccessToken: (db: Client, login: Users['login']) =>
    db.query<Pick<TableTypes['users']['select'], 'access_token' | 'expires'>>(
      'SELECT access_token, expires FROM users WHERE login = $1',
      [login],
    ),
  createUser: (db: Client, params: UsersInput) =>
    runInsertQuery(db, 'users', params, [
      'access_token',
      'refresh_token',
      'expires',
      'scope',
      'display_name',
      'login',
    ]),
  selectLogins: (db: Client) =>
    db.query<Pick<TableTypes['users']['select'], 'login'>>('SELECT login FROM users'),
  selectRefreshToken: (db: Client, access_token: string) =>
    db.query<Pick<TableTypes['users']['select'], 'refresh_token'>>(
      'SELECT refresh_token FROM users WHERE access_token = $1',
      [access_token],
    ),
};
