# Passkey (WebAuthn) Implementation Guide

## Overview

This guide explains how to implement passwordless authentication using WebAuthn passkeys in CerTrack. The system is designed to have **NO initial users**, only passkeys that users create during registration.

---

## Architecture

### Key Concepts

1. **Passkey**: A cryptographic credential stored on user's device (phone, laptop, security key)
2. **Credential ID**: Unique identifier for the passkey
3. **Public Key**: Used by server to verify signatures
4. **Sign Count**: Prevents cloned authenticators
5. **Challenge**: Random data to prevent replay attacks

### Flow Diagram

```
User Registration:
1. User enters email + access code
2. Server generates challenge
3. User creates passkey on device
4. Device returns credential (public key + credential ID)
5. Server stores passkey + creates user account

User Login:
1. User enters email
2. Server generates challenge
3. User authenticates with passkey
4. Device signs challenge with private key
5. Server verifies signature with stored public key
6. User is logged in
```

---

## Database Schema

### Passkeys Table

```sql
CREATE TABLE passkeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id BYTEA UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  sign_count INTEGER DEFAULT 0,
  transports VARCHAR(50)[] DEFAULT ARRAY[]::VARCHAR[],
  backup_eligible BOOLEAN DEFAULT FALSE,
  backup_state BOOLEAN DEFAULT FALSE,
  attestation_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP WITH TIME ZONE
);
```

### Passkey Registrations Table (Temporary)

```sql
CREATE TABLE passkey_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'intern')),
  challenge BYTEA NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '15 minutes'
);
```

---

## Backend Implementation (Node.js + Express)

### 1. Install Dependencies

```bash
npm install @simplewebauthn/server @simplewebauthn/browser dotenv
npm install express cors uuid
```

### 2. Environment Variables

```env
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=CerTrack
WEBAUTHN_ORIGIN=http://localhost:5173
ADMIN_CODE=ADMIN2026
INTERN_CODE=INTERNS2026
```

### 3. Backend Setup

