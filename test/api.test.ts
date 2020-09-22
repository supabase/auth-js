import { Api } from '../src/index'

const GOTRUE_URL = 'http://localhost:9999'

const admin = new Api({
  url: GOTRUE_URL,
})

test('settings() should return the current GoTrue config', async () => {
  let config = await admin.settings()
  expect(config).toMatchSnapshot()
})
