export function expiresAt(expiresIn: number) {
  const timeNow = Math.round(Date.now() / 1000)
  return timeNow + expiresIn
}

export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const isBrowser = () => typeof window !== 'undefined'

export function getParameterByName(name: string, url?: string) {
  if (!url) url = window.location.href
  name = name.replace(/[\[\]]/g, '\\$&')
  var regex = new RegExp('[?&#]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

// #107 Only remove Gotrue parameters from url hash.
export function clearGotrueHashParameters() {
  window.location.hash = removeParamsFromUrl(window.location.hash, [
    'error_description',
    'provider_token',
    'access_token',
    'expires_in',
    'refresh_token',
    'token_type'
  ]);
}

export function removeParamsFromUrl(url: string, params: string[]) {
  let result = url;
  params.forEach(param => {
    const regexp = new RegExp("(&|#|\\?)" + param + "((\\=.*?(?=&|$))|(?=&|#))");
    result = result.replace(regexp, '');
  });
  return result;
}

export class LocalStorage implements Storage {
  localStorage: Storage;
  [name: string]: any
  length!: number
  constructor(localStorage: Storage) {
    this.localStorage = localStorage || globalThis.localStorage
  }
  clear(): void {
    return this.localStorage.clear()
  }
  key(index: number): string | null {
    return this.localStorage.key(index)
  }
  setItem(key: string, value: any): void {
    return this.localStorage.setItem(key, value)
  }
  getItem(key: string): string | null {
    return this.localStorage.getItem(key)
  }
  removeItem(key: string): void {
    return this.localStorage.removeItem(key)
  }
}
