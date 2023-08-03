import { WebsocketMessageType } from '../constants/webocket-message-type';
import { ChatUserstate } from 'tmi.js';

interface BaseWebsocketMessage {
  type: WebsocketMessageType;
}

export interface ChatWebsocketMessage extends BaseWebsocketMessage {
  type: 'chat';
  name: string;
  message: string;
  pronouns: string | null;
  tags: ChatUserstate;
}

export interface ClearChatWebsocketMessage {
  type: 'clearChat';
}

export type WebsocketMessage = ChatWebsocketMessage | ClearChatWebsocketMessage;
