# MUSICDECK (versi satu deployment — Vercel doang)

Frontend + backend jadi satu project Vercel. Nggak perlu GitHub Pages, nggak perlu isi URL proxy manual — semuanya di satu origin.

```
musicdeck-vercel/
├── index.html
├── style.css
├── app.js
├── requirements.txt
├── vercel.json
└── api/
    ├── search.py     → GET /api/search?q=...
    └── lyrics.py     → GET /api/lyrics?title=...&artist=...
```

## Cara upload ke GitHub (biar folder `api/` nggak ke-flatten)

Upload lewat drag file satu-satu di web GitHub sering ngerusak struktur folder. Cara paling aman:

**Opsi A — pakai GitHub Desktop (paling gampang, ada GUI)**
1. Install [GitHub Desktop](https://desktop.github.com/).
2. File → New Repository → kasih nama `musicdeck` → Local Path arahin ke folder yang isinya file-file di atas (bukan ke folder induknya).
3. Publish repository.

**Opsi B — pakai `git` di terminal**
```bash
cd musicdeck-vercel
git init
git add .
git commit -m "musicdeck v1"
git branch -M main
git remote add origin https://github.com/USERNAME/musicdeck.git
git push -u origin main
```

**Opsi C — kalau tetep mau lewat web GitHub:**
Upload file `index.html`, `style.css`, `app.js`, `requirements.txt`, `vercel.json` dulu ke root. Lalu klik **Add file → Create new file**, di kotak nama file ketik `api/search.py` (ketik slash-nya manual) — GitHub otomatis bikin foldernya. Paste isi `search.py` ke situ, commit. Ulangi buat `api/lyrics.py`. Cara ini yang bikin folder `api/` beneran kebentuk meskipun upload manual.

## Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new) → pilih **GitHub** → pilih repo `musicdeck` kamu.
2. **Root Directory** biarin default (repo-nya sendiri udah jadi root, nggak perlu diarahin ke subfolder lagi).
3. Klik **Deploy**. Tunggu proses build selesai.
4. Selesai — kamu dapet satu URL, misal `https://musicdeck.vercel.app`, yang langsung nyajiin situsnya DAN jalanin API-nya sekaligus.

Cek: buka `https://musicdeck.vercel.app` → coba search lagu. Kalau hasil pencarian muncul, backend & frontend udah nyambung otomatis (nggak perlu setting apa-apa lagi).

## Batasan yang perlu kamu tahu

- **LRCLIB** itu database komunitas — gratis, tanpa API key, tapi cakupannya nggak selengkap database komersial buat lagu obscure/lokal.
- **ytmusicapi** manggil endpoint internal (nggak resmi) YouTube Music — bisa berubah sewaktu-waktu kalau Google ubah struktur internalnya.
- **VU meter** di header itu dekoratif (ngikutin status play/pause), bukan analisis audio real-time.
- Vercel Hobby (gratis) cukup buat pemakaian pribadi — 1 juta invocation/bulan, terbatas ke pemakaian non-komersial.
