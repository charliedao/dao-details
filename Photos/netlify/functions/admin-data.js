// netlify/functions/admin-data.js
// PROTECTED — requires X-Admin-Token header
// Returns inquiries and/or bookings from Firestore

const { getDb, preflight, ok, err, isAdmin } = require('./_firebase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET')     return err(405, 'Method not allowed');
  if (!isAdmin(event))                return err(401, 'Unauthorized');

  const col = event.queryStringParameters?.collection || 'inquiries';
  if (!['inquiries', 'bookings'].includes(col)) {
    return err(400, 'Invalid collection');
  }

  try {
    const db      = getDb();
    const snap    = await db.collection(col).orderBy(
      col === 'inquiries' ? 'submitted' : 'created', 'desc'
    ).get();

    const docs = snap.docs.map(d => {
      const data = d.data();
      // Convert Firestore timestamps to readable strings
      return {
        ...data,
        _id:       d.id,
        submitted: data.submitted?.toDate?.()?.toLocaleString() || data.submitted || '—',
        created:   data.created?.toDate?.()?.toLocaleString()   || data.created   || '—',
      };
    });

    return ok({ success: true, data: docs });
  } catch (e) {
    console.error('admin-data error:', e);
    return err(500, 'Failed to fetch data');
  }
};
