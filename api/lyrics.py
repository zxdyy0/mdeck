from http.server import BaseHTTPRequestHandler
import json
import requests
from urllib.parse import urlparse, parse_qs

LRCLIB_BASE = "https://lrclib.net/api"
HEADERS = {"User-Agent": "MusicDeck v1 (github.com hobby project)"}


def fetch_lrclib(title, artist):
    """Coba /get dulu (match presisi), jatuh ke /search kalau nggak ketemu."""
    try:
        r = requests.get(
            f"{LRCLIB_BASE}/get",
            params={"track_name": title, "artist_name": artist},
            headers=HEADERS,
            timeout=8,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("plainLyrics") or data.get("syncedLyrics"):
                return data
    except Exception:
        pass

    try:
        r = requests.get(
            f"{LRCLIB_BASE}/search",
            params={"track_name": title, "artist_name": artist},
            headers=HEADERS,
            timeout=8,
        )
        if r.status_code == 200:
            results = r.json()
            for item in results:
                if item.get("plainLyrics") or item.get("syncedLyrics"):
                    return item
    except Exception:
        pass

    return None


class handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        title = query.get('title', [''])[0].strip()
        artist = query.get('artist', [''])[0].strip()

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self._cors()
        self.end_headers()

        if not title:
            self.wfile.write(json.dumps({"error": "missing title"}).encode())
            return

        found = fetch_lrclib(title, artist)

        if not found:
            self.wfile.write(json.dumps({
                "lyrics": None,
                "synced": None,
                "source": None,
                "instrumental": False,
            }).encode())
            return

        result = {
            "lyrics": found.get("plainLyrics") or None,
            "synced": found.get("syncedLyrics") or None,
            "source": "LRCLIB",
            "instrumental": bool(found.get("instrumental")),
        }
        self.wfile.write(json.dumps(result).encode())
