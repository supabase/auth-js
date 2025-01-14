import GoTrueClient from './GoTrueClient'

const AuthClient = (options) => {
  return new GoTrueClient({
    ...options,
    throwOnError: options.throwOnError || false,
  })
}

export default AuthClient
