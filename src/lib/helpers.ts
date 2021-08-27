import {Session} from "./types";

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

export function clearGotrueHashParameters(session: Session) {
  window.location.hash = removeHashStartingWithAnyOf(window.location.hash, Object.keys(session));
}

export function removeParamsFromUrl(url: string, params: string[]) {
  let result = url;
  params.forEach(param => {
    const regexp = new RegExp("(&|#|\\?)" + param + "((\\=.*?(?=&|$))|(?=&|#))", "i");
    result = result.replace(regexp, '');
  });
  return result;
}

export function removeHashStartingWith(url: string, hashStart: string) {
  if(hashStart && hashStart.trim().length) {
    const regexp = new RegExp("#" + hashStart + ".*$", "i");
    return url.replace(regexp, '');
  }
  return url;
}

export function removeHashStartingWithAnyOf(url: string, starts: string[]) {
  let shortestUrl = url;
  if(starts && starts.length) {
    for(let start in starts) {
      const newUrl = removeHashStartingWith(url, starts[start]);
      if(shortestUrl.length > newUrl.length) {
        shortestUrl = newUrl;
      }
    }
  }
  return shortestUrl;
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
