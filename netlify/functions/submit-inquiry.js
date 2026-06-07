// netlify/functions/submit-inquiry.js
// PUBLIC endpoint — customers submit quote requests
// No auth required. Rate-limited by Netlify automatically.

const { getDb, corsHeaders, preflight, ok, err, clean } = require('./_firebase');
const { FieldValue } = require('firebase-admin/firestore');

const KYRO_OPENINGS = [
  "What's up Dude it's me 🐕 someone hit us up for a detail.",
  'Hey im about to go on a walk with Cam but someone hit us up for a detail. give them a call dude 🐕',
  'I really need a bath but someone hit us up for a detail 🐕',
  'I need more chicken chips someone hit us up for a detail 🐕',
  'Im gonna go sleep on the couch someone hit us up for a detail 🐕',
  'just got back from the yard someone hit us up for a detail 🐕',
  'woof woof someone hit us up for a detail dude 🐕',
  'i was napping on the rug but someone hit us up for a detail 🐕',
  'cam forgot to let me out but someone hit us up for a detail 🐕',
  'my tail wont stop wagging someone hit us up for a detail 🐕',
];

function pickKyroOpening() {
  return KYRO_OPENINGS[Math.floor(Math.random() * KYRO_OPENINGS.length)];
}

function buildTelegramText(inquiry) {
  const opening = pickKyroOpening();
  const details = [
    `service: ${inquiry.service}`,
    `price: ${inquiry.price || '—'}`,
    `name: ${inquiry.name}`,
    `phone: ${inquiry.phone}`,
    `email: ${inquiry.email || '—'}`,
    `area: ${inquiry.area || '—'}`,
    `vehicle: ${inquiry.vehicle}`,
    `when: ${inquiry.prefDate || '—'}`,
    `notes: ${inquiry.notes || '—'}`,
  ].join('\n');
  return `${opening}\n\n${details}`;
}

const TELEGRAM_TIMEOUT_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTelegramChatIds(raw) {
  return String(raw || '')
    .split(',')
    .map((id) => id.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

async function notifyTelegram(inquiry) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatIdsRaw = process.env.TELEGRAM_CHAT_IDS?.trim();

  if (!token) {
    console.error('Telegram skipped: TELEGRAM_BOT_TOKEN is not set');
    return { sent: 0, failed: 0, skipped: true };
  }
  if (!chatIdsRaw) {
    console.error('Telegram skipped: TELEGRAM_CHAT_IDS is not set');
    return { sent: 0, failed: 0, skipped: true };
  }

  const chatIds = parseTelegramChatIds(chatIdsRaw);
  if (!chatIds.length) {
    console.error('Telegram skipped: TELEGRAM_CHAT_IDS parsed to empty list');
    return { sent: 0, failed: 0, skipped: true };
  }

  const text = buildTelegramText(inquiry);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  let sent = 0;
  let failed = 0;

  for (const chatId of chatIds) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      if (!res.ok) {
        failed += 1;
        const body = await res.text();
        console.error(`Telegram sendMessage failed for chat ${chatId}: HTTP ${res.status}`, body);
      } else {
        sent += 1;
      }
    } catch (e) {
      failed += 1;
      console.error(`Telegram sendMessage error for chat ${chatId}:`, e.message || e);
    }
  }

  if (failed) {
    console.error(`Telegram: ${sent} sent, ${failed} failed (${chatIds.length} chat IDs)`);
  }

  return { sent, failed, skipped: false };
}

async function notifyTelegramWithTimeout(inquiry) {
  const result = await Promise.race([
    notifyTelegram(inquiry),
    sleep(TELEGRAM_TIMEOUT_MS).then(() => {
      console.error(`Telegram notification timed out after ${TELEGRAM_TIMEOUT_MS}ms`);
      return { sent: 0, failed: 0, timedOut: true };
    }),
  ]);
  return result;
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

    // Await Telegram (max 5s) so Netlify does not kill the request on handler return.
    try {
      await notifyTelegramWithTimeout(inquiry);
    } catch (e) {
      console.error('Telegram notification error:', e.message || e);
    }

    return ok({ success: true, id: ref.id });
  } catch (e) {
    console.error('submit-inquiry error:', e);
    return err(500, 'Failed to save. Please call (202) 699-0209 or text (202) 870-4817.');
  }
};
