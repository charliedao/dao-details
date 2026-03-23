// netlify/functions/admin-booking.js
// PROTECTED — requires X-Admin-Token header
// Handles: POST (create booking), PUT (update status), DELETE (remove doc)

const { getDb, preflight, ok, err, isAdmin, clean } = require('./_firebase');
const { FieldValue } = require('firebase-admin/firestore');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (!isAdmin(event))                return err(401, 'Unauthorized');

  const db  = getDb();
  let body  = {};

  if (event.body) {
    try { body = JSON.parse(event.body); }
    catch { return err(400, 'Invalid JSON'); }
  }

  /* ── CREATE BOOKING ── POST ── */
  if (event.httpMethod === 'POST') {
    const { name, phone, service, date, time, address, vehicle } = body;
    if (!name || !phone || !service || !date || !time || !address || !vehicle) {
      return err(400, 'Missing required fields');
    }
    try {
      const ref = await db.collection('bookings').add({
        name:    clean(body.name),
        phone:   clean(body.phone),
        email:   clean(body.email),
        address: clean(body.address),
        vehicle: clean(body.vehicle),
        service: clean(body.service),
        date:    clean(body.date),
        time:    clean(body.time),
        price:   clean(body.price),
        status:  clean(body.status) || 'confirmed',
        notes:   clean(body.notes, 1000),
        created: FieldValue.serverTimestamp(),
      });
      return ok({ success: true, id: ref.id });
    } catch (e) {
      console.error('create booking error:', e);
      return err(500, 'Failed to create booking');
    }
  }

  /* ── UPDATE STATUS ── PUT ── */
  if (event.httpMethod === 'PUT') {
    const { id, collection, status } = body;
    if (!id || !collection || !status) return err(400, 'Missing id, collection, or status');
    if (!['inquiries','bookings'].includes(collection)) return err(400, 'Invalid collection');
    const validStatuses = ['new','pending','confirmed','completed','cancelled'];
    if (!validStatuses.includes(status)) return err(400, 'Invalid status');
    try {
      await db.collection(collection).doc(id).update({ status });
      return ok({ success: true });
    } catch (e) {
      console.error('update status error:', e);
      return err(500, 'Failed to update status');
    }
  }

  /* ── DELETE ── DELETE ── */
  if (event.httpMethod === 'DELETE') {
    const { id, collection } = body;
    if (!id || !collection) return err(400, 'Missing id or collection');
    if (!['inquiries','bookings'].includes(collection)) return err(400, 'Invalid collection');
    try {
      await db.collection(collection).doc(id).delete();
      return ok({ success: true });
    } catch (e) {
      console.error('delete error:', e);
      return err(500, 'Failed to delete');
    }
  }

  return err(405, 'Method not allowed');
};
