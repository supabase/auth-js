import { Client } from '../src/index'
const faker = require('faker')

const GOTRUE_URL = 'http://localhost:3000'

const auth = new Client({
  url: GOTRUE_URL,
  autoRefreshToken: false,
  persistSession: true,
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

test('Update user', async () => {
  let user = await auth.update({ data: { hello: 'world' }, password: 'lolz' })

  expect(user).toMatchSnapshot()
})

test('Get user after updating', async () => {
  let user = await auth.user()

  expect(user).toMatchSnapshot()
})

test('signOut', async () => {
  let user = await auth.signOut()

  expect(user).toMatchSnapshot()
})

test('Get user after logging out', async () => {
  let user = await auth.user()

  expect(user).toMatchSnapshot()
})