// Scans Photos/Interior and Photos/Exterior for image files and writes photos.json
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT_RE = /\.(jpe?g|png|webp)$/i;

function titleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function captionFromFile(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  const known = {
    photoweb1: 'Lexus IS F Sport — Mirror Shine',
    photoweb2: 'Lexus IS — Foam Cannon Wash',
    photoweb3: 'Infiniti QX60 — Rear Leather',
    photoweb4: 'Toyota Camry — Interior Detail',
    img_6816: 'Rear Seats — Deep Clean',
    img_6819: 'Honda Pilot — Dashboard Detail',
    img_6829: 'Honda Passport Elite — Exterior Detail',
    bmwinside: 'BMW — Interior Detail',
    lexusrc: 'Lexus RC — Exterior Detail',
    fit: 'Honda Fit — Exterior Detail',
    trax: 'Chevy Trax — Exterior Detail',
  };
  const key = base.toLowerCase();
  if (known[key]) return known[key];
  return titleCase(base) + ' — Detail';
}

function scanFolder(folder, category) {
  const dir = path.join(ROOT, 'Photos', folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => EXT_RE.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map(file => {
      const caption = captionFromFile(file);
      return {
        src: `./Photos/${folder}/${file}`,
        file,
        category,
        caption,
        alt: `${caption} — mobile auto detailing Rockville MD`,
      };
    });
}

const interior = scanFolder('Interior', 'interior');
const exterior = scanFolder('Exterior', 'exterior');
const manifest = {
  generated: new Date().toISOString(),
  interior,
  exterior,
  all: [...interior, ...exterior],
  count: interior.length + exterior.length,
};

const out = path.join(ROOT, 'photos.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${manifest.count} photos to photos.json (${interior.length} interior, ${exterior.length} exterior)`);
