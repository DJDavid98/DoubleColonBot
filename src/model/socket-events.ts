import { ChatUserstate } from 'tmi.js';

export interface ClientToServerEvents {
  joinRoom: (room: string) => void;
}

export interface ServerToClientEvents {
  chat: (message: ChatWebsocketMessage) => void;
  clearChat: () => void;
  follow: (message: FollowWebsocketMessage) => void;
  donation: (message: DonationWebsocketMessage) => void;
  joinedRoom: (room: string) => void;
  ban: (message: BanWebsocketMessage) => void;
  messageDeleted: (message: MessageDeletedWebsocketMessage) => void;
}

export interface FollowWebsocketMessage {
  total?: number;
}

export interface DonationWebsocketMessage {
  from: string;
}

export interface ChatWebsocketMessage {
  name: string;
  username: string;
  message: string;
  pronouns: string[];
  tags: ChatUserstate;
}

export interface BanWebsocketMessage {
  username: string;
  /**
   * Optional details, only if the channel broadcaster is also authenticated with the bot
   */
  detail?: {
    bannedBy?: string;
    reason: string;
    timeout?: number;
  };
}

export interface MessageDeletedWebsocketMessage {
  id: string;
}
