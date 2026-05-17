#!/usr/bin/env python3
"""
Scan img/travel/ for photos with GPS EXIF data, upload to Firebase Storage,
cache metadata in Firebase Realtime Database, and generate assets/js/places.js.

Usage: python3 build-travel.py
Runs automatically via the pre-commit hook when img/travel/ changes.
"""

import os, json, time, subprocess, hashlib
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

TRAVEL_DIR = 'img/travel'
OUTPUT = 'assets/js/places.js'

# Firebase config
FB_DB_URL = 'https://zhaomin-homepage-default-rtdb.firebaseio.com'
FB_BUCKET = 'zhaomin-homepage.firebasestorage.app'
FB_STORAGE_API = f'https://firebasestorage.googleapis.com/v0/b/{FB_BUCKET}'

def file_hash(path):
    """Fast hash of file size + first 8KB for change detection."""
    stat = os.stat(path)
    h = hashlib.md5()
    h.update(str(stat.st_size).encode())
    with open(path, 'rb') as f:
        h.update(f.read(8192))
    return h.hexdigest()

def get_exif_gps(path):
    """Extract GPS lat/lng and date from image EXIF data."""
    try:
        img = Image.open(path)
        exif = img._getexif()
        if not exif:
            return None

        gps_info = {}
        date = ''
        for tag_id, value in exif.items():
            tag = TAGS.get(tag_id, tag_id)
            if tag == 'GPSInfo':
                for gps_tag_id, gps_value in value.items():
                    gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag] = gps_value
            elif tag == 'DateTimeOriginal' or (tag == 'DateTime' and not date):
                date = str(value)

        if not gps_info:
            return None

        def to_decimal(dms, ref):
            d, m, s = [float(x) for x in dms]
            decimal = d + m/60 + s/3600
            if ref in ('S', 'W'):
                decimal = -decimal
            return round(decimal, 6)

        lat = to_decimal(gps_info.get('GPSLatitude', (0,0,0)),
                         gps_info.get('GPSLatitudeRef', 'N'))
        lng = to_decimal(gps_info.get('GPSLongitude', (0,0,0)),
                         gps_info.get('GPSLongitudeRef', 'E'))

        return {'lat': lat, 'lng': lng, 'date': date[:10].replace(':', '-') if date else ''}
    except Exception as e:
        print(f"  Warning: {path} - {e}")
        return None

def reverse_geocode(lat, lng):
    """Convert lat/lng to 'City, State' using free Nominatim API."""
    try:
        url = f'https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&zoom=10'
        result = subprocess.run(['curl', '-s', url, '-H', 'User-Agent: travel-build/1.0'],
                                capture_output=True, text=True, timeout=15)
        data = json.loads(result.stdout)
        addr = data.get('address', {})
        city = addr.get('city') or addr.get('town') or addr.get('village') or addr.get('county') or ''
        state = addr.get('state') or addr.get('country') or ''
        if city and state:
            return f'{city}, {state}'
        return city or state or f'{lat:.2f}, {lng:.2f}'
    except Exception as e:
        print(f"    Geocode failed: {e}")
        return f'{lat:.2f}, {lng:.2f}'

# ── Firebase Realtime Database: read/write cache ──

def fb_load_cache():
    """GET cache from Firebase Realtime Database."""
    try:
        result = subprocess.run(
            ['curl', '-s', f'{FB_DB_URL}/travel-cache.json'],
            capture_output=True, text=True, timeout=10)
        data = json.loads(result.stdout)
        if data and isinstance(data, dict):
            print(f"  ☁ Loaded cache from Firebase ({len(data.get('photos', {}))} photos)")
            return data
    except Exception as e:
        print(f"  ☁ Firebase cache load failed: {e}")
    return {'photos': {}, 'geocode': {}}

def fb_save_cache(cache):
    """PUT cache to Firebase Realtime Database."""
    try:
        payload = json.dumps(cache)
        result = subprocess.run(
            ['curl', '-s', '-X', 'PUT',
             '-H', 'Content-Type: application/json',
             '-d', payload,
             f'{FB_DB_URL}/travel-cache.json'],
            capture_output=True, text=True, timeout=15)
        print(f"  ☁ Saved cache to Firebase")
    except Exception as e:
        print(f"  ☁ Firebase cache save failed: {e}")

