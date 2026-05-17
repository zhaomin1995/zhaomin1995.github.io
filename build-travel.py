#!/usr/bin/env python3
"""
Scan img/travel/ for photos with GPS EXIF data and generate
assets/js/places.js for the 3D globe on the travel page.

Uses a local cache (.travel-cache.json) so only new/changed photos
are processed. Repeat runs are near-instant.

Usage: python3 build-travel.py
Runs automatically via the pre-commit hook when img/travel/ changes.
"""

import os, json, time, subprocess, hashlib
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

TRAVEL_DIR = 'img/travel'
OUTPUT = 'assets/js/places.js'
CACHE_FILE = '.travel-cache.json'

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
    """Convert lat/lng to 'City, State' using free Nominatim API via curl."""
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

def load_cache():
    """Load the persistent cache of previously processed photos."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE) as f:
                return json.load(f)
        except:
            pass
    return {'photos': {}, 'geocode': {}}

def save_cache(cache):
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2)

def main():
    if not os.path.isdir(TRAVEL_DIR):
        print(f"Directory {TRAVEL_DIR} not found")
        return

    files = sorted([f for f in os.listdir(TRAVEL_DIR)
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic'))])

    cache = load_cache()
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
        gps = get_exif_gps(path)
        if not gps:
            print(f"  ✗ {f} — no GPS data, skipping")
            continue

        # Reverse geocode (cache by rounded coords)
        coord_key = f"{gps['lat']:.1f},{gps['lng']:.1f}"
        if coord_key not in geo_cache:
            location = reverse_geocode(gps['lat'], gps['lng'])
            geo_cache[coord_key] = location
            time.sleep(1)  # respect Nominatim rate limit
        else:
            location = geo_cache[coord_key]

        entry = {
            'file': f,
            'lat': gps['lat'],
            'lng': gps['lng'],
            'date': gps['date'],
            'location': location,
        }
        places.append(entry)
        photo_cache[f] = {'hash': fhash, 'data': entry}
        new_count += 1
        print(f"  ✓ {f} → {location} ({gps['lat']}, {gps['lng']}) {gps['date']}")

    # Remove deleted files from cache
    for f in list(photo_cache.keys()):
        if f not in files:
            del photo_cache[f]

    # Save cache
    cache['photos'] = photo_cache
    cache['geocode'] = geo_cache
    save_cache(cache)

    # Generate JS
    js_lines = [
        '/*',
        ' * places.js — Auto-generated by build-travel.py',
        ' * DO NOT EDIT MANUALLY. Run: python3 build-travel.py',
        ' */',
        f'const PLACES = {json.dumps(places, indent=2)};',
    ]

    with open(OUTPUT, 'w') as f:
        f.write('\n'.join(js_lines) + '\n')

    print(f"\nGenerated {OUTPUT}: {len(places)} places ({new_count} new, {cached_count} cached)")

if __name__ == '__main__':
    main()
