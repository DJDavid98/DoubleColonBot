import { ChatUserstate } from 'tmi.js';

export interface ServerToClientEvents {
  chat: (message: ChatWebsocketMessage) => void;
  clearChat: () => void;
}

export interface ChatWebsocketMessage {
  name: string;
  message: string;
  pronouns: string | null;
  tags: ChatUserstate;
}
