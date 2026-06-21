/* ══════════════════════════════════════════════════════════════════════
   futures.js — Futures Tracker tab
   ══════════════════════════════════════════════════════════════════════ */

let _futData = [], _futFiltered = [];

function renderFutures(data) {
  const pg = document.getElementById('page-futures');
  if (!data || !pg) return;

  _futData = data.near_month || [];

  pg.innerHTML = `
    <div class="filter-bar">
      <input id="fut-search" type="search" placeholder="Search symbol…">
      <select id="fut-signal">
        <option value="">All Signals</option>
        <option value="LB">Long Buildup</option>
        <option value="SB">Short Buildup</option>
        <option value="LU">Long Unwinding</option>
        <option value="SC">Short Covering</option>
      </select>
      <select id="fut-sort">
        <option value="oi_desc">OI ↓</option>
        <option value="price_desc">Chg% ↓</option>
        <option value="price_asc">Chg% ↑</option>
        <option value="basis_desc">Basis% ↓</option>
        <option value="conv_desc">Conv ↓</option>
      </select>
    </div>
    <div id="fut-count" style="font-size:11px;color:var(--fg2);margin-bottom:6px"></div>
    <div class="tbl-wrap">
      <table id="tbl-futures">
        <thead><tr>
          <th>Symbol</th>
          <th>LTP</th>
          <th>Chg%</th>
          <th>OI</th>
          <th>OI Chg</th>
          <th>Basis%</th>
          <th>Conv</th>
          <th>Sig</th>
        </tr></thead>
        <tbody id="fut-tbody"></tbody>
      </table>
    </div>
  `;

  const search = document.getElementById('fut-search');
  const signal = document.getElementById('fut-signal');
  const sort   = document.getElementById('fut-sort');

  function applyFilters() {
    const q  = search.value.trim().toUpperCase();
    const sg = signal.value;
    const so = sort.value;

    let rows = _futData.filter(r =>
      (!q  || r.symbol.includes(q)) &&
      (!sg || r.signal === sg)
    );

    rows.sort((a,b) => {
      switch(so) {
        case 'price_desc': return parseFloat(b.price_chg||0) - parseFloat(a.price_chg||0);
        case 'price_asc':  return parseFloat(a.price_chg||0) - parseFloat(b.price_chg||0);
        case 'basis_desc': return parseFloat(b.basis_pct||0) - parseFloat(a.basis_pct||0);
        case 'conv_desc':  return parseFloat(b.conv_score||0) - parseFloat(a.conv_score||0);
        default:           return parseInt(b.oi||0) - parseInt(a.oi||0);
      }
    });
    _futFiltered = rows;
    renderFutureRows(rows);
  }

  search.addEventListener('input',  applyFilters);
  signal.addEventListener('change', applyFilters);
  sort.addEventListener('change',   applyFilters);
  applyFilters();
}

function renderFutureRows(rows) {
  const tbody = document.getElementById('fut-tbody');
  const count = document.getElementById('fut-count');
  if (!tbody) return;
  count.textContent = `${rows.length} symbols`;

  tbody.innerHTML = rows.map(r => {
    const pc  = parseFloat(r.price_chg || 0);
    const oi  = parseInt(r.oi || 0);
    const oic = parseInt(r.oi_chg || 0);
    const oicp = oi>0&&(oi-oic)>0 ? ((oic/(oi-oic))*100).toFixed(1) : '0.0';
    const ltp  = parseFloat(r.ltp || 0);
    return `
      <tr class="${row_cls(r.signal)}" onclick='showFutureSheet(${JSON.stringify(r)})'>
        <td>${ban_badge(r)}<strong>${r.symbol}</strong></td>
        <td class="bold">₹${ltp>=10000?ltp.toFixed(0):ltp.toFixed(2)}</td>
        <td class="${pc>=0?'up':'down'} bold">${pc>=0?'+':''}${pc.toFixed(2)}%</td>
        <td>${fmt_oi(r.oi)}</td>
        <td class="${parseFloat(oicp)>=0?'up':'down'}">${parseFloat(oicp)>=0?'+':''}${oicp}%</td>
        <td class="${parseFloat(r.basis_pct||0)>=0?'up':'down'}">${parseFloat(r.basis_pct||0).toFixed(2)}%</td>
        <td>${parseFloat(r.conv_score||0).toFixed(1)}</td>
        <td>${sig_badge(r.signal)}</td>
      </tr>`;
  }).join('');
}

