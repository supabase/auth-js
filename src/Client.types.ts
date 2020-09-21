export interface ClientConfig {
  headers?: {
    [key: string]: string
  }
}

/**
 * Available signup options. (More coming soon, like mobile..)
 */
export enum CredentialsType {
  email = 'EMAIL',
}

export interface Subscription {
  id: string
  callback: Function
  /** Removes the callback function */
  unsubscribe: Function
}

export interface UserCredentials {
  type: CredentialsType
  email?: string
  password?: string
}

export enum UserEvents {
  /** Triggered when a user signs up */
  SIGN_UP = 'SIGN_UP',
  /** Triggered when a user logs in */
  SIGN_IN = 'SIGN_IN',
  /** Triggered when a user logs out */
  SIGN_OUT = 'SIGN_OUT',
}