```javascript
// backend/server.js
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { v4 as uuidv4 } from 'uuid'

const app = express()
app.use(express.json())
app.use(cors({
  origin: process.env.WEBAUTHN_ORIGIN,
  credentials: true
}))

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const rpID = process.env.WEBAUTHN_RP_ID
const rpName = process.env.WEBAUTHN_RP_NAME
const origin = process.env.WEBAUTHN_ORIGIN

// Store challenges temporarily (in production, use Redis or database)
const challenges = new Map()

// ============================================================================
// REGISTRATION ENDPOINTS
// ============================================================================

/**
 * Step 1: Start passkey registration
 * POST /auth/register/start
 * Body: { email, accessCode, role }
 */
app.post('/auth/register/start', async (req, res) => {
  try {
    const { email, accessCode, role } = req.body

    // Validate access code
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('admin_code, intern_code')
      .single()

    const validCode = role === 'admin' 
      ? accessCode === settings.admin_code
      : accessCode === settings.intern_code

    if (!validCode) {
      return res.status(401).json({ error: 'Invalid access code' })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Generate registration options
    const options = generateRegistrationOptions({
      rpID,
      rpName,
      userID: uuidv4(),
      userName: email,
      userDisplayName: email,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    // Store challenge temporarily
    const registrationId = uuidv4()
    challenges.set(registrationId, {
      challenge: options.challenge,
      email,
      role,
      userID: options.user.id,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    })

    res.json({
      registrationId,
      options,
    })
  } catch (error) {
    console.error('Registration start error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Step 2: Complete passkey registration
 * POST /auth/register/complete
 * Body: { registrationId, credential }
 */
app.post('/auth/register/complete', async (req, res) => {
  try {
    const { registrationId, credential } = req.body

    // Retrieve stored challenge
    const challengeData = challenges.get(registrationId)
    if (!challengeData || challengeData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired registration' })
    }

    // Verify the credential
    let verification
    try {
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      })
    } catch (error) {
      return res.status(400).json({ error: 'Credential verification failed' })
    }

    if (!verification.verified) {
      return res.status(400).json({ error: 'Credential verification failed' })
    }

    // Create user account
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: challengeData.userID,
        email: challengeData.email,
        role: challengeData.role,
        full_name: challengeData.email.split('@')[0],
      })
      .select()
      .single()

    if (userError) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Store passkey
    const credentialIDBuffer = Buffer.from(
      verification.registrationInfo.credentialID
    )
    const publicKeyBuffer = Buffer.from(
      verification.registrationInfo.credentialPublicKey
    )

    const { error: passkeyError } = await supabase
      .from('passkeys')
      .insert({
        user_id: newUser.id,
        credential_id: credentialIDBuffer,
        public_key: publicKeyBuffer,
        sign_count: verification.registrationInfo.signCount,
        transports: credential.response.transports || [],
        backup_eligible: verification.registrationInfo.credentialBackedUp,
        backup_state: verification.registrationInfo.credentialBackedUp,
        attestation_type: verification.registrationInfo.attestationType,
      })

    if (passkeyError) {
      return res.status(500).json({ error: 'Failed to store passkey' })
    }

    // Clean up challenge
    challenges.delete(registrationId)

    res.json({
      success: true,
      user: newUser,
      message: 'Registration successful',
    })
  } catch (error) {
    console.error('Registration complete error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

/**
 * Step 1: Start passkey authentication
 * POST /auth/login/start
 * Body: { email }
 */
app.post('/auth/login/start', async (req, res) => {
  try {
    const { email } = req.body

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get user's passkeys
    const { data: passkeys, error: passkeyError } = await supabase
      .from('passkeys')
      .select('credential_id')
      .eq('user_id', user.id)

    if (passkeyError || !passkeys || passkeys.length === 0) {
      return res.status(404).json({ error: 'No passkeys found' })
    }

    // Generate authentication options
    const options = generateAuthenticationOptions({
      rpID,
      allowCredentials: passkeys.map(pk => ({
        id: Buffer.from(pk.credential_id).toString('base64'),
        type: 'public-key',
        transports: ['internal', 'platform'],
      })),
    })

    // Store challenge
    const authId = uuidv4()
    challenges.set(authId, {
      challenge: options.challenge,
      userId: user.id,
      email,
      expiresAt: Date.now() + 15 * 60 * 1000,
    })

    res.json({
      authId,
      options,
    })
  } catch (error) {
    console.error('Login start error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Step 2: Complete passkey authentication
 * POST /auth/login/complete
 * Body: { authId, credential }
 */
app.post('/auth/login/complete', async (req, res) => {
  try {
    const { authId, credential } = req.body

    // Retrieve stored challenge
    const challengeData = challenges.get(authId)
    if (!challengeData || challengeData.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired authentication' })
    }

    // Get user's passkeys
    const { data: passkeys, error: passkeyError } = await supabase
      .from('passkeys')
      .select('*')
      .eq('user_id', challengeData.userId)

    if (passkeyError || !passkeys || passkeys.length === 0) {
      return res.status(404).json({ error: 'No passkeys found' })
    }

    // Find matching passkey
    const credentialIDBuffer = Buffer.from(credential.id, 'base64')
    const matchingPasskey = passkeys.find(pk => 
      Buffer.from(pk.credential_id).equals(credentialIDBuffer)
    )

    if (!matchingPasskey) {
      return res.status(400).json({ error: 'Credential not found' })
    }

    // Verify authentication
    let verification
    try {
      verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: challengeData.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: matchingPasskey.credential_id,
          publicKey: matchingPasskey.public_key,
          signCount: matchingPasskey.sign_count,
          transports: matchingPasskey.transports,
        },
      })
    } catch (error) {
      return res.status(400).json({ error: 'Authentication verification failed' })
    }

    if (!verification.verified) {
      return res.status(400).json({ error: 'Authentication verification failed' })
    }

    // Check sign count (prevent cloned authenticators)
    if (verification.authenticationInfo.signCount <= matchingPasskey.sign_count) {
      console.warn('Possible cloned authenticator detected')
      // In production, you might want to flag this account
    }

    // Update passkey sign count and last used
    await supabase
      .from('passkeys')
      .update({
        sign_count: verification.authenticationInfo.signCount,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', matchingPasskey.id)

    // Get full user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', challengeData.userId)
      .single()

    // Clean up challenge
    challenges.delete(authId)

    // Generate JWT token (implement your own JWT logic)
    const token = generateJWT(user)

    res.json({
      success: true,
      user,
      token,
      message: 'Authentication successful',
    })
  } catch (error) {
    console.error('Login complete error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateJWT(user) {
  // Implement your JWT generation logic here
  // This is a placeholder
  return 'jwt-token-here'
}

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

---

## Frontend Implementation (React)

### 1. Install Dependencies

```bash
npm install @simplewebauthn/browser
```

### 2. Registration Component

```javascript
// frontend/src/components/PasskeyRegister.jsx
import { useState } from 'react'
import {
  startRegistration,
  browserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser'

export const PasskeyRegister = () => {
  const [email, setEmail] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [role, setRole] = useState('intern')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Get registration options from server
      const startRes = await fetch('/auth/register/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accessCode, role }),
      })

      if (!startRes.ok) {
        const data = await startRes.json()
        throw new Error(data.error || 'Registration failed')
      }

      const { registrationId, options } = await startRes.json()

      // Step 2: Create passkey on device
      const credential = await startRegistration(options)

      // Step 3: Send credential to server
      const completeRes = await fetch('/auth/register/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, credential }),
      })

      if (!completeRes.ok) {
        const data = await completeRes.json()
        throw new Error(data.error || 'Registration failed')
      }

      const result = await completeRes.json()
      console.log('Registration successful:', result)
      
      // Redirect to login or dashboard
      window.location.href = '/login'
    } catch (err) {
      setError(err.message)
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="text"
        value={accessCode}
        onChange={(e) => setAccessCode(e.target.value)}
        placeholder="Access Code"
        required
      />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="intern">Intern</option>
        <option value="admin">Admin</option>
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Passkey...' : 'Register with Passkey'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

### 3. Login Component

```javascript
// frontend/src/components/PasskeyLogin.jsx
import { useState } from 'react'
import {
  startAuthentication,
  browserSupportsWebAuthnAutofill,
} from '@simplewebauthn/browser'

export const PasskeyLogin = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Get authentication options from server
      const startRes = await fetch('/auth/login/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!startRes.ok) {
        const data = await startRes.json()
        throw new Error(data.error || 'Login failed')
      }

      const { authId, options } = await startRes.json()

      // Step 2: Authenticate with passkey
      const credential = await startAuthentication(options)

      // Step 3: Send credential to server
      const completeRes = await fetch('/auth/login/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId, credential }),
      })

      if (!completeRes.ok) {
        const data = await completeRes.json()
        throw new Error(data.error || 'Login failed')
      }

      const result = await completeRes.json()
      
      // Store token and redirect
      localStorage.setItem('token', result.token)
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message)
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Authenticating...' : 'Login with Passkey'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

---

## Security Best Practices

1. **Challenge Validation**: Always verify challenges match
2. **Sign Count**: Check for cloned authenticators
3. **Origin Verification**: Ensure requests come from expected origin
4. **HTTPS Only**: Passkeys require secure context
5. **Rate Limiting**: Limit registration/login attempts
6. **Audit Logging**: Log all authentication events
7. **Backup Codes**: Provide recovery options
8. **Device Management**: Allow users to manage their passkeys

---

## Testing

### Test Passkey Registration

```bash
curl -X POST http://localhost:3000/auth/register/start \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "accessCode": "INTERNS2026",
    "role": "intern"
  }'
```

### Test Passkey Login

```bash
curl -X POST http://localhost:3000/auth/login/start \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## Troubleshooting

### "Passkey not supported"
- Ensure HTTPS (or localhost for development)
- Check browser support (Chrome 67+, Safari 13+, Edge 18+)

### "Credential verification failed"
- Verify challenge matches
- Check origin and RP ID
- Ensure public key is correctly stored

### "Sign count mismatch"
- This indicates a possible cloned authenticator
- Consider flagging the account for review

---

## References

- [WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [SimpleWebAuthn Docs](https://simplewebauthn.dev/)
- [OWASP WebAuthn](https://cheatsheetseries.owasp.org/cheatsheets/WebAuthn_Cheat_Sheet.html)

---

**Last Updated**: April 2026
**Version**: 1.0
