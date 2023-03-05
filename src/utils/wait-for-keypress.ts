// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import keypress from 'keypress';

interface KeypressEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  sequence: string;
}

export const waitForKeyPress = (): Promise<KeypressEvent> => new Promise((res) => {
  keypress(process.stdin);
  process.stdin.setRawMode(true);

  process.stdin.once('keypress', (ch, eventData: KeypressEvent) => {
    res(eventData);
  });
});