function showFutureSheet(r) {
  if (typeof r === 'string') try { r = JSON.parse(r); } catch { return; }
  const pc   = parseFloat(r.price_chg || 0);
  const oi   = parseInt(r.oi || 0);
  const oic  = parseInt(r.oi_chg || 0);
  const oicp = oi>0&&(oi-oic)>0 ? ((oic/(oi-oic))*100).toFixed(2) : '0.00';

  // Mini OI sparkline (last 6 days)
  const hist = r.oi_history || [];
  let spark = '';
  if (hist.length > 1) {
    const max = Math.max(...hist), min = Math.min(...hist);
    const range = max - min || 1;
    const pts = hist.map((v,i) => {
      const x = (i / (hist.length-1)) * 80;
      const y = 20 - ((v-min)/range)*18;
      return `${x},${y}`;
    }).join(' ');
    const lastUp = hist[hist.length-1] >= hist[hist.length-2];
    spark = `<div style="margin:8px 0 4px">
      <div style="font-size:10px;color:var(--fg2);margin-bottom:4px">OI Trend (6d)</div>
      <svg width="80" height="22" style="display:block">
        <polyline points="${pts}" fill="none"
          stroke="${lastUp?'#22c55e':'#ef4444'}" stroke-width="1.5"/>
      </svg>
    </div>`;
  }

  openSheet(`
    ${spark}
    <div class="sheet-row"><span class="lbl">LTP</span>
      <span class="val bold">₹${parseFloat(r.ltp||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>
    <div class="sheet-row"><span class="lbl">Spot</span>
      <span class="val">₹${parseFloat(r.spot||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>
    <div class="sheet-row"><span class="lbl">Price Change</span>
      <span class="val ${pc>=0?'up':'down'} bold">${pc>=0?'+':''}${pc.toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">Open Interest</span>
      <span class="val">${fmt_oi(r.oi)} lots</span></div>
    <div class="sheet-row"><span class="lbl">OI Change</span>
      <span class="val ${parseFloat(oicp)>=0?'up':'down'}">${parseFloat(oicp)>=0?'+':''}${oicp}%</span></div>
    <div class="sheet-row"><span class="lbl">Basis</span>
      <span class="val">₹${parseFloat(r.basis||0).toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">Basis%</span>
      <span class="val ${parseFloat(r.basis_pct||0)>=0?'up':'down'}">${parseFloat(r.basis_pct||0).toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">Fair Value</span>
      <span class="val">₹${parseFloat(r.fair_value||0).toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">FV Diff</span>
      <span class="val">${parseFloat(r.fv_diff||0).toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">Conv. Score</span>
      <span class="val">${parseFloat(r.conv_score||0).toFixed(1)}</span></div>
    <div class="sheet-row"><span class="lbl">Signal</span>
      <span class="val">${sig_badge(r.signal)}</span></div>
    <div class="sheet-row"><span class="lbl">Pattern</span>
      <span class="val">${r.pattern||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">5d Price Chg%</span>
      <span class="val">${parseFloat(r.price_5d_pct||0).toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">5d OI Chg%</span>
      <span class="val">${parseFloat(r.oi_5d_pct||0).toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">Days to Expiry</span>
      <span class="val">${r.days_to_exp||'—'} (${r.expiry||''})</span></div>
    <div class="sheet-row"><span class="lbl">Lot Size</span>
      <span class="val">${r.lot||'—'}</span></div>
    ${r.alerts ? `<div class="sheet-row"><span class="lbl">Alerts</span>
      <span class="val">${r.alerts}</span></div>` : ''}
  `, (r.ban_status==='ban'?'🚫 ':'')+r.symbol+' — Futures');
}
window.showFutureSheet = showFutureSheet;
window.renderFutures   = renderFutures;
