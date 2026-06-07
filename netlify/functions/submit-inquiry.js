// netlify/functions/submit-inquiry.js
// PUBLIC endpoint — customers submit quote requests
// No auth required. Rate-limited by Netlify automatically.

const { getDb, corsHeaders, preflight, ok, err, clean } = require('./_firebase');
const { FieldValue } = require('firebase-admin/firestore');

async function notifyTelegram(inquiry) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdsRaw = process.env.TELEGRAM_CHAT_IDS;
  if (!token || !chatIdsRaw) return;

  const chatIds = chatIdsRaw.split(',').map((id) => id.trim()).filter(Boolean);
  if (!chatIds.length) return;

  const price = inquiry.price || '';
  const serviceLine = price ? `${inquiry.service} (${price})` : inquiry.service;
  const text = [
    '🚗 New Quote Request — DAO Detailing',
    '',
    `Service: ${serviceLine}`,
    `Name: ${inquiry.name}`,
    `Phone: ${inquiry.phone}`,
    `Email: ${inquiry.email || 'N/A'}`,
    `Area: ${inquiry.area || '—'}`,
    `Vehicle: ${inquiry.vehicle}`,
    `When: ${inquiry.prefDate || '—'}`,
    `Notes: ${inquiry.notes || '—'}`,
  ].join('\n');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  for (const chatId of chatIds) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`Telegram sendMessage failed for chat ${chatId}:`, res.status, body);
      }
    } catch (e) {
      console.error(`Telegram sendMessage error for chat ${chatId}:`, e);
    }
  }
}

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
    const inquiry = {
      service:  clean(data.service),
      price:    clean(data.price),
      name:     clean(data.name),
      phone:    clean(data.phone),
      email:    clean(data.email),
      area:     clean(data.area),
      vehicle:  clean(data.vehicle),
      prefDate: clean(data.prefDate),
      notes:    clean(data.notes, 1000),
    };

    const db  = getDb();
    const ref = await db.collection('inquiries').add({
      status:    'new',
      ...inquiry,
      submitted: FieldValue.serverTimestamp(),
    });

    await notifyTelegram(inquiry);
    return ok({ success: true, id: ref.id });
  } catch (e) {
    console.error('submit-inquiry error:', e);
    return err(500, 'Failed to save. Please call (202) 699-0209 or text (202) 870-4817.');
  }
};
