/* ══════════════════════════════════════════════════════════════════════
   oi.js — OI Analysis tab
   ══════════════════════════════════════════════════════════════════════ */

let _oiScreen = 'movers'; // 'movers' | 'signals'

function renderOI(data) {
  const pg = document.getElementById('page-oi');
  if (!data || !pg) return;

  const gainers = (data.oi_movers?.gainers || []).slice(0, 25);
  const losers  = (data.oi_movers?.losers  || []).slice(0, 25);
  const sb      = data.signal_breakdown || {};

  pg.innerHTML = `
    <!-- Screen toggle -->
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button id="oi-btn-movers" onclick="oiSwitch('movers')"
        style="flex:1;padding:8px;border-radius:6px;border:none;cursor:pointer;
          font-size:12px;font-weight:700;background:var(--accent);color:#fff">
        📊 OI Movers
      </button>
      <button id="oi-btn-signals" onclick="oiSwitch('signals')"
        style="flex:1;padding:8px;border-radius:6px;border:none;cursor:pointer;
          font-size:12px;font-weight:700;background:var(--panel);color:var(--fg2)">
        🏷 Signal Breakdown
      </button>
    </div>

    <!-- Screen 1: Movers -->
    <div id="oi-screen-movers">
      <div class="sec-head">🔥 Top 25 OI Gainers</div>
      <div class="tbl-wrap">
        <table id="tbl-gainers">
          <thead><tr>
            <th>Symbol</th><th>LTP</th><th>Chg%</th>
            <th>OI</th><th>OI Chg%</th><th>Sig</th>
          </tr></thead>
          <tbody>
            ${gainers.map(r => oiRow(r)).join('')}
          </tbody>
        </table>
      </div>

      <div class="sec-head" style="margin-top:14px">❄️ Top 25 OI Losers</div>
      <div class="tbl-wrap">
        <table id="tbl-losers">
          <thead><tr>
            <th>Symbol</th><th>LTP</th><th>Chg%</th>
            <th>OI</th><th>OI Chg%</th><th>Sig</th>
          </tr></thead>
          <tbody>
            ${losers.map(r => oiRow(r)).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Screen 2: Signal Breakdown -->
    <div id="oi-screen-signals" style="display:none">
      ${['LB','SB','LU','SC'].map(code => {
        const items = (sb[code] || []).slice(0, 10);
        const colors = {LB:'#22c55e',SB:'#ef4444',LU:'#f59e0b',SC:'#a855f7'};
        const names  = {LB:'Long Buildup',SB:'Short Buildup',LU:'Long Unwinding',SC:'Short Covering'};
        const descs  = {LB:'Price↑ OI↑',SB:'Price↓ OI↑',LU:'Price↓ OI↓',SC:'Price↑ OI↓'};
        return `
          <div class="card" style="border-color:${colors[code]}22;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span class="sig sig-${code.toLowerCase()}" style="font-size:13px;padding:3px 8px">${code}</span>
              <span style="font-size:13px;font-weight:700;color:${colors[code]}">${names[code]}</span>
              <span style="margin-left:auto;font-size:20px;font-weight:700;color:${colors[code]}">${items.length}</span>
            </div>
            <div style="font-size:10px;color:var(--fg2);margin-bottom:8px">${descs[code]}</div>
            ${items.length ? `
            <div class="tbl-wrap">
              <table>
                <thead><tr>
                  <th>Symbol</th><th>LTP</th><th>Chg%</th><th>OI</th><th>OI Chg%</th>
                </tr></thead>
                <tbody>
                  ${items.map(r => oiRow(r, true)).join('')}
                </tbody>
              </table>
            </div>` : '<div style="color:var(--fg2);font-size:12px;padding:6px">No signals</div>'}
          </div>`;
      }).join('')}
    </div>
  `;

  oiSwitch(_oiScreen);
}

function oiRow(r, compact = false) {
  const pc  = parseFloat(r.price_chg || 0);
  const oi  = parseInt(r.oi || 0);
  const oic = parseInt(r.oi_chg || 0);
  const oicp = oi>0&&(oi-oic)>0 ? ((oic/(oi-oic))*100).toFixed(1) : '0.0';
  const ltp  = parseFloat(r.ltp || 0);
  return `
    <tr class="${row_cls(r.signal)}" onclick='showSymbolSheet(${JSON.stringify(r)})'>
      <td>${ban_badge(r)}<strong>${r.symbol}</strong></td>
      <td>₹${ltp>=10000?ltp.toFixed(0):ltp.toFixed(2)}</td>
      <td class="${pc>=0?'up':'down'}">${pc>=0?'+':''}${pc.toFixed(2)}%</td>
      <td>${fmt_oi(r.oi)}</td>
      <td class="${parseFloat(oicp)>=0?'up':'down'}">${parseFloat(oicp)>=0?'+':''}${oicp}%</td>
      ${compact ? '' : `<td>${sig_badge(r.signal)}</td>`}
    </tr>`;
}

function oiSwitch(screen) {
  _oiScreen = screen;
  const m  = document.getElementById('oi-screen-movers');
  const s  = document.getElementById('oi-screen-signals');
  const bm = document.getElementById('oi-btn-movers');
  const bs = document.getElementById('oi-btn-signals');
  if (!m || !s) return;
  if (screen === 'movers') {
    m.style.display = 'block'; s.style.display = 'none';
    if (bm) { bm.style.background='var(--accent)'; bm.style.color='#fff'; }
    if (bs) { bs.style.background='var(--panel)';  bs.style.color='var(--fg2)'; }
  } else {
    m.style.display = 'none'; s.style.display = 'block';
    if (bs) { bs.style.background='var(--accent)'; bs.style.color='#fff'; }
    if (bm) { bm.style.background='var(--panel)';  bm.style.color='var(--fg2)'; }
  }
}

window.oiSwitch  = oiSwitch;
window.renderOI  = renderOI;
