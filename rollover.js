/* ══════════════════════════════════════════════════════════════════════
   rollover.js — Rollover tab
   ══════════════════════════════════════════════════════════════════════ */

function renderRollover(data) {
  const pg = document.getElementById('page-rollover');
  if (!data || !pg) return;

  const rows = data.rollover || [];
  if (!rows.length) {
    pg.innerHTML = '<div class="error-state"><div class="err-icon">📭</div><div>No rollover data available</div></div>';
    return;
  }

  // Market-wide rollover%
  const totalNear = rows.reduce((s,r) => s + parseInt(r.oi_near||0), 0);
  const totalNext = rows.reduce((s,r) => s + parseInt(r.oi_next||0), 0);
  const mktRoll   = totalNear+totalNext > 0
    ? (totalNext/(totalNear+totalNext)*100).toFixed(1) : '—';

  pg.innerHTML = `
    <!-- Market rollover gauge -->
    <div class="card" style="text-align:center;margin-bottom:12px">
      <div class="card-title">Market Rollover %</div>
      <div style="font-size:48px;font-weight:700;color:var(--accent);line-height:1">${mktRoll}%</div>
      <div style="font-size:11px;color:var(--fg2);margin-top:4px">
        Near OI: ${fmt_oi(totalNear)} · Next OI: ${fmt_oi(totalNext)}
      </div>
      <!-- Arc gauge using CSS -->
      <div style="margin:12px auto;width:160px;height:80px;position:relative;overflow:hidden">
        <div style="position:absolute;bottom:0;left:0;width:160px;height:160px;
          border-radius:50%;border:12px solid var(--border);clip-path:inset(0 0 50% 0)"></div>
        <div style="position:absolute;bottom:0;left:0;width:160px;height:160px;
          border-radius:50%;border:12px solid var(--accent);clip-path:inset(0 0 50% 0);
          transform:rotate(${mktRoll*1.8-180}deg);transform-origin:50% 100%;
          transition:transform 0.5s ease"></div>
        <div style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);
          font-size:11px;color:var(--fg2)">${mktRoll}%</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <input id="ro-search" type="search" placeholder="Search symbol…">
      <select id="ro-bias">
        <option value="">All Signals</option>
        <option value="LB">Long Buildup</option>
        <option value="SB">Short Buildup</option>
        <option value="LU">Long Unwinding</option>
        <option value="SC">Short Covering</option>
      </select>
      <select id="ro-sort">
        <option value="roll_desc">Roll% ↓</option>
        <option value="roll_asc">Roll% ↑</option>
        <option value="oi_desc">OI ↓</option>
      </select>
    </div>

    <div class="tbl-wrap">
      <table id="tbl-rollover">
        <thead><tr>
          <th>Symbol</th>
          <th>Roll%</th>
          <th>Near OI</th>
          <th>Next OI</th>
          <th>CoC%</th>
          <th>Sig</th>
        </tr></thead>
        <tbody id="ro-tbody"></tbody>
      </table>
    </div>
  `;

  const search = document.getElementById('ro-search');
  const bias   = document.getElementById('ro-bias');
  const sort   = document.getElementById('ro-sort');

  function apply() {
    const q  = search.value.trim().toUpperCase();
    const sg = bias.value;
    const so = sort.value;
    let list = rows.filter(r =>
      (!q  || (r.symbol||'').includes(q)) &&
      (!sg || r.near_signal === sg)
    );
    list.sort((a,b) => {
      switch(so) {
        case 'roll_asc':  return parseFloat(a.rollover_pct||0) - parseFloat(b.rollover_pct||0);
        case 'oi_desc':   return parseInt(b.oi_near||0) - parseInt(a.oi_near||0);
        default:          return parseFloat(b.rollover_pct||0) - parseFloat(a.rollover_pct||0);
      }
    });
    renderRolloverRows(list);
  }

  search.addEventListener('input',  apply);
  bias.addEventListener('change',   apply);
  sort.addEventListener('change',   apply);
  apply();
}

function renderRolloverRows(rows) {
  const tbody = document.getElementById('ro-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => {
    const rp  = parseFloat(r.rollover_pct || 0);
    const coc = parseFloat(r.cost_of_carry || 0);
    const fillW = Math.min(rp, 100).toFixed(1);
    const fillC = rp >= 70 ? '#22c55e' : rp >= 40 ? '#1a7abf' : '#f59e0b';
    return `
      <tr class="${row_cls(r.near_signal)}" onclick='showRolloverSheet(${JSON.stringify(r)})'>
        <td><strong>${r.symbol}</strong></td>
        <td>
          <div style="font-weight:700">${rp.toFixed(1)}%</div>
          <div class="roll-bar"><div class="roll-fill" style="width:${fillW}%;background:${fillC}"></div></div>
        </td>
        <td>${fmt_oi(r.oi_near)}</td>
        <td>${fmt_oi(r.oi_next)}</td>
        <td class="${coc>=0?'up':'down'}">${coc>=0?'+':''}${coc.toFixed(2)}%</td>
        <td>${sig_badge(r.near_signal)}</td>
      </tr>`;
  }).join('');
}

function showRolloverSheet(r) {
  if (typeof r === 'string') try { r = JSON.parse(r); } catch { return; }
  const rp = parseFloat(r.rollover_pct || 0);
  openSheet(`
    <div class="sheet-row"><span class="lbl">Rollover %</span>
      <span class="val bold" style="font-size:20px">${rp.toFixed(1)}%</span></div>
    <div class="sheet-row"><span class="lbl">Near OI</span>
      <span class="val">${fmt_oi(r.oi_near)} lots</span></div>
    <div class="sheet-row"><span class="lbl">Next OI</span>
      <span class="val">${fmt_oi(r.oi_next)} lots</span></div>
    <div class="sheet-row"><span class="lbl">Near Expiry</span>
      <span class="val">${r.near_expiry||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Next Expiry</span>
      <span class="val">${r.next_expiry||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Cost of Carry</span>
      <span class="val ${parseFloat(r.cost_of_carry||0)>=0?'up':'down'}">${parseFloat(r.cost_of_carry||0).toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">Near Signal</span>
      <span class="val">${sig_badge(r.near_signal)}</span></div>
    <div class="sheet-row"><span class="lbl">Mid Signal</span>
      <span class="val">${sig_badge(r.mid_signal)}</span></div>
  `, r.symbol + ' — Rollover');
}

window.showRolloverSheet = showRolloverSheet;
window.renderRollover    = renderRollover;
