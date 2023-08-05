import { Client } from 'pg';
import { TableTypes, Users, UsersInput } from './database-schema';
import { runInsertQuery } from './common';

export type ChannelInfo = Pick<TableTypes['users']['select'], 'login' | 'id' | 'scope'>;

export interface UserTokenInfo {
  id: string,
  access_token: string,
  expires: Date
}

export const usersTable = {
  selectUser: (db: Client, login: Users['login']) =>
    db.query<TableTypes['users']['select']>('SELECT * FROM users WHERE login = $1', [login]),
  selectUserTokenInfo: (db: Client, login: Users['login']) =>
    db.query<Pick<TableTypes['users']['select'], 'id' | 'access_token' | 'expires'>>(
      'SELECT id, access_token, expires FROM users WHERE login = $1',
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
    db.query<ChannelInfo>('SELECT login, id, scope FROM users'),
  selectRefreshToken: (db: Client, access_token: string) =>
    db.query<Pick<TableTypes['users']['select'], 'refresh_token'>>(
      'SELECT refresh_token FROM users WHERE access_token = $1',
      [access_token],
    ),
};
