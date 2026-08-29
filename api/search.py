from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
from ytmusicapi import YTMusic

_yt = None


def get_client():
    global _yt
    if _yt is None:
        _yt = YTMusic()
    return _yt


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
        q = query.get('q', [''])[0].strip()

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self._cors()
        self.end_headers()

        if not q:
            self.wfile.write(json.dumps({"results": []}).encode())
            return

        try:
            yt = get_client()
            raw = yt.search(q, filter="songs", limit=20)
            songs = []
            for r in raw:
                thumbs = r.get("thumbnails") or []
                songs.append({
                    "videoId": r.get("videoId"),
                    "title": r.get("title"),
                    "artist": ", ".join(a.get("name", "") for a in r.get("artists") or []),
                    "album": (r.get("album") or {}).get("name"),
                    "duration": r.get("duration"),
                    "thumbnail": thumbs[-1]["url"] if thumbs else None,
                })
            self.wfile.write(json.dumps({"results": songs}).encode())
        except Exception as e:
            self.wfile.write(json.dumps({"error": str(e), "results": []}).encode())
