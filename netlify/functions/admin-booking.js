// netlify/functions/admin-booking.js
// PROTECTED — requires X-Admin-Token header
// Handles: POST (create booking), PUT (update status OR full edit), DELETE (remove doc)

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
        name:     clean(body.name),
        phone:    clean(body.phone),
        email:    clean(body.email),
        address:  clean(body.address),
        vehicle:  clean(body.vehicle),
        service:  clean(body.service),
        date:     clean(body.date),
        time:     clean(body.time),        // always stored as "H:MM AM/PM EST"
        price:    clean(body.price),
        status:   clean(body.status) || 'confirmed',
        notes:    clean(body.notes, 1000),
        timezone: 'EST',
        created:  FieldValue.serverTimestamp(),
      });
      return ok({ success: true, id: ref.id });
    } catch (e) {
      console.error('create booking error:', e);
      return err(500, 'Failed to create booking');
    }
  }

  /* ── UPDATE ── PUT ──
     Two modes detected automatically:
       • Full edit  → body contains `name` (sent by the Edit Booking modal)
       • Status only → body only contains `id`, `collection`, `status`
  ── */
  if (event.httpMethod === 'PUT') {
    const { id, collection, status } = body;

    if (!id || !collection) return err(400, 'Missing id or collection');
    if (!['inquiries', 'bookings'].includes(collection)) return err(400, 'Invalid collection');

    const validStatuses = ['new', 'pending', 'confirmed', 'completed', 'cancelled'];

    /* ── FULL BOOKING EDIT (name field present = came from Edit modal) ── */
    if (body.name !== undefined) {
      // Only allowed on bookings
      if (collection !== 'bookings') return err(400, 'Full edit only supported on bookings');

      // Validate status if provided
      if (status && !validStatuses.includes(status)) return err(400, 'Invalid status');

      // Build the update object — only include fields that were sent
      const ALLOWED = ['name','phone','email','address','vehicle','service','date','time','price','status','notes','timezone'];
      const updateData = { updatedAt: FieldValue.serverTimestamp() };

      ALLOWED.forEach(k => {
        if (body[k] !== undefined) {
          // Apply same cleaning; notes gets a longer limit
          updateData[k] = k === 'notes' ? clean(body[k], 1000) : clean(body[k]);
        }
      });

      // Always stamp timezone as EST when time is updated
      if (updateData.time && !updateData.time.match(/EST$/i)) {
        updateData.time = updateData.time.replace(/\s*EST\s*$/i, '').trim() + ' EST';
      }

      try {
        await db.collection('bookings').doc(id).update(updateData);
        return ok({ success: true });
      } catch (e) {
        console.error('full edit error:', e);
        return err(500, 'Failed to update booking');
      }
    }

    /* ── STATUS-ONLY UPDATE ── */
    if (!status) return err(400, 'Missing status');
    if (!validStatuses.includes(status)) return err(400, 'Invalid status');

    try {
      await db.collection(collection).doc(id).update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });
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
    if (!['inquiries', 'bookings'].includes(collection)) return err(400, 'Invalid collection');
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