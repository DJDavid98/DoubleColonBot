export class DeferredPromise<T> {
  private resolve!: (value: T) => void;

  private readonly internalPromise: Promise<T>;

  constructor() {
    this.internalPromise = new Promise<T>((resolve) => {
      this.resolve = resolve;
    });
  }

  public get promise(): Promise<T> {
    return this.internalPromise;
  }

  public setValue(value: T) {
    this.resolve(value);
  }
}
