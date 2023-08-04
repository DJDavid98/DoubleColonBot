import { IdentityMap, identityMap } from '../utils/identity-map';

export const WebsocketMessageType = identityMap(['chat', 'clearChat', 'follow', 'donation']);
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type WebsocketMessageType = IdentityMap<typeof WebsocketMessageType>;
