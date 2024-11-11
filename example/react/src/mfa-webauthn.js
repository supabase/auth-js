import React, { useState, useEffect } from 'react'
import { Shield, AlertCircle } from 'lucide-react'

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    width: '100%',
    maxWidth: '28rem',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginLeft: '0.5rem',
  },
  description: {
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    border: '1px solid #F87171',
    borderRadius: '0.375rem',
    padding: '1rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
  },
  errorIcon: {
    color: '#DC2626',
    marginRight: '0.5rem',
    flexShrink: 0,
  },
  errorMessage: {
    color: '#DC2626',
    fontSize: '0.875rem',
  },
  button: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '0.25rem',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    marginTop: '1rem',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '0.875rem',
    marginTop: '1rem',
    display: 'inline-block',
  },
}

// Simulated WebAuthn API call
const simulateWebAuthnAuthentication = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate a 50% chance of success
      if (Math.random() < 0.5) {
        resolve()
      } else {
        reject(new Error('The operation either timed out or was not allowed.'))
      }
    }, 2000) // Simulate a 2-second delay
  })
}

export default function MFAWebAuthn() {
  const [error, setError] = useState(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    startAuthentication()
  }, [])

  const startAuthentication = async () => {
    setIsAuthenticating(true)
    setError(null)
    try {
      await simulateWebAuthnAuthentication()
      // If successful, you would typically redirect the user or update the app state
      console.log('Authentication successful')
    } catch (err) {
      setError((err).message)
    } finally {
      setIsAuthenticating(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Shield size={24} />
          <h2 style={styles.title}>Keeping you secure</h2>
        </div>
        <p style={styles.description}>
          Your account is protected with a passkey or security key for multi-factor authentication (MFA).
          To finish signing in, follow the instructions from your browser or you can select another MFA method.
        </p>
        {error && (
          <div style={styles.errorContainer}>
            <AlertCircle style={styles.errorIcon} size={20} />
            <div style={styles.errorMessage}>
              <strong>Unable to authenticate.</strong><br />
              {error} See: <a href="https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client" target="_blank" rel="noopener noreferrer">W3C WebAuthn Specification</a>.
            </div>
          </div>
        )}
        <button
          style={styles.button}
          onClick={startAuthentication}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? 'Authenticating...' : 'Try Again'}
        </button>
        <a href="#" style={styles.link} onClick={() => {
          // Handle selecting another MFA method
          console.log('Selecting another MFA method')
        }}>
          Select another MFA method
        </a>
        <br></br>

        <a href="#" style={styles.link} onClick={() => {
          console.log('Signing in to a different account')
        }}>
          Sign in to a different account
        </a>
        <a href="#" style={styles.link} onClick={() => {
          console.log('Trouble signing in')
        }}>
          Trouble signing in?
        </a>
      </div>
    </div>
  )
}
