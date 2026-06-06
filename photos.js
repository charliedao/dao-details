/* Shared photo manifest loader — used by index.html and gallery.html */
window.DAO_PHOTOS = (function () {
  /* Inline fallback when fetch fails (file://, offline, etc.) — keep in sync with photos.json */
  const FALLBACK = {
    generated: '2026-06-06',
    interior: [
      { src: './Photos/Interior/bmwinside.jpg', file: 'bmwinside.jpg', category: 'interior', caption: 'BMW, Interior Detail', alt: 'BMW interior detail, Rockville MD' }
    ],
    exterior: [
      { src: './Photos/Exterior/fit.jpg', file: 'fit.jpg', category: 'exterior', caption: 'Honda Fit, Exterior Detail', alt: 'Honda Fit exterior detail, Gaithersburg MD' },
      { src: './Photos/Exterior/lexusrc.jpg', file: 'lexusrc.jpg', category: 'exterior', caption: 'Lexus RC, Exterior Detail', alt: 'Lexus RC exterior detail, Rockville MD' },
      { src: './Photos/Exterior/trax.jpg', file: 'trax.jpg', category: 'exterior', caption: 'Chevy Trax, Exterior Detail', alt: 'Chevy Trax exterior detail, Silver Spring MD' }
    ],
    count: 4
  };

  let cache = null;

  function normalize(data) {
    const interior = data.interior || [];
    const exterior = data.exterior || [];
    return {
      ...data,
      interior,
      exterior,
      all: [...interior, ...exterior],
      count: interior.length + exterior.length
    };
  }

  async function load() {
    if (cache) return cache;
    try {
      const res = await fetch('./photos.json', { cache: 'no-cache' });
      if (res.ok) {
        cache = normalize(await res.json());
        return cache;
      }
    } catch (_) { /* file:// or network — use fallback */ }
    cache = normalize(FALLBACK);
    return cache;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(pool, n, offset = 0) {
    if (!pool.length) return [];
    const mixed = shuffle(pool);
    const out = [];
    for (let i = 0; i < n; i++) out.push(mixed[(i + offset) % mixed.length]);
    return out;
  }

  function byCategory(all, cat) {
    return all.filter(p => p.category === cat);
  }

  function interleave(a, b) {
    const out = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (i < a.length) out.push(a[i]);
      if (i < b.length) out.push(b[i]);
    }
    return out;
  }

  return { load, shuffle, pick, byCategory, interleave, FALLBACK, normalize };
})();
