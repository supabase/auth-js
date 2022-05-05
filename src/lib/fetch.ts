import { NETWORK_FAILURE } from './constants'

export type Fetch = typeof fetch

export interface FetchOptions {
  headers?: {
    [key: string]: string
  }
  noResolveJson?: boolean
}

export type RequestMethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const _getRequestParams = (method: RequestMethodType, options?: FetchOptions, body?: object) => {
  const params: { [k: string]: any } = { method, headers: options?.headers || {} }

  if (method === 'GET') {
    return params
  }

  params.headers = { 'Content-Type': 'text/plain;charset=UTF-8', ...options?.headers }
  params.body = JSON.stringify(body)

  return params
}

async function _handleRequest(
  fetcher: Fetch,
  method: RequestMethodType,
  url: string,
  options?: FetchOptions,
  body?: object
): Promise<any> {
  return new Promise((resolve, reject) => {
    fetcher(url, _getRequestParams(method, options, body))
      .then((result) => {
        if (!result.ok) throw result
        if (options?.noResolveJson) return resolve
        return result.json()
      })
      .then((data) => resolve(data))
      .catch(() =>
        reject({
          message: NETWORK_FAILURE,
          status: null,
        })
      )
  })
}

export async function get(fetcher: Fetch, url: string, options?: FetchOptions): Promise<any> {
  return _handleRequest(fetcher, 'GET', url, options)
}

export async function post(
  fetcher: Fetch,
  url: string,
  body: object,
  options?: FetchOptions
): Promise<any> {
  return _handleRequest(fetcher, 'POST', url, options, body)
}

export async function put(
  fetcher: Fetch,
  url: string,
  body: object,
  options?: FetchOptions
): Promise<any> {
  return _handleRequest(fetcher, 'PUT', url, options, body)
}

export async function remove(
  fetcher: Fetch,
  url: string,
  body: object,
  options?: FetchOptions
): Promise<any> {
  return _handleRequest(fetcher, 'DELETE', url, options, body)
}
