import { Client } from '../src/index'
const faker = require('faker')


const GOTRUE_URL = 'http://localhost:9999'
const auth = new Client({
  url: GOTRUE_URL,
})

const email = faker.internet.email()
const password = 'secret'

test('signUp()', async () => {
  let user = await auth.signUp({
    email,
    password,
  })
  expect(user).toMatchSnapshot()
})


test('signIn()', async () => {
  let user = await auth.signIn({
    email,
    password,
  })
  expect(user).toMatchSnapshot()
})

test('Get user', async () => {
  let user = await auth.user()

  expect(user).toMatchSnapshot()
})
