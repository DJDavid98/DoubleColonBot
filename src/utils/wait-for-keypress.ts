// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import keypress from 'keypress';
import { reject } from 'lodash';

interface KeypressEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
}

export const waitForKeyPress = (): Promise<KeypressEvent> => new Promise((res) => {
  if (!process.stdin.isTTY) {
    reject(new Error('Can\'t wait for keypress in a non-interactive terminal'));
    return;
  }

  keypress(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.once('keypress', (ch, eventData: KeypressEvent) => {
    res(eventData);
  });
});
