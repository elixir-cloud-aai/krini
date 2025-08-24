import socket
import requests
import json
import os

TES_INSTANCES_FILE = '.tes_instances'
OUTPUT_FILE = 'tes_instance_locations.json'
GEO_API = 'http://ip-api.com/json/'  # Free, limited to 45 requests/minute

def geolocate_ip(ip):
    try:
        resp = requests.get(f"{GEO_API}{ip}", timeout=5)
        data = resp.json()
        if data['status'] == 'success':
            return {
                'country': data.get('country', ''),
                'lat': data.get('lat', None),
                'lon': data.get('lon', None)
            }
    except Exception:
        pass
    return {'country': '', 'lat': None, 'lon': None}

def main():
    if not os.path.exists(TES_INSTANCES_FILE):
        print(f"{TES_INSTANCES_FILE} not found.")
        return
    instances = []
    with open(TES_INSTANCES_FILE) as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue
            if ',' in line:
                name, url = line.split(',', 1)
                # Clean up URL: remove any comments, trailing slashes, or whitespace
                url = url.strip()
                if '#' in url:
                    url = url.split('#')[0].strip()
                url = url.rstrip('/')  # Remove trailing slash
                name = name.strip()
                
                # Skip if name or URL is empty after cleaning
                if not name or not url:
                    continue
                    
                hostname = url.split('//')[-1].split('/')[0]
                try:
                    ip = socket.gethostbyname(hostname)
                    loc = geolocate_ip(ip)
                except Exception:
                    loc = {'country': '', 'lat': None, 'lon': None}
                instance = {
                    'name': name,
                    'url': url,
                    'ip': ip if 'ip' in locals() else '',
                    'country': loc['country'],
                    'lat': loc['lat'],
                    'lon': loc['lon']
                }
                instances.append(instance)
    with open(OUTPUT_FILE, 'w') as out:
        json.dump(instances, out, indent=2)
    print(f"Wrote {len(instances)} TES instance locations to {OUTPUT_FILE}")

if __name__ == '__main__':
    main() 