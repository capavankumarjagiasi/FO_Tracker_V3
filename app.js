/* ══════════════════════════════════════════════════════════════════════
   app.js — NSE F&O Tracker PWA — SDK Fintech
   Main: data load, router, tab nav, utilities
   ══════════════════════════════════════════════════════════════════════ */

// ── Config — CHANGE THIS URL to your GitHub raw JSON URL ─────────────
const DATA_URL = 'https://raw.githubusercontent.com/YOUR_GITHUB_USER/YOUR_REPO/main/fo_snapshot_v3.json';
const REFRESH_MS = 5 * 60 * 1000;  // 5 min

// ── Global state ──────────────────────────────────────────────────────
window.FO = {
  data:      null,
  loading:   false,
  lastFetch: null,
  offline:   false,
  tab:       'pulse',
};

// ── DOM refs ──────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Register service worker ───────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'BG_REFRESH') loadData();
  });
}

// ── Data loader ───────────────────────────────────────────────────────
async function loadData(force = false) {
  if (FO.loading) return;
  FO.loading = true;
  showPTR(true);

  try {
    const url = force ? DATA_URL + '?t=' + Date.now() : DATA_URL;
    const resp = await fetch(url, { cache: force ? 'no-cache' : 'default' });

    if (resp.ok) {
      FO.data     = await resp.json();
      FO.lastFetch = new Date();
      FO.offline  = false;
      setOfflineBanner(false);
      updateTimestamp();
      renderCurrentTab();
      showToast('Data updated · ' + fmt_time(FO.lastFetch));
    } else {
      throw new Error('HTTP ' + resp.status);
    }
  } catch (err) {
    // Try cache
    try {
      const cached = await caches.match(DATA_URL);
      if (cached) {
        FO.data    = await cached.json();
        FO.offline = true;
        setOfflineBanner(true, FO.data?.meta?.date_fmt);
        updateTimestamp();
        renderCurrentTab();
      } else {
        showError();
      }
    } catch {
      showError();
    }
  } finally {
    FO.loading = false;
    showPTR(false);
  }
}

// ── Tab router ────────────────────────────────────────────────────────
const TAB_RENDERERS = {
  pulse:    () => window.renderPulse    && renderPulse(FO.data),
  futures:  () => window.renderFutures  && renderFutures(FO.data),
  oi:       () => window.renderOI       && renderOI(FO.data),
  rollover: () => window.renderRollover && renderRollover(FO.data),
  basis:    () => window.renderBasis    && renderBasis(FO.data),
};

function switchTab(name) {
  FO.tab = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const pg = $('page-' + name);
  if (pg) pg.classList.add('active');
  const btn = $('tab-' + name);
  if (btn) btn.classList.add('active');
  renderCurrentTab();
}

function renderCurrentTab() {
  if (!FO.data) return;
  const fn = TAB_RENDERERS[FO.tab];
  if (fn) try { fn(); } catch(e) { console.error('Render error:', e); }
}

// ── Swipe navigation ──────────────────────────────────────────────────
const TABS = ['pulse','futures','oi','rollover','basis'];
let touchX0 = 0;
document.addEventListener('touchstart', e => { touchX0 = e.touches[0].clientX; }, {passive: true});
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchX0;
  if (Math.abs(dx) < 60) return;
  const idx = TABS.indexOf(FO.tab);
  if (dx < 0 && idx < TABS.length - 1) switchTab(TABS[idx + 1]);
  if (dx > 0 && idx > 0)               switchTab(TABS[idx - 1]);
}, {passive: true});

// ── Pull-to-refresh ───────────────────────────────────────────────────
let ptY0 = 0, pulling = false;
document.addEventListener('touchstart', e => {
  const pg = document.querySelector('.page.active');
  if (pg && pg.scrollTop === 0) { ptY0 = e.touches[0].clientY; pulling = true; }
}, {passive: true});
document.addEventListener('touchend', e => {
  if (pulling && e.changedTouches[0].clientY - ptY0 > 60) loadData(true);
  pulling = false;
}, {passive: true});

