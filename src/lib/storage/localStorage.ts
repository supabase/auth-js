type LocalStorageOptions = {
  key: string
}

export interface CustomStorage {
  /** The key used for saving the session */
  readonly key: string
  /** Returns the current session */
  getItem(): string | null
  /** Sets the current session */
  setItem(value: string): void
  /** Removes the current session */
  removeItem(): void
}

export class LocalStorage implements CustomStorage {
  readonly key: string
  protected storage: Storage
  constructor(options: LocalStorageOptions) {
    this.key = options.key
    this.storage = globalThis.localStorage
  }

  getItem(): string | null {
    return this.storage.getItem(this.key)
  }

  setItem(value: string) {
    return this.storage.setItem(this.key, value)
  }

  removeItem(): void {
    return this.storage.removeItem(this.key)
  }
}
