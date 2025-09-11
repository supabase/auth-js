import { GoTrueClient } from './src'
const client = new GoTrueClient({})

/**
 * NATIVE METHODS
 */
// enroll phone
const enroll_phone = client.mfa.enroll({
  factorType: 'phone',
  phone: '213123',
  friendlyName: '',
})
// enroll totp
const enroll_totp = client.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'nice',
  issuer: 'asd',
  
})
// enroll phone
const enroll_webauthn = client.mfa.enroll({
  factorType: 'phone',
  phone: '+97455381407',
  friendlyName: 'nice',
})
