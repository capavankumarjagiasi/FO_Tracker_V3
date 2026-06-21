/* ══════════════════════════════════════════════════════════════════════
   basis.js — Basis Analysis tab
   ══════════════════════════════════════════════════════════════════════ */

function renderBasis(data) {
  const pg = document.getElementById('page-basis');
  if (!data || !pg) return;

  const rows = data.basis_summary || [];

  // Stats
  const premium  = rows.filter(r => parseFloat(r.basis_pct||0) >  0.5).length;
  const discount = rows.filter(r => parseFloat(r.basis_pct||0) < -0.5).length;
  const parity   = rows.length - premium - discount;

  pg.innerHTML = `
    <!-- Summary pills -->
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <div class="card" style="flex:1;text-align:center;padding:8px;border-color:#064e1a">
        <div style="font-size:20px;font-weight:700;color:var(--green)">${premium}</div>
        <div style="font-size:10px;color:var(--fg2)">Premium</div>
      </div>
      <div class="card" style="flex:1;text-align:center;padding:8px">
        <div style="font-size:20px;font-weight:700;color:var(--fg2)">${parity}</div>
        <div style="font-size:10px;color:var(--fg2)">Parity</div>
      </div>
      <div class="card" style="flex:1;text-align:center;padding:8px;border-color:#4e0606">
        <div style="font-size:20px;font-weight:700;color:var(--red)">${discount}</div>
        <div style="font-size:10px;color:var(--fg2)">Discount</div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <input id="ba-search" type="search" placeholder="Search symbol…">
      <select id="ba-filter">
        <option value="">All</option>
        <option value="premium">Premium only</option>
        <option value="discount">Discount only</option>
      </select>
      <select id="ba-sort">
        <option value="basis_desc">Basis% ↓</option>
        <option value="basis_asc">Basis% ↑</option>
        <option value="conv_desc">Conv ↓</option>
      </select>
    </div>

    <div class="tbl-wrap">
      <table id="tbl-basis">
        <thead><tr>
          <th>Symbol</th>
          <th>Spot</th>
          <th>Fut LTP</th>
          <th>Basis%</th>
          <th>FV</th>
          <th>FV Diff</th>
          <th>Conv</th>
          <th>Sig</th>
        </tr></thead>
        <tbody id="ba-tbody"></tbody>
      </table>
    </div>
  `;

  const search = document.getElementById('ba-search');
  const filter = document.getElementById('ba-filter');
  const sort   = document.getElementById('ba-sort');

  function apply() {
    const q  = search.value.trim().toUpperCase();
    const f  = filter.value;
    const so = sort.value;
    let list = rows.filter(r => {
      if (q && !(r.symbol||'').includes(q)) return false;
      const bp = parseFloat(r.basis_pct||0);
      if (f === 'premium'  && bp <= 0.5)  return false;
      if (f === 'discount' && bp >= -0.5) return false;
      return true;
    });
    list.sort((a,b) => {
      switch(so) {
        case 'basis_asc':  return parseFloat(a.basis_pct||0) - parseFloat(b.basis_pct||0);
        case 'conv_desc':  return parseFloat(b.conv_score||0) - parseFloat(a.conv_score||0);
        default:           return parseFloat(b.basis_pct||0) - parseFloat(a.basis_pct||0);
      }
    });
    renderBasisRows(list);
  }

  search.addEventListener('input',  apply);
  filter.addEventListener('change', apply);
  sort.addEventListener('change',   apply);
  apply();
}

function renderBasisRows(rows) {
  const tbody = document.getElementById('ba-tbody');
  if (!tbody) return;
  tbody.innerHTML = rows.map(r => {
    const bp   = parseFloat(r.basis_pct || 0);
    const fvd  = parseFloat(r.fv_diff || 0);
    const conv = parseFloat(r.conv_score || 0);
    const sig  = r.signal || '';
    // Basis colour
    let bpCls = 'neu';
    if (bp >  1.0) bpCls = 'up bold';
    else if (bp < -1.0) bpCls = 'down bold';
    else if (bp >  0.3) bpCls = 'up';
    else if (bp < -0.3) bpCls = 'down';

    return `
      <tr class="${row_cls(sig)}" onclick='showBasisSheet(${JSON.stringify(r)})'>
        <td><strong>${r.symbol}</strong></td>
        <td>₹${parseFloat(r.spot||0).toFixed(2)}</td>
        <td>₹${parseFloat(r.ltp||0).toFixed(2)}</td>
        <td class="${bpCls}">${bp>=0?'+':''}${bp.toFixed(2)}%</td>
        <td>₹${parseFloat(r.fair_value||0).toFixed(2)}</td>
        <td class="${fvd>=0?'up':'down'}">${fvd>=0?'+':''}${fvd.toFixed(2)}</td>
        <td>${conv.toFixed(1)}</td>
        <td>${sig_badge(sig)}</td>
      </tr>`;
  }).join('');
}

function showBasisSheet(r) {
  if (typeof r === 'string') try { r = JSON.parse(r); } catch { return; }
  const bp  = parseFloat(r.basis_pct || 0);
  const fvd = parseFloat(r.fv_diff || 0);
  openSheet(`
    <div class="sheet-row"><span class="lbl">Spot Price</span>
      <span class="val bold">₹${parseFloat(r.spot||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>
    <div class="sheet-row"><span class="lbl">Futures LTP</span>
      <span class="val bold">₹${parseFloat(r.ltp||0).toLocaleString('en-IN',{maximumFractionDigits:2})}</span></div>
    <div class="sheet-row"><span class="lbl">Basis</span>
      <span class="val">₹${parseFloat(r.basis||0).toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">Basis %</span>
      <span class="val ${bp>=0?'up':'down'} bold">${bp>=0?'+':''}${bp.toFixed(2)}%</span></div>
    <div class="sheet-row"><span class="lbl">Fair Value</span>
      <span class="val">₹${parseFloat(r.fair_value||0).toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">FV Diff</span>
      <span class="val ${fvd>=0?'up':'down'}">${fvd>=0?'+':''}${fvd.toFixed(2)}</span></div>
    <div class="sheet-row"><span class="lbl">Conv Score</span>
      <span class="val">${parseFloat(r.conv_score||0).toFixed(1)}</span></div>
    <div class="sheet-row"><span class="lbl">Signal</span>
      <span class="val">${sig_badge(r.signal)}</span></div>
    <div class="sheet-row"><span class="lbl">Pattern</span>
      <span class="val">${r.pattern||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Days to Expiry</span>
      <span class="val">${r.days_to_exp||'—'}</span></div>
    <div class="sheet-row"><span class="lbl">Expiry</span>
      <span class="val">${r.expiry||'—'}</span></div>
  `, r.symbol + ' — Basis');
}

window.showBasisSheet = showBasisSheet;
window.renderBasis    = renderBasis;
