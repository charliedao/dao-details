// netlify/functions/submit-inquiry.js
// PUBLIC endpoint — customers submit quote requests
// No auth required. Rate-limited by Netlify automatically.

const { getDb, corsHeaders, preflight, ok, err, clean } = require('./_firebase');
const { FieldValue } = require('firebase-admin/firestore');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST')    return err(405, 'Method not allowed');

  let data;
  try { data = JSON.parse(event.body); }
  catch { return err(400, 'Invalid JSON'); }

  const { name, phone, service, vehicle } = data;
  if (!name || !phone || !service || !vehicle) {
    return err(400, 'Missing required fields');
  }

  try {
    const db  = getDb();
    const ref = await db.collection('inquiries').add({
      status:    'new',
      service:   clean(data.service),
      price:     clean(data.price),
      name:      clean(data.name),
      phone:     clean(data.phone),
      email:     clean(data.email),
      area:      clean(data.area),
      vehicle:   clean(data.vehicle),
      prefDate:  clean(data.prefDate),
      notes:     clean(data.notes, 1000),
      submitted: FieldValue.serverTimestamp(),
    });
    return ok({ success: true, id: ref.id });
  } catch (e) {
    console.error('submit-inquiry error:', e);
    return err(500, 'Failed to save. Please call (202) 699-0209 or text (202) 870-4817.');
  }
};
