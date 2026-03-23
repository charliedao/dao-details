// netlify/functions/gallery-data.js
// Handles gallery image upload, listing, and deletion
// GET  ?action=list                    — public, returns all images
// POST ?action=upload  (admin only)    — uploads base64 image to Firebase Storage
// DELETE ?action=delete (admin only)   — deletes image from Storage + Firestore

const { getDb, getBucket, preflight, ok, err, isAdmin, clean } = require('./_firebase');
const { FieldValue } = require('firebase-admin/firestore');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const action = event.queryStringParameters?.action || 'list';

  /* ── LIST — public ── */
  if (event.httpMethod === 'GET' && action === 'list') {
    try {
      const db   = getDb();
      const snap = await db.collection('gallery')
        .orderBy('createdAt', 'desc')
        .get();
      const images = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return ok({ success: true, images });
    } catch (e) {
      console.error('gallery list error:', e);
      return err(500, 'Failed to load gallery');
    }
  }

  /* ── UPLOAD — admin only ── */
  if (event.httpMethod === 'POST' && action === 'upload') {
    if (!isAdmin(event)) return err(401, 'Unauthorized');

    let body;
    try { body = JSON.parse(event.body); }
    catch { return err(400, 'Invalid JSON'); }

    const { imageData, fileName, mimeType, caption, category } = body;
    if (!imageData || !fileName || !mimeType) {
      return err(400, 'Missing imageData, fileName, or mimeType');
    }

    // Validate mime type
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(mimeType)) {
      return err(400, 'Only JPEG, PNG and WebP images are allowed');
    }

    try {
      const db     = getDb();
      const bucket = getBucket();

      // Decode base64
      const buffer   = Buffer.from(imageData, 'base64');
      const safeName = `gallery/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const file     = bucket.file(safeName);

      // Upload to Firebase Storage
      await file.save(buffer, {
        metadata: { contentType: mimeType },
        public: true,
      });

      // Get public URL
      const url = `https://storage.googleapis.com/${bucket.name}/${safeName}`;

      // Save metadata to Firestore
      const ref = await db.collection('gallery').add({
        url,
        storagePath: safeName,
        fileName:    clean(fileName),
        caption:     clean(caption, 200),
        category:    clean(category) || 'exterior',
        createdAt:   FieldValue.serverTimestamp(),
      });

      return ok({ success: true, id: ref.id, url });

    } catch (e) {
      console.error('gallery upload error:', e);
      return err(500, 'Failed to upload image: ' + e.message);
    }
  }

  /* ── DELETE — admin only ── */
  if (event.httpMethod === 'DELETE' && action === 'delete') {
    if (!isAdmin(event)) return err(401, 'Unauthorized');

    let body;
    try { body = JSON.parse(event.body); }
    catch { return err(400, 'Invalid JSON'); }

    const { id, storagePath } = body;
    if (!id) return err(400, 'Missing image id');

    try {
      const db     = getDb();
      const bucket = getBucket();

      // Delete from Storage
      if (storagePath) {
        try {
          await bucket.file(storagePath).delete();
        } catch (e) {
          console.warn('Storage delete failed (may already be gone):', e.message);
        }
      }

      // Delete from Firestore
      await db.collection('gallery').doc(id).delete();

      return ok({ success: true });
    } catch (e) {
      console.error('gallery delete error:', e);
      return err(500, 'Failed to delete image');
    }
  }

  return err(405, 'Method not allowed');
};