// ── Bottom sheet ──────────────────────────────────────────────────────
function openSheet(html, title) {
  const overlay = $('sheet-overlay');
  const sheet   = $('bottom-sheet');
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <div class="sheet-title">${title}</div>
    ${html}
  `;
  overlay.classList.add('show');
  requestAnimationFrame(() => sheet.classList.add('open'));
}
function closeSheet() {
  $('sheet-overlay').classList.remove('show');
  $('bottom-sheet').classList.remove('open');
}
document.getElementById('sheet-overlay').addEventListener('click', closeSheet);

// ── Helpers ───────────────────────────────────────────────────────────
function fmt_inr(v) {
  if (v == null || isNaN(v)) return '—';
  const n = parseFloat(v);
  if (Math.abs(n) >= 1e7)  return '₹' + (n/1e7).toFixed(2) + 'Cr';
  if (Math.abs(n) >= 1e5)  return '₹' + (n/1e5).toFixed(2) + 'L';
  return '₹' + n.toLocaleString('en-IN', {maximumFractionDigits: 2});
}
function fmt_num(v, dec=2) {
  if (v == null || isNaN(v)) return '—';
  return parseFloat(v).toFixed(dec);
}
function fmt_pct(v, dec=2) {
  if (v == null || isNaN(v)) return '—';
  const n = parseFloat(v);
  const cls = n > 0 ? 'up' : n < 0 ? 'down' : 'neu';
  const sign = n > 0 ? '+' : '';
  return `<span class="${cls}">${sign}${n.toFixed(dec)}%</span>`;
}
function fmt_oi(v) {
  if (v == null) return '—';
  const n = parseInt(v);
  if (n >= 1e7) return (n/1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return (n/1e5).toFixed(2) + 'L';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toString();
}
function fmt_time(d) {
  return d.toTimeString().slice(0,5);
}
function sig_badge(s) {
  if (!s) return '';
  const map = {LB:'lb',SB:'sb',LU:'lu',SC:'sc'};
  return `<span class="sig sig-${map[s]||''}">${s}</span>`;
}
function price_cls(v) { return parseFloat(v) > 0 ? 'up' : parseFloat(v) < 0 ? 'down' : 'neu'; }
function row_cls(sig) { return sig ? sig.toLowerCase() : ''; }
function ban_badge(r) {
  return r?.ban_status === 'ban' ? '<span class="ban-badge">BAN</span>' : '';
}
window.fmt_inr   = fmt_inr;
window.fmt_num   = fmt_num;
window.fmt_pct   = fmt_pct;
window.fmt_oi    = fmt_oi;
window.sig_badge = sig_badge;
window.price_cls = price_cls;
window.row_cls   = row_cls;
window.ban_badge = ban_badge;
window.openSheet = openSheet;
window.closeSheet= closeSheet;

// ── Sort table helper ─────────────────────────────────────────────────
function makeSortable(tableId) {
  const tbl = document.getElementById(tableId);
  if (!tbl) return;
  let sortCol = -1, sortAsc = true;
  tbl.querySelectorAll('th').forEach((th, i) => {
    th.addEventListener('click', () => {
      const tbody = tbl.querySelector('tbody');
      const rows  = Array.from(tbody.querySelectorAll('tr'));
      if (sortCol === i) sortAsc = !sortAsc; else { sortCol = i; sortAsc = true; }
      rows.sort((a, b) => {
        const av = a.cells[i]?.innerText.replace(/[₹%+,]/g,'').trim() || '';
        const bv = b.cells[i]?.innerText.replace(/[₹%+,]/g,'').trim() || '';
        const an = parseFloat(av), bn = parseFloat(bv);
        if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an-bn : bn-an;
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
      rows.forEach(r => tbody.appendChild(r));
      tbl.querySelectorAll('th').forEach((h,j) => {
        h.textContent = h.textContent.replace(' ↑','').replace(' ↓','');
        if (j === i) h.textContent += sortAsc ? ' ↑' : ' ↓';
      });
    });
  });
}
window.makeSortable = makeSortable;

// ── UI helpers ────────────────────────────────────────────────────────
function setOfflineBanner(on, date) {
  const b = $('offline-banner');
  if (on) {
    b.textContent = '⚠ Offline — showing cached data' + (date ? ' as of ' + date : '');
    b.classList.add('show');
    $('content').classList.add('has-banner');
  } else {
    b.classList.remove('show');
    $('content').classList.remove('has-banner');
  }
}
function updateTimestamp() {
  const meta = FO.data?.meta;
  if (meta) {
    $('data-ts').textContent = (meta.date_fmt || meta.date || '') +
      ' · ' + (FO.lastFetch ? fmt_time(FO.lastFetch) : '');
  }
}
function showPTR(on) {
  const s = $('ptr-spinner');
  if (s) s.classList.toggle('show', on);
}
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function showError() {
  ['page-pulse','page-futures','page-oi','page-rollover','page-basis'].forEach(id => {
    const p = $(id);
    if (p && !p.querySelector('.error-state')) {
      p.innerHTML = `
        <div class="error-state">
          <div class="err-icon">⚠</div>
          <div>Could not load data</div>
          <button class="retry-btn" onclick="loadData(true)">Retry</button>
        </div>`;
    }
  });
}

// ── Theme toggle ──────────────────────────────────────────────────────
function toggleTheme() {
  document.body.classList.toggle('light');
  $('theme-btn').textContent = document.body.classList.contains('light') ? '🌙' : '☀️';
  localStorage.setItem('fo-theme', document.body.classList.contains('light') ? 'light' : 'dark');
}
if (localStorage.getItem('fo-theme') === 'light') {
  document.body.classList.add('light');
  const tb = $('theme-btn');
  if (tb) tb.textContent = '🌙';
}

// ── Auto-refresh ──────────────────────────────────────────────────────
setInterval(() => loadData(), REFRESH_MS);

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  switchTab('pulse');
  loadData();
});
