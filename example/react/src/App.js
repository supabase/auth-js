import React, { useEffect, useState } from 'react'
import { GoTrueClient } from '@supabase/gotrue-js'
import './tailwind.output.css'

const GOTRUE_URL_AUTOCONFIRM = 'http://localhost:9999'

const auth = new GoTrueClient({
  url: GOTRUE_URL_AUTOCONFIRM,
})

function App() {
  /**
   * Mfa states
   */
  let [enabled, setEnabled] = useState(false)
  let [enrollData, setEnroll] = useState(null)
  let [challengeData, setChallenge] = useState(null)
  let [totp, setTotpCode] = useState('')
  let [isTotpVerified, setVerify] = useState(false)
  let [factors, setFactors] = useState([])

  /**
   * Other states
   */
  let [session, setSession] = useState()
  let [email, setEmail] = useState(localStorage.getItem('email') ?? '')
  let [phone, setPhone] = useState(localStorage.getItem('phone') ?? '')
  let [password, setPassword] = useState('')
  let [otp, setOtp] = useState('')
  let [rememberMe, setRememberMe] = useState(false)

  // Keep the session up to date
  auth.onAuthStateChange((_event, session) => {
    setSession(session)
  })

  useEffect(() => {
    async function session() {
      const { data, error } = await auth.getSession()
      if (error | !data) {
        setSession('')
      } else {
        setSession(data.session)
      }
    }
    session()
  }, [])

  useEffect(() => {
    async function showMfaDevices() {
      const {
        data: { factors: currentFactors },
        error,
      } = await auth.mfa.listFactors()
      if (error) console.log(error)
      setFactors([...currentFactors])
      currentFactors.forEach((factor) => {
        if (factor.status === 'verified') {
          document.getElementById('enroll').checked = true
          document.getElementById('enroll').disabled = true
        }
      })
    }
    showMfaDevices()
  }, [enrollData, isTotpVerified])

  /**
   * MFA
   */
  async function handleEnrollMfa(e) {
    if (!e) {
      let params = {
        factorType: 'totp',
        issuer: 'supabase.com',
      }
      let { data, error } = await auth.mfa.enroll(params)
      if (error) {
        alert(error.message)
      }
      if (data) {
        setEnabled(!e)
        setEnroll({
          factor_id: data.id,
          qr: data.TOTP.qr_code,
          secret: data.TOTP.secret,
          uri: data.TOTP.uri,
          type: data.type,
        })

        let challengeParams = {
          factorId: data.id,
        }
        let { data: challenge, error: challengeError } = await auth.mfa.challenge(challengeParams)
        if (challengeError) {
          console.log(challengeError)
        }
        setChallenge({
          challenge_id: challenge.id,
          expires_at: challenge.expires_at,
        })
      }
    } else {
      let params = {
        factorId: enrollData.factor_id,
      }
      let { data, error } = await auth.mfa.unenroll(params)
      if (error) {
        console.log(error)
      }
      if (data) {
        setEnabled(!e)
        setEnroll(null)
        console.log('Mfa unenroll data: ', data)
      }
    }
  }

  async function handleVerifyTotp() {
    let params = {
      factorId: enrollData.factor_id,
      challengeId: challengeData.challenge_id,
      code: totp,
    }
    let { data, error } = await auth.mfa.verify(params)
    if (error) {
      console.log(error)
    }
    if (data.session) {
      setVerify(true)
      setEnroll(null)
    }
  }

  async function handleUnenroll(factorId, isVerified) {
    const params = { factorId }
    if (isVerified) {
      params.code = prompt('Please enter the authentication code: ', 'code')
    }
    let { error } = await auth.mfa.unenroll(params)
    if (error) {
      console.log(error)
    }
    setEnabled(false)
    setEnroll(null)
    setChallenge(null)
    setVerify(false)
    const updatedFactors = factors.filter((device) => device.id !== factorId)
    setFactors(updatedFactors)
    document.getElementById('enroll').checked = false
    document.getElementById('enroll').disabled = false
  }

  /**
   * Others
   */

  async function handleOAuthLogin(provider) {
    let { error } = await auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'http://localhost:3000/welcome',
      },
    })
    if (error) console.log('Error: ', error.message)
  }
  async function handleVerifyOtp() {
    await auth.verifyOTP({ phone: phone, token: otp, type: 'sms' })
  }

  async function handleSendOtp() {
    await auth.signInWithOtp({ phone: phone, type: 'sms' })
  }
  async function handleEmailSignIn() {
    if (rememberMe) {
      localStorage.setItem('email', email)
    } else {
      localStorage.removeItem('email')
    }
    let { error, data } = await auth.signInWithPassword({ email, password })
    if (!error && !data) alert('Check your email for the login link!')
    if (error) console.log('Error: ', error.message)
  }
  async function handleEmailSignUp() {
    let { error } = await auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'http://localhost:3000/welcome' },
    })
    if (error) console.log('Error: ', error.message)
  }
  async function handleSignOut() {
    let { error } = await auth.signOut()
    if (error) console.log('Error: ', error)
  }
  async function forgotPassword() {
    var email = prompt('Please enter your email:')
    if (email === null || email === '') {
      window.alert('You must enter your email.')
    } else {
      let { error } = await auth.resetPasswordForEmail(email)
      if (error) {
        console.log('Error: ', error.message)
      } else {
        alert('Password recovery email has been sent.')
      }
    }
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white p-4 shadow sm:rounded-lg  mb-10">
          <p className="block text-sm font-medium leading-5 text-gray-700">Active session</p>
          <pre
            className="p-2 text-xs overflow-scroll bg-gray-200 max-h-100 rounded"
            style={{ maxHeight: 150 }}
          >
            {!session ? 'None' : JSON.stringify(session, null, 2)}
          </pre>
          {session && (
            <div className="mt-2">
              <span className="block w-full rounded-md shadow-sm">
                <button
                  onClick={() => handleSignOut()}
                  type="button"
                  className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:border-gray-700 focus:shadow-outline-gray active:bg-gray-700 transition duration-150 ease-in-out"
                >
                  Sign out
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="bg-white p-8 mb-10 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            <div className="flex flex-row">
              <input
                id="enroll"
                type="checkbox"
                onChange={() => handleEnrollMfa(enabled)}
                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
              />
              <label htmlFor="enroll" className="ml-2 block text-sm leading-5 text-gray-900">
                Enable MFA
              </label>
            </div>
            {enrollData && (
              <>
                <div className="flex flex-row my-4">
                  <label
                    className="p-2 text-sm font-medium leading-5 text-gray-700"
                    htmlFor="totp_secret"
                  >
                    TOTP secret
                  </label>
                  <div className="ml-2 bg-gray-200 px-2 py-3 rounded-md">{enrollData.secret}</div>
                </div>
                <div className="bg-gray-200 rounded-md text-center">
                  <img id="totp_qr" src={enrollData.qr} alt={enrollData.uri} />
                  <label
                    className="py-2 text-sm font-medium leading-5 text-gray-700"
                    htmlFor="totp_qr"
                  >
                    TOTP QR
                  </label>
                </div>
                <div className="flex flex-row m-4 rounded-md shadow-sm">
                  <input
                    id="totp_verify"
                    type="text"
                    value={totp}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
                  />
                  <button
                    onClick={() => handleVerifyTotp()}
                    className="ml-2 w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
                  >
                    Verify Enrollment
                  </button>
                </div>
              </>
            )}
            <table className="table-auto mt-4">
              <thead className="bg-gray-100 text-sm">
                <tr className="text-left">
                  <th className="py-4 pl-2">Device Name</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Created At</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {factors.map((device) => (
                  <tr key={device.id} className="space-x-2">
                    <td>{device.id}</td>
                    <td>
                      {device.status === 'verified' ? (
                        <button
                          type="button"
                          disabled
                          className="p-2 rounded-lg bg-green-400"
                        ></button>
                      ) : (
                        <button type="button" disabled className="p-2 bg-red-400">
                          X
                        </button>
                      )}
                    </td>
                    <td>{device.factor_type}</td>
                    <td>
                      {Intl.DateTimeFormat('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      }).format(Date.parse(device.created_at))}
                    </td>
                    <td>
                      <button
                        onClick={() => handleUnenroll(device.id, device.status === 'verified')}
                        type="button"
                        className="p-2 rounded-md text-white bg-red-400"
                      >
                        Unenroll
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-5 text-gray-700">
              Email address
            </label>
            <div className="mt-1 rounded-md shadow-sm">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="password" className="block text-sm font-medium leading-5 text-gray-700">
              Password
            </label>
            <div className="mt-1 rounded-md shadow-sm">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="password" className="block text-sm font-medium leading-5 text-gray-700">
              Send OTP
            </label>
            <div className="mt-1 rounded-md shadow-sm">
              <input
                id="phone"
                type="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="password" className="block text-sm font-medium leading-5 text-gray-700">
              Verify OTP
            </label>
            <div className="mt-1 rounded-md shadow-sm">
              <input
                id="otp"
                type="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:shadow-outline-blue focus:border-blue-300 transition duration-150 ease-in-out sm:text-sm sm:leading-5"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                onChange={() => setRememberMe(!rememberMe)}
                className="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm leading-5 text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm leading-5">
              {/* eslint-disable-next-line */}
              <a
                onClick={forgotPassword}
                href="/"
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:underline transition ease-in-out duration-150"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <span className="block w-full rounded-md shadow-sm">
              <button
                onClick={() => handleEmailSignIn()}
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
              >
                {password.length ? 'Sign in' : 'Send magic link'}
              </button>
            </span>
            <span className="block w-full rounded-md shadow-sm">
              <button
                onClick={() => handleEmailSignUp()}
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
              >
                Sign Up
              </button>
            </span>
            <span className="block w-full rounded-md shadow-sm">
              <button
                onClick={() => handleSendOtp()}
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
              >
                Send Otp
              </button>
            </span>
            <span className="block w-full rounded-md shadow-sm">
              <button
                onClick={() => handleVerifyOtp()}
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
              >
                Verify Otp
              </button>
            </span>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm leading-5">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="mt-6">
                <span className="block w-full rounded-md shadow-sm">
                  <button
                    onClick={() => handleOAuthLogin('github')}
                    type="button"
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
                  >
                    GitHub
                  </button>
                </span>
              </div>
              <div className="mt-6">
                <span className="block w-full rounded-md shadow-sm">
                  <button
                    onClick={() => handleOAuthLogin('google')}
                    type="button"
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out"
                  >
                    Google
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
