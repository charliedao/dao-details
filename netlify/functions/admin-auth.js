// netlify/functions/admin-auth.js
//
// Accepts email + password directly.
// Calls Firebase Auth REST API server-side to verify credentials.
// Returns ADMIN_TOKEN if the email is allowed.
// ZERO Firebase config needed in the browser.
//
// Required env vars:
//   FIREBASE_API_KEY     — your Firebase Web API key (stays on server only)
//   FIREBASE_PROJECT_ID  — your project id
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
//   ADMIN_TOKEN          — secret token you make up (32+ chars)
//   ALLOWED_ORIGIN

const { corsHeaders, preflight, ok, err } = require('./_firebase');

const ALLOWED_EMAILS = [
  'charlie.daos@gmail.com',
  'alexspotifyoad@gmail.com',
];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err(405, 'Method not allowed');

  let body;
  try { body = JSON.parse(event.body); }
  catch { return err(400, 'Invalid JSON'); }

  const { email, password } = body;
  if (!email || !password) return err(400, 'Email and password required');

  // Check allowed list before even hitting Firebase
  if (!ALLOWED_EMAILS.includes(email)) {
    return err(403, 'Account not authorized for admin access');
  }

  // Use Firebase Auth REST API — runs on the server, key never touches browser
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) return err(500, 'Server misconfigured — missing FIREBASE_API_KEY');

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      // Map Firebase error codes to friendly messages
      const msgs = {
        'INVALID_LOGIN_CREDENTIALS': 'Incorrect email or password.',
        'EMAIL_NOT_FOUND':           'No account found with that email.',
        'INVALID_PASSWORD':          'Incorrect password.',
        'USER_DISABLED':             'This account has been disabled.',
        'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many attempts. Try again later.',
      };
      const code = data?.error?.message || '';
      return err(401, msgs[code] || 'Sign-in failed. Try again.');
    }

    // Double-check the email returned matches allowed list
    if (!ALLOWED_EMAILS.includes(data.email)) {
      return err(403, 'Account not authorized for admin access');
    }

    return ok({
      success: true,
      token:   process.env.ADMIN_TOKEN,
      email:   data.email,
    });

  } catch (e) {
    console.error('admin-auth error:', e);
    return err(500, 'Authentication service unavailable. Try again.');
  }
};
