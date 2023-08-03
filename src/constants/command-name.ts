import { IdentityMap, identityMap } from '../utils/identity-map';

export const CommandName = identityMap(['game', 'category', 'chat', 'pronouns']);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type CommandName = IdentityMap<typeof CommandName>;


export const isKnownCommand = (name?: string): name is CommandName => typeof name === 'string' && name in CommandName;
