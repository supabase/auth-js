import { AuthError, CodeChallengeMethod, GoTrueAdminApi, isAuthError } from '../src'

describe('GoTrueAdminAPI', () => {
  describe('issueAuthCode', () => {
    test('returns data on success', async () => {
      const mockRequest = jest.fn(async () => {
        return {
          data: {
            authCode: '123456',
          },
          error: null,
        }
      })

      const adminClient = new GoTrueAdminApi({
        url: 'https://test.com',
      })

      const payload = {
        userID: 'abc123',
        codeChallengeMethod: 's256' as CodeChallengeMethod,
        codeChallenge: 'some-code-challenge',
      }

      // @ts-expect-error -- Expected 1 arguments, but got 2
      const response = await adminClient.issueAuthCode(payload, mockRequest)

      expect(mockRequest).toHaveBeenCalledWith(
        // @ts-expect-error -- fetch is protected
        adminClient.fetch,
        'POST',
        'https://test.com/admin/authcode',
        {
          // @ts-expect-error -- headers is protected
          headers: adminClient.headers,
          body: {
            user_id: payload.userID,
            code_challenge_method: payload.codeChallengeMethod,
            code_challenge: payload.codeChallenge,
          },
        }
      )

      expect(response).toEqual({
        data: {
          authCode: '123456',
        },
        error: null,
      })
    })

    test('returns { data: null, error } if an AuthError is thrown', async () => {
      const authErr = new AuthError('Auth error for testing')
      const mockRequest = jest.fn(async () => {
        throw authErr
      })

      const adminClient = new GoTrueAdminApi({
        url: 'https://test.com',
      })

      const payload = {
        userID: 'abc123',
        codeChallengeMethod: 'S256' as CodeChallengeMethod,
        codeChallenge: 'some-code-challenge',
      }

      // @ts-expect-error -- Expected 1 arguments, but got 2
      const response = await adminClient.issueAuthCode(payload, mockRequest)

      expect(response).toEqual({
        data: null,
        error: authErr,
      })
      expect(isAuthError(response.error)).toBe(true)
    })

    test('rethrows if a non-AuthError is encountered', async () => {
      const genericError = new Error('Some non-auth error')
      const mockRequest = jest.fn(async () => {
        throw genericError
      })

      const adminClient = new GoTrueAdminApi({
        url: 'https://test.com',
      })

      const payload = {
        userID: 'abc123',
        codeChallengeMethod: 'S256' as CodeChallengeMethod,
        codeChallenge: 'some-code-challenge',
      }

      // @ts-expect-error -- Expected 1 arguments, but got 2
      await expect(adminClient.issueAuthCode(payload, mockRequest)).rejects.toThrow(genericError)
    })
  })
})
