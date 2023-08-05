export type AppEventListener<EventPayload> = (...data: EventPayload extends never ? [] : [EventPayload]) => void;

export class AppEventManager<EventPayload> {
  private readonly listeners: Set<AppEventListener<EventPayload>>;

  constructor() {
    this.listeners = new Set();
  }

  addListener(listener: AppEventListener<EventPayload>) {
    this.listeners.add(listener);
  }

  removeListener(listener: AppEventListener<EventPayload>) {
    this.listeners.delete(listener);
  }

  fireEvent(...data: EventPayload extends never ? [] : [EventPayload]) {
    for (const listener of this.listeners) {
      listener(...data);
    }
  }
}
