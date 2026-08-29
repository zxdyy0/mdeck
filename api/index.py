from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
import requests

app = Flask(__name__)
CORS(app)

_yt = None


def get_yt():
    global _yt
    if _yt is None:
        _yt = YTMusic()
    return _yt


LRCLIB_BASE = "https://lrclib.net/api"
LRCLIB_HEADERS = {"User-Agent": "MusicDeck v1 (github.com hobby project)"}


def fetch_lrclib(title, artist):
    """Coba /get dulu (match presisi), jatuh ke /search kalau nggak ketemu."""
    try:
        r = requests.get(
            f"{LRCLIB_BASE}/get",
            params={"track_name": title, "artist_name": artist},
            headers=LRCLIB_HEADERS,
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
            headers=LRCLIB_HEADERS,
            timeout=8,
        )
        if r.status_code == 200:
            for item in r.json():
                if item.get("plainLyrics") or item.get("syncedLyrics"):
                    return item
    except Exception:
        pass

    return None


@app.route("/api/search", methods=["GET"])
def search():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"results": []})
    try:
        yt = get_yt()
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
        return jsonify({"results": songs})
    except Exception as e:
        return jsonify({"error": str(e), "results": []})


@app.route("/api/lyrics", methods=["GET"])
def lyrics():
    title = request.args.get("title", "").strip()
    artist = request.args.get("artist", "").strip()
    if not title:
        return jsonify({"error": "missing title"})

    found = fetch_lrclib(title, artist)
    if not found:
        return jsonify({"lyrics": None, "synced": None, "source": None, "instrumental": False})

    return jsonify({
        "lyrics": found.get("plainLyrics") or None,
        "synced": found.get("syncedLyrics") or None,
        "source": "LRCLIB",
        "instrumental": bool(found.get("instrumental")),
    })
