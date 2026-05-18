const functions = require('firebase-functions');
const admin = require('firebase-admin');
const ExifParser = require('exif-parser');
const fetch = require('node-fetch');
const { VertexAI } = require('@google-cloud/vertexai');

admin.initializeApp();
const db = admin.database();
const storage = admin.storage();

// Gemini Flash for image captioning
const PROJECT_ID = 'zhaomin-homepage';
const LOCATION = 'us-central1';
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const gemini = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/*
 * ── Shared utilities ──
 */

/** Firebase DB keys can't contain . # $ [ ] / */
function sanitizeKey(str) {
  return str.replace(/[.#$\[\]\/]/g, '_');
}

/** Convert a string to a filename-safe slug: lowercase, underscores, no special chars */
function toSlug(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 40);
}

/** Check if a filename already follows our naming convention (contains a YYYYMMDD date) */
function isAlreadyRenamed(filename) {
  return /\d{8}\.\w+$/.test(filename);
}

/** Extract EXIF GPS and date from an image buffer */
function parseExif(buffer) {
  try {
    const parser = ExifParser.create(buffer).parse();
    const result = { lat: null, lng: null, date: '' };
    if (parser.tags.GPSLatitude && parser.tags.GPSLongitude) {
      result.lat = parser.tags.GPSLatitude;
      result.lng = parser.tags.GPSLongitude;
    }
    if (parser.tags.DateTimeOriginal) {
      const d = new Date(parser.tags.DateTimeOriginal * 1000);
      result.date = d.toISOString().split('T')[0].replace(/-/g, '');
    }
    return result;
  } catch {
    return { lat: null, lng: null, date: '' };
  }
}

/** Reverse geocode lat/lng to "City, State" via Nominatim */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'firebase-photo-function/1.0' } });
    const data = await resp.json();
    const addr = data.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || addr.country || '';
    if (city && state) return { full: `${city}, ${state}`, slug: toSlug(city) };
    const loc = city || state;
    return { full: loc || `${lat.toFixed(2)},${lng.toFixed(2)}`, slug: toSlug(loc) || 'unknown' };
  } catch {
    return { full: `${lat.toFixed(2)},${lng.toFixed(2)}`, slug: 'unknown' };
  }
}

/** Use Gemini Flash to generate a short descriptive image summary (2-4 words) */
async function getImageSummary(bucketName, filePath) {
  try {
    const result = await gemini.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { fileData: { mimeType: 'image/jpeg', fileUri: `gs://${bucketName}/${filePath}` } },
          { text: 'Describe this image in exactly 2 to 4 words, using only lowercase English words separated by spaces. Focus on the main subject and setting. Examples: "dog playing beach", "sunset mountain lake", "cat sleeping couch". Do not use articles, punctuation, or complete sentences.' },
        ],
      }],
    });
    const caption = result.response.candidates[0].content.parts[0].text.trim();
    const slug = toSlug(caption);
    return slug || 'photo';
  } catch (e) {
    console.log(`Gemini Flash failed: ${e.message}`);
    return 'photo';
  }
}

/** Find a unique filename by appending _2, _3, etc. if the name already exists */
async function uniquePath(bucket, basePath) {
  const ext = basePath.match(/\.\w+$/)[0];
  const stem = basePath.slice(0, -ext.length);
  let candidate = basePath;
  let counter = 1;
  while (true) {
    const [exists] = await bucket.file(candidate).exists();
    if (!exists) return candidate;
    counter++;
    candidate = `${stem}_${counter}${ext}`;
  }
}

