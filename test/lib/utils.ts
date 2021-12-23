import faker from 'faker'
import jwt from 'jsonwebtoken'

import { serviceRoleApiClient } from './clients'

import { GOTRUE_JWT_SECRET } from './clients'

import type { Session } from '../../src'

export const mockAccessToken = () => {
  return jwt.sign(
    {
      sub: '1234567890',
      role: 'anon_key',
    },
    GOTRUE_JWT_SECRET
  )
}

type Credentials = {
  email?: string | undefined
  phone?: string | undefined
  password?: string | undefined
}

export const mockUserCredentials = (
  options?: Credentials
): { email: string; phone: string; password: string } => {
  const randNumbers = Date.now().toString()

  return {
    email: options?.email || faker.internet.email().toLowerCase(),
    phone: options?.phone || `1${randNumbers.substring(randNumbers.length - 12, 11)}`,
    password: options?.password || faker.internet.password(),
  }
}

export const mockUserMetadata = () => {
  return {
    profile_image: faker.image.avatar(),
  }
}

export const mockAppMetadata = () => {
  return {
    roles: ['editor', 'publisher'],
  }
}

export const createNewUserWithEmail = async ({
  email,
  password,
}: {
  email: string | undefined
  password?: string | undefined
}) => {
  const { email: newEmail, password: newPassword } = mockUserCredentials({
    email,
    password,
  })
  return await serviceRoleApiClient.createUser({
    email: newEmail,
    password: newPassword,
    data: {},
  })
}

export const mockCookieRequest = ({
  event,
  session,
  method = 'POST',
}: {
  event?: string
  session?: Session | null
  method?: string
}) => {
  return {
    method,
    headers: { host: 'localhost:9999' },
    body: { event, session },
  }
}

export const mockCookieResponse = () => {
  return {
    getHeader: jest.fn(() => undefined),
    setHeader: jest.fn(),
    status: jest.fn(() => {
      return { json: jest.fn(), end: jest.fn() }
    }),
  }
}
