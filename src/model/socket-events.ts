import { ChatUserstate } from 'tmi.js';

export interface ClientToServerEvents {
  joinRoom: (room: string) => void;
}

export interface ServerToClientEvents {
  chat: (message: ChatWebsocketMessage) => void;
  clearChat: () => void;
  follow: () => void;
  donation: (message: DonationWebsocketMessage) => void;
  joinedRoom: (room: string) => void;
}

export interface DonationWebsocketMessage {
  from: string;
}

export interface ChatWebsocketMessage {
  name: string;
  message: string;
  pronouns: string[];
  tags: ChatUserstate;
}
