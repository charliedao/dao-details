// netlify/functions/_firebase.js
// Shared Firebase Admin SDK initializer — imported by all functions

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore }                  = require('firebase-admin/firestore');
const { getStorage }                    = require('firebase-admin/storage');

function initFirebase() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
}

function getDb() {
  initFirebase();
  return getFirestore();
}

function getBucket() {
  initFirebase();
  return getStorage().bucket();
}

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://daodetails.netlify.app';

const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
  'Content-Type': 'application/json',
};

function preflight() {
  return { statusCode: 204, headers: corsHeaders, body: '' };
}

function ok(data) {
  return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
}

function err(code, msg) {
  return { statusCode: code, headers: corsHeaders, body: JSON.stringify({ error: msg }) };
}

// Simple token check — set ADMIN_TOKEN env var in Netlify dashboard
function isAdmin(event) {
  const token = event.headers['x-admin-token'] || '';
  return token === process.env.ADMIN_TOKEN;
}

function clean(str, max = 500) {
  return String(str || '').replace(/<[^>]*>/g, '').trim().slice(0, max);
}

module.exports = { getDb, getBucket, corsHeaders, preflight, ok, err, isAdmin, clean };
