const el = (id) => document.getElementById(id);
const searchForm = el('searchForm');
const searchInput = el('searchInput');
const statusLine = el('statusLine');
const trackList = el('trackList');
const npArt = el('npArt');
const npTitle = el('npTitle');
const npArtist = el('npArtist');
const npTapeFill = el('npTapeFill');
const lyricsBox = el('lyricsBox');
const lyricsSource = el('lyricsSource');
const btnPlay = el('btnPlay');
const btnStop = el('btnStop');
const seek = el('seek');
const timeLabel = el('timeLabel');

let currentTrack = null;
let player = null;
let playerReady = false;
let seekDragging = false;

function setStatus(msg) { statusLine.textContent = `— ${msg} —`; }

// ====== SEARCH ======
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  setStatus(`nyari "${q}"...`);
  trackList.innerHTML = '';
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (data.error) {
      setStatus(`error: ${data.error}`);
      return;
    }
    renderTracks(data.results || []);
    setStatus(`${(data.results || []).length} hasil buat "${q}"`);
  } catch (err) {
    setStatus(`gagal manggil API: ${err.message}`);
  }
});

function renderTracks(tracks) {
  trackList.innerHTML = '';
  if (!tracks.length) {
    trackList.innerHTML = '<li class="empty-hint">nggak ada hasil.</li>';
    return;
  }
  tracks.forEach((t, i) => {
    if (!t.videoId) return;
    const li = document.createElement('li');
    li.className = 'track-item';
    li.innerHTML = `
      <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
      <img class="track-thumb" src="${t.thumbnail || ''}" alt="" />
      <div class="track-info">
        <div class="track-title">${escapeHtml(t.title || 'Tanpa judul')}</div>
        <div class="track-artist">${escapeHtml(t.artist || '')}</div>
      </div>
      <span class="track-dur">${t.duration || ''}</span>
    `;
    li.addEventListener('click', () => playTrack(t, li));
    trackList.appendChild(li);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ====== YOUTUBE IFRAME PLAYER ======
// Playback pakai YouTube IFrame Player API resmi (bukan ekstraksi stream mentah).
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytPlayer', {
    height: '0', width: '0',
    playerVars: { autoplay: 0, controls: 0 },
    events: {
      onReady: () => { playerReady = true; },
      onStateChange: onPlayerStateChange,
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    btnPlay.textContent = '❚❚';
    startVu();
    startProgressLoop();
  } else if (e.data === YT.PlayerState.PAUSED) {
    btnPlay.textContent = '▶';
    stopVu();
  } else if (e.data === YT.PlayerState.ENDED) {
    btnPlay.textContent = '▶';
    stopVu();
  }
}

function playTrack(track, liEl) {
  if (!playerReady) {
    setStatus('player YouTube belum siap, tunggu sebentar...');
    return;
  }
  document.querySelectorAll('.track-item.active').forEach((n) => n.classList.remove('active'));
  if (liEl) liEl.classList.add('active');

  currentTrack = track;
  npTitle.textContent = track.title || '—';
  npArtist.textContent = track.artist || '';
  npArt.src = track.thumbnail || '';

  player.loadVideoById(track.videoId);
  fetchLyrics(track.title, track.artist);
}

btnPlay.addEventListener('click', () => {
  if (!player || !currentTrack) return;
  const state = player.getPlayerState();
  if (state === YT.PlayerState.PLAYING) player.pauseVideo();
  else player.playVideo();
});

btnStop.addEventListener('click', () => {
  if (!player) return;
  player.stopVideo();
  btnPlay.textContent = '▶';
  stopVu();
  seek.value = 0;
  npTapeFill.style.width = '0%';
});

// ====== SEEK BAR & TIME ======
let progressTimer = null;
function startProgressLoop() {
  if (progressTimer) return;
  progressTimer = setInterval(() => {
    if (!player || !player.getDuration || seekDragging) return;
    const dur = player.getDuration() || 0;
    const cur = player.getCurrentTime() || 0;
    if (dur > 0) {
      seek.value = (cur / dur) * 100;
      npTapeFill.style.width = `${(cur / dur) * 100}%`;
    }
    timeLabel.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
    updateSyncedLyrics(cur);
    if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }, 500);
}
function fmtTime(s) {
  s = Math.floor(s || 0);
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}
seek.addEventListener('mousedown', () => { seekDragging = true; });
seek.addEventListener('touchstart', () => { seekDragging = true; });
seek.addEventListener('change', () => {
  if (!player || !player.getDuration) { seekDragging = false; return; }
  const dur = player.getDuration() || 0;
  player.seekTo((seek.value / 100) * dur, true);
  seekDragging = false;
});

// ====== VU METER (dekoratif, ngikutin status play — bukan analisis audio asli, ======
// ====== karena audio iframe YouTube nggak bisa diakses via Web Audio API cross-origin) ======
let vuTimer = null;
function startVu() {
  if (vuTimer) return;
  vuTimer = setInterval(() => {
    el('vuL').style.width = `${8 + Math.random() * 85}%`;
    el('vuR').style.width = `${8 + Math.random() * 85}%`;
  }, 140);
}
function stopVu() {
  clearInterval(vuTimer);
  vuTimer = null;
  el('vuL').style.width = '5%';
  el('vuR').style.width = '5%';
}

// ====== LYRICS (LRCLIB — plain + synced) ======
let syncedLines = []; // [{ time: seconds, text: "..." }]
let lyricsMode = 'none'; // 'synced' | 'plain' | 'none'

function parseLrc(lrc) {
  const lines = [];
  const re = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  lrc.split('\n').forEach((line) => {
    const matches = [...line.matchAll(re)];
    if (!matches.length) return;
    const text = line.replace(re, '').trim();
    matches.forEach((m) => {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const ms = m[3] ? parseInt(m[3].padEnd(3, '0'), 10) : 0;
      lines.push({ time: min * 60 + sec + ms / 1000, text });
    });
  });
  return lines.sort((a, b) => a.time - b.time);
}

async function fetchLyrics(title, artist) {
  lyricsBox.textContent = 'ngambil lirik dari LRCLIB...';
  lyricsSource.textContent = '';
  syncedLines = [];
  lyricsMode = 'none';

  try {
    const res = await fetch(`/api/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
    const data = await res.json();

    if (data.instrumental) {
      lyricsBox.textContent = '(instrumental — nggak ada lirik)';
      return;
    }

    if (data.synced) {
      syncedLines = parseLrc(data.synced);
      lyricsMode = 'synced';
      renderSyncedLyrics(-1);
      lyricsSource.textContent = '(sumber: LRCLIB, ter-sync)';
    } else if (data.lyrics) {
      lyricsBox.textContent = data.lyrics;
      lyricsMode = 'plain';
      lyricsSource.textContent = '(sumber: LRCLIB)';
    } else {
      lyricsBox.textContent = 'lirik nggak ketemu buat lagu ini.';
    }
  } catch (err) {
    lyricsBox.textContent = `gagal ngambil lirik: ${err.message}`;
  }
}

function renderSyncedLyrics(activeIdx) {
  lyricsBox.innerHTML = syncedLines
    .map((l, i) => `<div class="lyric-line${i === activeIdx ? ' active' : ''}" data-i="${i}">${escapeHtml(l.text || '♪')}</div>`)
    .join('');
  if (activeIdx >= 0) {
    const activeEl = lyricsBox.querySelector('.lyric-line.active');
    if (activeEl) activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

let lastSyncedIdx = -1;
function updateSyncedLyrics(currentTime) {
  if (lyricsMode !== 'synced' || !syncedLines.length) return;
  let idx = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (syncedLines[i].time <= currentTime) idx = i;
    else break;
  }
  if (idx !== lastSyncedIdx) {
    lastSyncedIdx = idx;
    renderSyncedLyrics(idx);
  }
}
