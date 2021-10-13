import React, { useEffect, useState } from 'react'
import { auth } from '../utils/initAuth'

export default function Index ({ user }) {
  let [session, setSession] = useState(auth.session())
  let [email, setEmail] = useState('')
  let [password, setPassword] = useState('')

  // Keep the session up to date
  auth.onAuthStateChange((_event, session) => setSession(session))

  useEffect(() => {
    console.log('user', user)
  }, [])

  async function handleEmailSignIn() {
    let { error, user } = await auth.signIn(
      { email, password },
      { redirectTo: 'http://localhost:3000/api/auth' }
    )
    if (!error && !user) alert('Check your email for the login link!')
    if (error) console.log('Error: ', error.message)
  }
  async function handleEmailSignUp() {
    let { error } = await auth.signUp({ email, password })
    if (error) console.log('Error: ', error.message)
  }
  async function handleSignOut() {
    let { error } = await auth.signOut()
    if (error) console.log('Error: ', error.message)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
          </div>

        </div>
      </div>
    </div>
  )
}


export async function getServerSideProps({ req }) {
  const { user } = await auth.api.getUserByCookie(req)

  // If there is a user, return it.
  return { props: { user } }
}

