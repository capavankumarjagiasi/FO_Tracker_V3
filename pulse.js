/* ══════════════════════════════════════════════════════════════════════
   pulse.js — Market Pulse tab
   ══════════════════════════════════════════════════════════════════════ */

function renderPulse(data) {
  const pg = document.getElementById('page-pulse');
  if (!data || !pg) return;

  const meta = data.meta || {};
  const near = data.near_month || [];
  const sb   = data.signal_breakdown || {};
  const ban  = data.ban_list || {};

  // ── Compute summary stats ─────────────────────────────────────────
  let advances = 0, declines = 0, unchanged = 0;
  let totalOI  = 0;
  near.forEach(r => {
    const pc = parseFloat(r.price_chg || 0);
    if (pc > 0) advances++; else if (pc < 0) declines++; else unchanged++;
    totalOI += parseInt(r.oi || 0);
  });

  const lbCount = (sb.LB || []).length;
  const sbCount = (sb.SB || []).length;
  const luCount = (sb.LU || []).length;
  const scCount = (sb.SC || []).length;

  // ── Top gainers/losers by price ───────────────────────────────────
  const sorted = [...near].sort((a,b) => parseFloat(b.price_chg||0) - parseFloat(a.price_chg||0));
  const gainers5 = sorted.slice(0,5);
  const losers5  = sorted.slice(-5).reverse();

  // ── Build HTML ────────────────────────────────────────────────────
  pg.innerHTML = `
    <div id="ptr-spinner" class="neu" style="text-align:center;padding:6px">↻</div>

    <!-- Summary cards -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="lbl">Total Symbols</div>
        <div class="val">${near.length}</div>
        <div class="chg neu">F&O Universe</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Advances / Declines</div>
        <div class="val"><span class="up">${advances}</span> / <span class="down">${declines}</span></div>
        <div class="chg neu">Unchanged: ${unchanged}</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Total OI</div>
        <div class="val">${fmt_oi(totalOI)}</div>
        <div class="chg neu">Near Month</div>
      </div>
      <div class="summary-card">
        <div class="lbl">Ban List</div>
        <div class="val down">${(ban.current||[]).length}</div>
        <div class="chg neu">${(ban.current||[]).join(', ') || 'None'}</div>
      </div>
    </div>

    <!-- Signal breakdown -->
    <div class="sec-head">Signal Breakdown</div>
    <div class="summary-row" style="grid-template-columns:repeat(4,1fr)">
      <div class="summary-card" style="border-color:#064e1a">
        <div class="lbl">Long Buildup</div>
        <div class="val up bold">${lbCount}</div>
        <div class="chg" style="font-size:9px;color:var(--fg2)">Price↑ OI↑</div>
      </div>
      <div class="summary-card" style="border-color:#4e0606">
        <div class="lbl">Short Buildup</div>
        <div class="val down bold">${sbCount}</div>
        <div class="chg" style="font-size:9px;color:var(--fg2)">Price↓ OI↑</div>
      </div>
      <div class="summary-card" style="border-color:#4e3006">
        <div class="lbl">Long Unwinding</div>
        <div class="val bold" style="color:var(--amber)">${luCount}</div>
        <div class="chg" style="font-size:9px;color:var(--fg2)">Price↓ OI↓</div>
      </div>
      <div class="summary-card" style="border-color:#2e0650">
        <div class="lbl">Short Covering</div>
        <div class="val bold" style="color:var(--purple)">${scCount}</div>
        <div class="chg" style="font-size:9px;color:var(--fg2)">Price↑ OI↓</div>
      </div>
    </div>

    <!-- Top gainers -->
    <div class="sec-head">Top 5 Gainers</div>
    <div class="tbl-wrap">
      <table id="tbl-gainers">
        <thead><tr>
          <th>Symbol</th><th>LTP</th><th>Chg%</th><th>OI Chg</th><th>Signal</th>
        </tr></thead>
        <tbody>
          ${gainers5.map(r => `
            <tr class="${row_cls(r.signal)}" onclick="showSymbolSheet(${JSON.stringify(r).replace(/"/g,'&quot;')})">
              <td>${ban_badge(r)}${r.symbol}</td>
              <td class="bold">₹${parseFloat(r.ltp||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
              <td>${fmt_pct(r.price_chg)}</td>
              <td>${fmt_pct(r.oi_chg ? r.oi_chg/(r.oi-r.oi_chg||1)*100 : 0, 1)}</td>
              <td>${sig_badge(r.signal)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Top losers -->
    <div class="sec-head">Top 5 Losers</div>
    <div class="tbl-wrap">
      <table id="tbl-losers">
        <thead><tr>
          <th>Symbol</th><th>LTP</th><th>Chg%</th><th>OI Chg</th><th>Signal</th>
        </tr></thead>
        <tbody>
          ${losers5.map(r => `
            <tr class="${row_cls(r.signal)}" onclick="showSymbolSheet(${JSON.stringify(r).replace(/"/g,'&quot;')})">
              <td>${ban_badge(r)}${r.symbol}</td>
              <td class="bold">₹${parseFloat(r.ltp||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
              <td>${fmt_pct(r.price_chg)}</td>
              <td>${fmt_pct(r.oi_chg ? r.oi_chg/(r.oi-r.oi_chg||1)*100 : 0, 1)}</td>
              <td>${sig_badge(r.signal)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <!-- Heatmap -->
    <div class="sec-head">
      Heat Map
      <select id="hm-filter" style="margin-left:auto;font-size:11px;
        background:var(--panel);border:1px solid var(--border);
        color:var(--fg);border-radius:4px;padding:2px 6px">
        <option value="rank50">Top 50 by Score</option>
        <option value="all">All Symbols</option>
        <option value="g25l25">Top 25 Gain + 25 Loss</option>
      </select>
    </div>
    <div id="heatmap-grid"></div>
  `;

  renderHeatmap(near);
  document.getElementById('hm-filter').addEventListener('change', e => {
    renderHeatmap(near, e.target.value);
  });
}

// ── Heatmap renderer ──────────────────────────────────────────────────
function renderHeatmap(rows, mode = 'rank50') {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;

  // Score = price_chg*0.5 + oi_chg_pct*0.5
  function score(r) {
    const pc  = parseFloat(r.price_chg || 0);
    const oi  = parseInt(r.oi || 0);
    const oic = parseInt(r.oi_chg || 0);
    const ocp = oi > 0 && (oi-oic) > 0 ? oic/(oi-oic)*100 : 0;
    return pc*0.5 + ocp*0.5;
  }
  function oiChgPct(r) {
    const oi = parseInt(r.oi||0), oic = parseInt(r.oi_chg||0);
    return oi>0&&(oi-oic)>0 ? (oic/(oi-oic)*100).toFixed(1) : '0.0';
  }

  let heat;
  const scored = rows.map(r => ({...r, _score: score(r)}))
                     .sort((a,b) => b._score - a._score);

  if (mode === 'all') {
    heat = scored;
  } else if (mode === 'g25l25') {
    const byPrice = [...rows].sort((a,b) =>
      parseFloat(b.price_chg||0) - parseFloat(a.price_chg||0));
    heat = [...byPrice.slice(0,25), ...byPrice.slice(-25).reverse()];
  } else {
    heat = scored.slice(0, 50);
  }

  function tileStyle(sc, pc) {
    const a = Math.abs(sc);
    if (a < 1.0)  return { bg: '#1a1f2e', fg: pc>=0 ? '#22c55e' : '#ef4444', brd: '#2a3040' };
    if (sc >= 5)  return { bg: '#004d00', fg: '#ffffff', brd: '#006600' };
    if (sc >= 3)  return { bg: '#006600', fg: '#ffffff', brd: '#008800' };
    if (sc >= 1)  return { bg: '#1a8c1a', fg: '#ffffff', brd: '#22aa22' };
    if (sc >= -3) return { bg: '#991a1a', fg: '#ffffff', brd: '#bb2222' };
    if (sc >= -5) return { bg: '#cc0000', fg: '#ffffff', brd: '#dd1111' };
    return { bg: '#800000', fg: '#ffffff', brd: '#990000' };
  }

  const SIG_COLS = {LB:'#00e676',SB:'#ff5252',LU:'#ffab40',SC:'#ce93d8'};

  grid.innerHTML = heat.map((r, idx) => {
    const sc  = r._score || score(r);
    const pc  = parseFloat(r.price_chg || 0);
    const ocp = oiChgPct(r);
    const ltp = parseFloat(r.ltp || 0);
    const {bg, fg, brd} = tileStyle(sc, pc);
    const isTop = idx < 10;
    const rankBadge = isTop
      ? `<div style="position:absolute;top:3px;left:3px;background:#1a7abf;
           color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px">#${idx+1}</div>`
      : '';
    const sigCol = SIG_COLS[r.signal] || '';
    const sigBdg = r.signal && sigCol
      ? `<div style="position:absolute;bottom:4px;left:4px;background:${sigCol};
           color:#000;font-size:${isTop?'9':'8'}px;font-weight:700;
           padding:1px ${isTop?'6':'4'}px;border-radius:3px">${r.signal}</div>`
      : '';
    const height = isTop ? '110px' : '52px';
    const ltpSize = isTop ? '15px' : '11px';
    const pctSize = isTop ? '11px' : '9px';

    return `
      <div class="hm-tile" style="background:${bg};border:1px solid ${brd};
        min-height:${height};position:relative;color:${fg}"
        onclick='showSymbolSheet(${JSON.stringify(r)})'>
        ${rankBadge}
        <div class="hm-sym" style="color:${fg}">${r.symbol}</div>
        <div class="hm-ltp" style="font-size:${ltpSize};color:${fg}">
          ₹${ltp >= 10000 ? ltp.toFixed(0) : ltp.toFixed(1)}
        </div>
        <div class="hm-pct" style="font-size:${pctSize};color:${fg}">
          ${pc >= 0 ? '+' : ''}${pc.toFixed(2)}%
        </div>
        <div class="hm-oi" style="color:${parseFloat(ocp)>=0?'#00e676':'#ff5252'}">
          OI ${parseFloat(ocp)>=0?'+':''}${ocp}%
        </div>
        ${sigBdg}
      </div>`;
  }).join('');
}

// ── Symbol detail sheet ───────────────────────────────────────────────
function showSymbolSheet(r) {
  if (typeof r === 'string') try { r = JSON.parse(r); } catch { return; }
  const pc   = parseFloat(r.price_chg || 0);
  const oi   = parseInt(r.oi || 0);
  const oic  = parseInt(r.oi_chg || 0);
  const oicp = oi>0&&(oi-oic)>0 ? ((oic/(oi-oic))*100).toFixed(2) : '0.00';

  openSheet(`
    <div class="sheet-row"><span class="lbl">LTP</span>
      <span class="val bold">₹${parseFloat(r.ltp||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>
    <div class="sheet-row"><span class="lbl">Spot</span>
      <span class="val">₹${parseFloat(r.spot||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>
    <div class="sheet-row"><span class="lbl">Price Chg</span>
      <span class="val ${pc>=0?'up':'down'}">${pc>=0?'+':''}${pc.toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">Open Interest</span>
      <span class="val">${fmt_oi(r.oi)}</span></div>
    <div class="sheet-row"><span class="lbl">OI Change</span>
      <span class="val ${parseFloat(oicp)>=0?'up':'down'}">${parseFloat(oicp)>=0?'+':''}${oicp}%</span></div>
    <div class="sheet-row"><span class="lbl">Basis</span>
      <span class="val">${parseFloat(r.basis||0).toFixed(2)} (${parseFloat(r.basis_pct||0).toFixed(2)}%)</span></div>
    <div class="sheet-row"><span class="lbl">Fair Value</span>
      <span class="val">₹${parseFloat(r.fair_value||0).toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">Conv. Score</span>
      <span class="val">${parseFloat(r.conv_score||0).toFixed(1)}</span></div>
    <div class="sheet-row"><span class="lbl">Signal</span>
      <span class="val">${sig_badge(r.signal)}</span></div>
    <div class="sheet-row"><span class="lbl">Pattern</span>
      <span class="val">${r.pattern||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Days to Exp</span>
      <span class="val">${r.days_to_exp||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Expiry</span>
      <span class="val">${r.expiry||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Lot Size</span>
      <span class="val">${r.lot||'—'}</span></div>
    ${r.alerts ? `<div class="sheet-row"><span class="lbl">Alerts</span>
      <span class="val" style="font-size:11px">${r.alerts}</span></div>` : ''}
  `, (r.ban_status==='ban'?'🚫 ':'')+r.symbol);
}
window.showSymbolSheet = showSymbolSheet;
window.renderPulse     = renderPulse;