/** Rename a file in Storage: copy to new path, delete old, return CDN URL */
async function renameFile(bucket, oldPath, newPath) {
  const oldFile = bucket.file(oldPath);
  const newFile = bucket.file(newPath);
  await oldFile.copy(newFile);
  await oldFile.delete();
  const encodedPath = encodeURIComponent(newPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
}

/*
 * ── Travel photo processor ──
 * Naming convention: {location}_{summary}_{YYYYMMDD}.{ext}
 * e.g., cannon_beach_ocean_sunset_landscape_20241226.jpeg
 */
exports.processTravelPhoto = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  if (!filePath.startsWith('images/travel/')) return null;
  if (!contentType || !contentType.startsWith('image/')) return null;

  const fileName = filePath.replace('images/travel/', '');

  // Prevent infinite loop: skip files already following the convention
  if (isAlreadyRenamed(fileName)) {
    console.log(`Already renamed: ${fileName}, updating DB only`);
    // Still write/update DB entry for renamed files
    const bucket = storage.bucket();
    const [buffer] = await bucket.file(filePath).download();
    const exif = parseExif(buffer);
    if (exif.lat && exif.lng) {
      const location = await reverseGeocode(exif.lat, exif.lng);
      const encodedPath = encodeURIComponent(filePath);
      const cdnUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
      await db.ref(`travel-photos/${sanitizeKey(fileName)}`).set({
        file: fileName, lat: exif.lat, lng: exif.lng,
        date: exif.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        location: location.full, url: cdnUrl,
      });
    }
    return null;
  }

  console.log(`Processing travel: ${fileName}`);

  try {
    const bucket = storage.bucket();
    const [buffer] = await bucket.file(filePath).download();

    // 1. EXIF
    const exif = parseExif(buffer);
    const date = exif.date || new Date().toISOString().split('T')[0].replace(/-/g, '');

    // 2. Geocode
    let location = { full: '', slug: 'unknown' };
    if (exif.lat && exif.lng) {
      location = await reverseGeocode(exif.lat, exif.lng);
    }

    // 3. Vision API summary
    const summary = await getImageSummary(bucket.name, filePath);

    // 4. New filename (with unique suffix if collision)
    const ext = fileName.split('.').pop().toLowerCase();
    const basePath = `images/travel/${location.slug}_${summary}_${date}.${ext}`;
    const newFilePath = await uniquePath(bucket, basePath);
    const newFileName = newFilePath.replace('images/travel/', '');

    console.log(`Renaming: ${fileName} → ${newFileName}`);

    // 5. Rename in Storage
    const cdnUrl = await renameFile(bucket, filePath, newFilePath);

    // 6. Write to DB (remove old entry, add new)
    await db.ref(`travel-photos/${sanitizeKey(fileName)}`).remove();
    await db.ref(`travel-photos/${sanitizeKey(newFileName)}`).set({
      file: newFileName, lat: exif.lat, lng: exif.lng,
      date: date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      location: location.full, url: cdnUrl,
    });

    console.log(`✓ ${newFileName} → ${location.full}`);
    return null;

  } catch (e) {
    console.error(`Error: ${fileName}: ${e.message}`);
    return null;
  }
});

/*
 * ── Pet photo processor ──
 * Naming convention: {summary}_{YYYYMMDD}.{ext}
 * e.g., dog_grass_happy_20240615.jpeg
 */
exports.processPetPhoto = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  if (!filePath.startsWith('images/pet/')) return null;
  if (!contentType || !contentType.startsWith('image/')) return null;

  const fileName = filePath.replace('images/pet/', '');

  if (isAlreadyRenamed(fileName)) {
    console.log(`Already renamed: ${fileName}, skipping`);
    return null;
  }

  console.log(`Processing pet: ${fileName}`);

  try {
    const bucket = storage.bucket();
    const [buffer] = await bucket.file(filePath).download();

    // 1. EXIF for date
    const exif = parseExif(buffer);
    const date = exif.date || new Date().toISOString().split('T')[0].replace(/-/g, '');

    // 2. Vision API summary
    const summary = await getImageSummary(bucket.name, filePath);

    // 3. New filename (with unique suffix if collision)
    const ext = fileName.split('.').pop().toLowerCase();
    const basePath = `images/pet/${summary}_${date}.${ext}`;
    const newFilePath = await uniquePath(bucket, basePath);
    const newFileName = newFilePath.replace('images/pet/', '');

    console.log(`Renaming: ${fileName} → ${newFileName}`);

    // 4. Rename
    await renameFile(bucket, filePath, newFilePath);

    console.log(`✓ ${newFileName}`);
    return null;

  } catch (e) {
    console.error(`Error: ${fileName}: ${e.message}`);
    return null;
  }
});

/*
 * ── Delete handlers ──
 */
exports.deleteTravelPhoto = functions.storage.object().onDelete(async (object) => {
  if (!object.name.startsWith('images/travel/')) return null;
  const fileName = object.name.replace('images/travel/', '');
  await db.ref(`travel-photos/${sanitizeKey(fileName)}`).remove();
  console.log(`Removed travel: ${fileName}`);
  return null;
});

exports.deletePetPhoto = functions.storage.object().onDelete(async (object) => {
  if (!object.name.startsWith('images/pet/')) return null;
  console.log(`Removed pet: ${object.name.replace('images/pet/', '')}`);
  return null;
});
