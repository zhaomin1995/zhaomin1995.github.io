const functions = require('firebase-functions');
const admin = require('firebase-admin');
const ExifParser = require('exif-parser');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.database();
const storage = admin.storage();

/**
 * Triggers when a photo is uploaded to the travel/ folder in Firebase Storage.
 * Reads EXIF GPS data, reverse-geocodes to "City, State", and writes
 * metadata to the Realtime Database for the travel globe to read.
 */
exports.processTravelPhoto = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name; // e.g., "travel/IMG_1234.jpeg"
  const contentType = object.contentType;

  // Only process images in the travel/ folder
  if (!filePath.startsWith('travel/')) return null;
  if (!contentType || !contentType.startsWith('image/')) return null;

  const fileName = filePath.replace('travel/', '');
  console.log(`Processing: ${fileName}`);

  try {
    // Download the file to read EXIF
    const bucket = storage.bucket();
    const file = bucket.file(filePath);
    const [buffer] = await file.download();

    // Parse EXIF
    let lat = null, lng = null, date = '';
    try {
      const parser = ExifParser.create(buffer).parse();
      if (parser.tags.GPSLatitude && parser.tags.GPSLongitude) {
        lat = parser.tags.GPSLatitude;
        lng = parser.tags.GPSLongitude;
      }
      if (parser.tags.DateTimeOriginal) {
        const d = new Date(parser.tags.DateTimeOriginal * 1000);
        date = d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.log(`EXIF parse failed for ${fileName}: ${e.message}`);
    }

    if (!lat || !lng) {
      console.log(`No GPS data in ${fileName}, skipping`);
      return null;
    }

    // Reverse geocode to "City, State"
    let location = `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`;
      const geoResp = await fetch(geoUrl, {
        headers: { 'User-Agent': 'firebase-travel-function/1.0' },
      });
      const geoData = await geoResp.json();
      const addr = geoData.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || '';
      const state = addr.state || addr.country || '';
      if (city && state) location = `${city}, ${state}`;
      else if (city || state) location = city || state;
    } catch (e) {
      console.log(`Geocode failed: ${e.message}`);
    }

    // Build the CDN URL
    const encodedPath = encodeURIComponent(filePath);
    const cdnUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

    // Write to Realtime Database
    const entry = {
      file: fileName,
      lat: lat,
      lng: lng,
      date: date,
      location: location,
      url: cdnUrl,
    };

    await db.ref(`travel-photos/${sanitizeKey(fileName)}`).set(entry);
    console.log(`✓ ${fileName} → ${location} (${lat}, ${lng})`);
    return null;

  } catch (e) {
    console.error(`Error processing ${fileName}: ${e.message}`);
    return null;
  }
});

/**
 * Triggers when a photo is deleted from the travel/ folder.
 * Removes the corresponding entry from the Realtime Database.
 */
exports.deleteTravelPhoto = functions.storage.object().onDelete(async (object) => {
  const filePath = object.name;
  if (!filePath.startsWith('travel/')) return null;

  const fileName = filePath.replace('travel/', '');
  await db.ref(`travel-photos/${sanitizeKey(fileName)}`).remove();
  console.log(`Removed: ${fileName}`);
  return null;
});

/** Firebase DB keys can't contain . # $ [ ] / */
function sanitizeKey(str) {
  return str.replace(/[.#$\[\]\/]/g, '_');
}