# ── Firebase Storage: upload photos ──

def fb_upload_photo(local_path, filename):
    """Upload a photo to Firebase Storage, return the public CDN URL."""
    try:
        # Determine content type
        ext = filename.lower().rsplit('.', 1)[-1]
        content_types = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                         'png': 'image/png', 'webp': 'image/webp'}
        ct = content_types.get(ext, 'image/jpeg')

        # Upload via REST API
        encoded_name = f'travel/{filename}'.replace('/', '%2F')
        upload_url = f'{FB_STORAGE_API}/o?uploadType=media&name=travel/{filename}'
        result = subprocess.run(
            ['curl', '-s', '-X', 'POST',
             '-H', f'Content-Type: {ct}',
             '--data-binary', f'@{local_path}',
             upload_url],
            capture_output=True, text=True, timeout=60)
        resp = json.loads(result.stdout)

        if 'name' in resp:
            # Build the public download URL
            cdn_url = f'{FB_STORAGE_API}/o/{encoded_name}?alt=media'
            return cdn_url
        else:
            print(f"    Upload error: {resp.get('error', {}).get('message', 'unknown')}")
            return None
    except Exception as e:
        print(f"    Upload failed: {e}")
        return None

def main():
    if not os.path.isdir(TRAVEL_DIR):
        print(f"Directory {TRAVEL_DIR} not found")
        return

    files = sorted([f for f in os.listdir(TRAVEL_DIR)
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic'))])

    print(f"Found {len(files)} images in {TRAVEL_DIR}/")

    # Load cache from Firebase
    cache = fb_load_cache()
    photo_cache = cache.get('photos', {})
    geo_cache = cache.get('geocode', {})

    places = []
    new_count = 0
    cached_count = 0

    for f in files:
        path = os.path.join(TRAVEL_DIR, f)
        fhash = file_hash(path)

        # Check if this exact file was already processed
        if f in photo_cache and photo_cache[f].get('hash') == fhash:
            places.append(photo_cache[f]['data'])
            cached_count += 1
            continue

        # New or changed file — process it
        print(f"  Processing: {f}")
        gps = get_exif_gps(path)
        if not gps:
            print(f"    ✗ No GPS data, skipping")
            continue

        # Reverse geocode (cache by rounded coords)
        coord_key = f"{gps['lat']:.1f},{gps['lng']:.1f}"
        if coord_key not in geo_cache:
            location = reverse_geocode(gps['lat'], gps['lng'])
            geo_cache[coord_key] = location
            time.sleep(1)  # respect Nominatim rate limit
        else:
            location = geo_cache[coord_key]

        # Upload to Firebase Storage
        print(f"    Uploading to Firebase Storage...")
        cdn_url = fb_upload_photo(path, f)
        if not cdn_url:
            print(f"    ✗ Upload failed, using local path")
            cdn_url = f'img/travel/{f}'

        entry = {
            'file': f,
            'lat': gps['lat'],
            'lng': gps['lng'],
            'date': gps['date'],
            'location': location,
            'url': cdn_url,
        }
        places.append(entry)
        photo_cache[f] = {'hash': fhash, 'data': entry}
        new_count += 1
        print(f"    ✓ {location} ({gps['lat']}, {gps['lng']}) {gps['date']}")

    # Remove deleted files from cache
    for f in list(photo_cache.keys()):
        if f not in files:
            del photo_cache[f]

    # Save cache to Firebase
    cache['photos'] = photo_cache
    cache['geocode'] = geo_cache
    fb_save_cache(cache)

    # Generate JS — use CDN URLs from Firebase Storage
    js_lines = [
        '/*',
        ' * places.js — Auto-generated by build-travel.py',
        ' * Photos hosted on Firebase Storage. Cache in Firebase Realtime Database.',
        ' * DO NOT EDIT MANUALLY. Run: python3 build-travel.py',
        ' */',
        f'const PLACES = {json.dumps(places, indent=2)};',
    ]

    with open(OUTPUT, 'w') as f:
        f.write('\n'.join(js_lines) + '\n')

    print(f"\nDone: {len(places)} places ({new_count} new, {cached_count} cached)")

if __name__ == '__main__':
    main()
