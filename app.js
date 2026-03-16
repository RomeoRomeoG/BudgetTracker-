/* ─── CONFIG ─────────────────────────────────────────────────────── */
const GREG_INCOME = 5378;
const BEK_INCOME  = 3365;
const MORTGAGE    = 5250;

const CATEGORIES = [
  { id:'insurance', name:'Insurance & subs',    budget:350,  color:'#4a7fcb', icon:'🛡' },
  { id:'utilities', name:'Utilities & bills',   budget:450,  color:'#4a8c3f', icon:'💡' },
  { id:'rates',     name:'Rates & phone',        budget:180,  color:'#639922', icon:'📱' },
  { id:'groceries', name:'Groceries & dog food', budget:670,  color:'#b86a1a', icon:'🛒' },
  { id:'car',       name:'Car & transport',      budget:520,  color:'#c45fa0', icon:'🚗' },
  { id:'living',    name:'Living allowances',    budget:1400, color:'#7f77dd', icon:'👛' },
  { id:'dining',    name:'Dining & takeaway',    budget:400,  color:'#c0392b', icon:'🍽' },
  { id:'entertain', name:'Entertainment',        budget:200,  color:'#b86a1a', icon:'🎬' },
  { id:'health',    name:'Health & medical',     budget:200,  color:'#1d9e75', icon:'❤' },
  { id:'clothing',  name:'Clothing & personal',  budget:150,  color:'#c45fa0', icon:'👕' },
  { id:'home',      name:'Home & garden',        budget:200,  color:'#4a8c3f', icon:'🏡' },
  { id:'holiday',   name:'Holiday & travel',     budget:0,    color:'#4a7fcb', icon:'✈' },
  { id:'other',     name:'Other',                budget:0,    color:'#7a7668', icon:'📦' },
];

/* ─── STATE ──────────────────────────────────────────────────────── */
let state = {
  fn: 0,
  ot: 0,
  activeUser: 'greg',
  transactions: [],
  goals: [
    { id:1, name:'Dream home deposit', target:150000, saved:12000, contrib:750,  emoji:'🏠', date:'2031-03' },
    { id:2, name:'Holiday fund',        target:8000,   saved:1200,  contrib:300,  emoji:'✈',  date:'2026-12' },
    { id:3, name:'Emergency buffer',    target:20000,  saved:5000,  contrib:200,  emoji:'💰', date:'2027-06' },
  ],
  history: [],
  expandedCat: null,
  addingToGoalId: null,
  nextGoalId: 4,
  catBudgets: Object.fromEntries(CATEGORIES.map(c => [c.id, c.budget])),
};

function loadState() {
  try {
    const raw = localStorage.getItem('gb_budget_v1');
    if (raw) {
      const saved = JSON.parse(raw);
      state = {
        ...state,
        ...saved,
        catBudgets: { ...Object.fromEntries(CATEGORIES.map(c=>[c.id,c.budget])), ...(saved.catBudgets||{}) }
      };
    }
  } catch(e) { console.warn('Could not load state', e); }
}

function persist() {
  try { localStorage.setItem('gb_budget_v1', JSON.stringify(state)); } catch(e) {}
}

/* ─── HELPERS ────────────────────────────────────────────────────── */
function fmt(n)   { return '$' + Math.abs(Math.round(n)).toLocaleString('en-AU'); }
function fmtS(n)  { return (n < 0 ? '-' : '') + fmt(n); }
function catById(id)  { return CATEGORIES.find(c => c.id === id) || { name:'Other', color:'#888', icon:'📦' }; }
function budgetFor(id) { return state.catBudgets[id] || 0; }

function getFNLabel(offset) {
  const now  = new Date();
  const base = new Date(now.getTime() + offset * 14 * 24 * 3600 * 1000);
  const end  = new Date(base.getTime() + 13  * 24 * 3600 * 1000);
  const f    = d => d.toLocaleDateString('en-AU', { day:'numeric', month:'short' });
  const fy   = d => d.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
  return f(base) + ' — ' + fy(end);
}

function getFNTxns(fn)  { return state.transactions.filter(t => t.fn === (fn ?? state.fn)); }
function getCatSpend(catId, txns) { return (txns || getFNTxns()).filter(t => t.cat === catId).reduce((s,t) => s + t.amount, 0); }
function getTotalSpend(txns)      { return (txns || getFNTxns()).reduce((s,t) => s + t.amount, 0); }
function getTotalIncome()         { return GREG_INCOME + BEK_INCOME + (state.ot || 0); }
function getRemaining()           { return getTotalIncome() - MORTGAGE - getTotalSpend(); }

/* ─── USER SCREEN ────────────────────────────────────────────────── */
function setUser(who) {
  state.activeUser = who;
  persist();
  document.getElementById('user-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  renderAll();
}

function switchUser() {
  document.getElementById('user-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

/* ─── TABS ───────────────────────────────────────────────────────── */
function showTab(name) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const tabs = ['overview','spending','goals','stats'];
  document.querySelectorAll('.tab')[tabs.indexOf(name)].classList.add('active');
  if (name === 'overview')  renderOverview();
  if (name === 'spending')  renderSpending();
  if (name === 'goals')     renderGoals();
  if (name === 'stats')     renderStats();
}

function renderAll() {
  // update header
  document.getElementById('fn-label').textContent = getFNLabel(state.fn);
  const ul = document.getElementById('active-user-label');
  ul.textContent = state.activeUser === 'greg' ? 'Greg' : 'Bek';
  ul.className = 'user-tag ' + state.activeUser;

  const sut = document.getElementById('spending-user-tag');
  if (sut) { sut.textContent = state.activeUser === 'greg' ? 'Greg' : 'Bek'; sut.className = 'user-tag ' + state.activeUser; }

  document.getElementById('cover-year').textContent = new Date().getFullYear();

  const active = document.querySelector('.tab-pane.active')?.id?.replace('tab-','');
  if (!active || active === 'overview')  renderOverview();
  if (active === 'spending')  renderSpending();
  if (active === 'goals')     renderGoals();
  if (active === 'stats')     renderStats();
}

/* ─── OVERVIEW ───────────────────────────────────────────────────── */
function renderOverview() {
  const income  = getTotalIncome();
  const spent   = getTotalSpend();
  const saved   = income - MORTGAGE - spent;
  const totalBg = CATEGORIES.reduce((s,c) => s + budgetFor(c.id), 0);

  document.getElementById('ov-income').textContent = fmt(income);
  document.getElementById('ov-spent').textContent  = fmt(spent);
  document.getElementById('ov-budget').textContent = fmt(totalBg);

  const savedEl = document.getElementById('ov-saved');
  savedEl.textContent = fmtS(saved);
  savedEl.className   = 'metric-val ' + (saved >= 0 ? 'good' : 'bad');

  document.getElementById('ov-saved-pct').textContent = Math.round((saved / income) * 100) + '% of income';
  document.getElementById('ov-total-income').textContent = fmt(income);

  const otEl = document.getElementById('ov-ot');
  if (otEl) otEl.value = state.ot || 0;

  const txns = getFNTxns();
  const catSum = document.getElementById('ov-cat-summary');
  catSum.innerHTML = CATEGORIES
    .filter(c => getCatSpend(c.id, txns) > 0 || budgetFor(c.id) > 0)
    .map(c => {
      const sp = getCatSpend(c.id, txns);
      const over = budgetFor(c.id) > 0 && sp > budgetFor(c.id);
      return `<div class="nb-row">
        <span class="nb-row-label">${c.icon} ${c.name}</span>
        <span class="nb-row-val" style="color:${over?'var(--danger)':'var(--ink)'};">${fmt(sp)}</span>
      </div>`;
    }).join('');

  const remEl = document.getElementById('ov-remaining');
  remEl.textContent = fmtS(saved);
  remEl.style.color = saved >= 0 ? 'var(--good)' : 'var(--danger)';

  // goals mini
  document.getElementById('ov-goals-mini').innerHTML = state.goals.map(g => {
    const p   = Math.min(100, Math.round((g.saved / g.target) * 100));
    const col = p >= 75 ? '#4a8c3f' : p >= 40 ? '#b86a1a' : '#c0392b';
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:13px;">
        <span>${g.emoji} ${g.name}</span>
        <span style="color:var(--ink-faint);">${fmt(g.saved)} / ${fmt(g.target)}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${p}%;background:${col};"></div></div>
    </div>`;
  }).join('');

  // recent activity
  const recent = [...state.transactions].sort((a,b) => b.id - a.id).slice(0,5);
  const recentEl = document.getElementById('ov-recent');
  if (recent.length === 0) {
    recentEl.innerHTML = `<div style="font-size:13px;color:var(--ink-faint);padding:6px 0;">No purchases yet this fortnight.</div>`;
  } else {
    recentEl.innerHTML = recent.map(t => {
      const cat = catById(t.cat);
      return `<div class="activity-row">
        <div class="activity-left">
          <span>${cat.icon}</span>
          <div>
            <div class="activity-desc">${t.desc}</div>
            <div class="activity-cat">${cat.name} · <span class="txn-who ${t.who}">${t.who === 'greg' ? 'Greg' : 'Bek'}</span></div>
          </div>
        </div>
        <div class="activity-amount">${fmt(t.amount)}</div>
      </div>`;
    }).join('');
  }
}

/* ─── SPENDING ───────────────────────────────────────────────────── */
function renderSpending() {
  const txns = getFNTxns();
  document.getElementById('cat-list').innerHTML = CATEGORIES.map(c => {
    const sp      = getCatSpend(c.id, txns);
    const bg      = budgetFor(c.id);
    const p       = bg > 0 ? Math.min(100, Math.round((sp / bg) * 100)) : 0;
    const over    = bg > 0 && sp > bg;
    const close   = bg > 0 && sp > bg * 0.8 && !over;
    const barCol  = over ? '#c0392b' : close ? '#b86a1a' : c.color;
    const catTxns = txns.filter(t => t.cat === c.id);
    const isExp   = state.expandedCat === c.id;

    const badge = over
      ? `<span class="badge badge-over">over ${fmt(sp - bg)}</span>`
      : close
      ? `<span class="badge badge-close">nearly there</span>`
      : bg > 0
      ? `<span style="font-size:11px;color:var(--good);">${fmt(bg - sp)} left</span>`
      : '';

    const txnRows = isExp ? `<div class="cat-txns">
      ${catTxns.length === 0
        ? `<div style="padding:10px;font-size:12px;color:var(--ink-faint);">No purchases yet</div>`
        : catTxns.map(t => `<div class="txn-row">
            <span style="color:var(--ink-light);">${t.date || ''}</span>
            <span style="flex:1;margin:0 8px;">${t.desc} <span class="txn-who ${t.who}">${t.who === 'greg' ? 'Greg' : 'Bek'}</span></span>
            <div class="txn-right">
              <span>${fmt(t.amount)}</span>
              <button class="del-btn" onclick="event.stopPropagation();deleteTxn(${t.id})">&#215;</button>
            </div>
          </div>`).join('')}
    </div>` : '';

    return `<div class="cat-card" onclick="toggleCat('${c.id}')">
      <div class="cat-header">
        <div class="cat-name-wrap">
          <span class="cat-icon">${c.icon}</span>
          <div>
            <div class="cat-name">${c.name}</div>
            <div class="cat-count">${catTxns.length} purchase${catTxns.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <div class="cat-amounts">
          <div class="cat-spent ${over ? 'over' : ''}">${fmt(sp)}</div>
          <div class="cat-budget-label">${bg > 0 ? 'of ' + fmt(bg) : 'no budget'}</div>
        </div>
      </div>
      ${bg > 0 ? `<div class="progress-track"><div class="progress-fill" style="width:${p}%;background:${barCol};"></div></div>
      <div class="cat-status"><span>${p}% used</span>${badge}</div>` : ''}
      ${txnRows}
    </div>`;
  }).join('');
}

/* ─── GOALS ──────────────────────────────────────────────────────── */
function renderGoals() {
  document.getElementById('goals-list').innerHTML = state.goals.map((g, i) => {
    const p   = Math.min(100, Math.round((g.saved / g.target) * 100));
    const rem = Math.max(0, g.target - g.saved);
    const fns = g.contrib > 0 ? Math.ceil(rem / g.contrib) : null;
    const col = p >= 75 ? '#4a8c3f' : p >= 40 ? '#b86a1a' : '#c0392b';
    return `<div class="goal-card">
      <div class="goal-top">
        <div>
          <div class="goal-name">${g.emoji} ${g.name}</div>
          <div class="goal-meta">Target ${fmt(g.target)}${g.date ? ' · by ' + g.date : ''}</div>
        </div>
        <div>
          <div class="goal-amount" style="color:${col};">${fmt(g.saved)}</div>
          <div class="goal-pct">${p}% there</div>
        </div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${p}%;background:${col};"></div></div>
      <div class="goal-footer">
        <span>${fmt(g.contrib)}/fortnight</span>
        <span>${fns ? fns + ' fortnights to go' : 'no contribution set'}</span>
      </div>
      <div class="goal-actions">
        <button class="add-goal-btn" onclick="openAddToGoal(${g.id})">+ add money</button>
        <button class="del-btn" onclick="removeGoal(${i})" style="margin-left:auto;opacity:0.35;">&#215; remove</button>
      </div>
    </div>`;
  }).join('');

  const totalContrib = state.goals.reduce((s, g) => s + g.contrib, 0);
  const rem = getRemaining();
  document.getElementById('goal-contrib-summary').innerHTML =
    state.goals.map(g =>
      `<div class="nb-row"><span class="nb-row-label">${g.emoji} ${g.name}</span><span class="nb-row-val">${fmt(g.contrib)}</span></div>`
    ).join('') +
    `<div class="nb-row nb-total"><span>Total contributions</span><span>${fmt(totalContrib)}</span></div>
     <div class="nb-row"><span class="nb-row-label">Left after goals</span>
       <span class="nb-row-val" style="color:${rem - totalContrib >= 0 ? 'var(--good)' : 'var(--danger)'};">${fmtS(rem - totalContrib)}</span>
     </div>`;
}

/* ─── STATS ──────────────────────────────────────────────────────── */
let _catChart = null;
let _histChart = null;

function renderStats() {
  const hist   = state.history;
  const txns   = getFNTxns();
  const allTxn = state.transactions;

  const totalSaved = hist.reduce((s, h) => s + h.saved, 0);
  const avg  = hist.length ? Math.round(totalSaved / hist.length) : 0;
  const best = hist.length ? Math.max(...hist.map(h => h.saved)) : 0;

  document.getElementById('st-avg-saved').textContent   = fmt(avg);
  document.getElementById('st-total-saved').textContent = fmt(totalSaved);
  document.getElementById('st-best').textContent        = fmt(best);
  document.getElementById('st-count').textContent       = hist.length;

  // cat bars this fortnight
  const activeCats = CATEGORIES.filter(c => getCatSpend(c.id, txns) > 0 || budgetFor(c.id) > 0);
  const catBarsEl  = document.getElementById('st-cat-bars');
  if (activeCats.length === 0) {
    catBarsEl.innerHTML = `<div style="font-size:13px;color:var(--ink-faint);">No spending this fortnight yet.</div>`;
  } else {
    const maxSpend = Math.max(...activeCats.map(c => getCatSpend(c.id, txns)));
    catBarsEl.innerHTML = [...activeCats]
      .sort((a,b) => getCatSpend(b.id, txns) - getCatSpend(a.id, txns))
      .map(c => {
        const sp = getCatSpend(c.id, txns);
        const bg = budgetFor(c.id);
        const over = bg > 0 && sp > bg;
        return `<div class="stat-bar-row">
          <div class="stat-bar-header">
            <span>${c.icon} ${c.name}</span>
            <span style="color:${over ? 'var(--danger)' : 'var(--ink-light)'};">${fmt(sp)}${bg > 0 ? ' / ' + fmt(bg) : ''}</span>
          </div>
          <div class="progress-track" style="height:10px;">
            <div class="progress-fill" style="width:${Math.round((sp/maxSpend)*100)}%;background:${over ? '#c0392b' : c.color};"></div>
          </div>
        </div>`;
      }).join('');
  }

  // charts
  if (_catChart) { _catChart.destroy(); _catChart = null; }
  if (_histChart) { _histChart.destroy(); _histChart = null; }

  const spentCats = CATEGORIES.filter(c => getCatSpend(c.id, txns) > 0 || budgetFor(c.id) > 0);
  if (spentCats.length > 0) {
    _catChart = new Chart(document.getElementById('catChart'), {
      type: 'bar',
      data: {
        labels: spentCats.map(c => c.icon + ' ' + c.name.split(' ')[0]),
        datasets: [
          { label:'Spent',  data: spentCats.map(c => getCatSpend(c.id, txns)), backgroundColor: spentCats.map(c => c.color + 'cc'), borderRadius: 4 },
          { label:'Budget', data: spentCats.map(c => budgetFor(c.id)), backgroundColor: 'transparent', borderColor: spentCats.map(c => c.color), borderWidth: 1.5, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font:{ size:10, family:"'Lato',sans-serif" }, autoSkip:false, maxRotation:45 }, grid:{ display:false } },
          y: { ticks: { callback: v => '$' + Math.round(v), font:{ size:10 } }, grid:{ color:'#ddd9c880' } }
        }
      }
    });
  }

  if (hist.length > 0) {
    const recent = hist.slice(-12);
    _histChart = new Chart(document.getElementById('histChart'), {
      type: 'line',
      data: {
        labels: recent.map(h => h.label.split('—')[0].trim()),
        datasets: [{
          data: recent.map(h => h.saved),
          borderColor: '#4a8c3f', backgroundColor: '#4a8c3f22',
          fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: '#4a8c3f',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks:{ font:{size:10}, maxRotation:45 }, grid:{ display:false } },
          y: { ticks:{ callback: v => '$' + Math.round(v/1000) + 'K', font:{size:10} }, grid:{ color:'#ddd9c880' } }
        }
      }
    });
  }

  // who's spending
  const gregTotal = allTxn.filter(t => t.who === 'greg').reduce((s,t) => s+t.amount, 0);
  const bekTotal  = allTxn.filter(t => t.who === 'bek').reduce((s,t) => s+t.amount, 0);
  const whoEl     = document.getElementById('st-who');
  if (allTxn.length === 0) {
    whoEl.innerHTML = `<div style="font-size:13px;color:var(--ink-faint);">No transactions yet.</div>`;
  } else {
    const total = gregTotal + bekTotal;
    whoEl.innerHTML = [
      { who:'greg', label:'Greg', total:gregTotal },
      { who:'bek',  label:'Bek',  total:bekTotal },
    ].map(w => `<div class="who-row">
      <span><span class="txn-who ${w.who}">${w.label}</span></span>
      <span style="font-family:'Caveat',cursive;font-size:17px;font-weight:700;">${fmt(w.total)}</span>
      <span style="color:var(--ink-faint);font-size:12px;">${total > 0 ? Math.round((w.total/total)*100) : 0}%</span>
    </div>`).join('');
  }

  // top categories all time
  const topCats = CATEGORIES
    .map(c => ({ ...c, total: allTxn.filter(t => t.cat === c.id).reduce((s,t) => s+t.amount, 0) }))
    .filter(c => c.total > 0)
    .sort((a,b) => b.total - a.total)
    .slice(0, 6);

  const topEl = document.getElementById('st-top-cats');
  if (topCats.length === 0) {
    topEl.innerHTML = `<div style="font-size:13px;color:var(--ink-faint);">No history yet.</div>`;
  } else {
    const max = topCats[0].total;
    topEl.innerHTML = topCats.map(c => `<div class="stat-bar-row">
      <div class="stat-bar-header"><span>${c.icon} ${c.name}</span><span style="font-weight:700;">${fmt(c.total)}</span></div>
      <div class="progress-track" style="height:6px;">
        <div class="progress-fill" style="width:${Math.round((c.total/max)*100)}%;background:${c.color};"></div>
      </div>
    </div>`).join('');
  }
}

/* ─── INTERACTIONS ───────────────────────────────────────────────── */
function toggleCat(id) {
  state.expandedCat = state.expandedCat === id ? null : id;
  renderSpending();
}

function recalc() {
  state.ot = parseFloat(document.getElementById('ov-ot')?.value) || 0;
  persist();
  renderAll();
}

function changeFN(dir) {
  state.fn += dir;
  persist();
  renderAll();
}

function saveFortnight() {
  if (!confirm('Close this fortnight and start a new one?')) return;
  const income   = getTotalIncome();
  const spent    = getTotalSpend();
  const saved    = income - MORTGAGE - spent;
  state.history.push({
    label: getFNLabel(state.fn),
    income, expenses: MORTGAGE + spent, saved, fn: state.fn,
  });
  state.fn++;
  state.ot = 0;
  state.expandedCat = null;
  persist();
  renderAll();
}

/* ─── MODALS ─────────────────────────────────────────────────────── */
function openTxnModal() {
  const sel = document.getElementById('txn-cat');
  sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('txn-who-note').textContent = `Adding as: ${state.activeUser === 'greg' ? 'Greg' : 'Bek'}`;
  document.getElementById('txn-modal').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function addTxn() {
  const desc   = document.getElementById('txn-desc').value.trim();
  const amount = parseFloat(document.getElementById('txn-amount').value);
  const cat    = document.getElementById('txn-cat').value;
  const date   = document.getElementById('txn-date').value;
  if (!desc || !amount) return;
  state.transactions.push({ id: Date.now(), fn: state.fn, desc, amount, cat, date, who: state.activeUser });
  persist();
  closeModal('txn-modal');
  document.getElementById('txn-desc').value   = '';
  document.getElementById('txn-amount').value = '';
  renderAll();
}

function deleteTxn(id) {
  if (!confirm('Remove this transaction?')) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  persist();
  renderAll();
}

function openGoalModal() {
  document.getElementById('goal-modal').classList.add('open');
}

function addGoal() {
  const name   = document.getElementById('gm-name').value.trim();
  const target = parseFloat(document.getElementById('gm-target').value);
  if (!name || !target) return;
  state.goals.push({
    id:      state.nextGoalId++,
    name,    target,
    saved:   parseFloat(document.getElementById('gm-saved').value)  || 0,
    contrib: parseFloat(document.getElementById('gm-contrib').value) || 0,
    emoji:   document.getElementById('gm-emoji').value,
    date:    document.getElementById('gm-date').value,
  });
  persist();
  closeModal('goal-modal');
  ['gm-name','gm-target','gm-contrib'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('gm-saved').value = '0';
  renderGoals();
  renderOverview();
}

function removeGoal(i) {
  if (!confirm('Remove this goal?')) return;
  state.goals.splice(i, 1);
  persist();
  renderGoals();
  renderOverview();
}

function openAddToGoal(id) {
  state.addingToGoalId = id;
  const g = state.goals.find(g => g.id === id);
  document.getElementById('agm-title').textContent = 'Add to: ' + g.name;
  document.getElementById('agm-amount').value = '';
  document.getElementById('addgoal-modal').classList.add('open');
}

function confirmAddToGoal() {
  const amount = parseFloat(document.getElementById('agm-amount').value);
  if (!amount || amount <= 0) return;
  const g = state.goals.find(g => g.id === state.addingToGoalId);
  if (g) { g.saved += amount; persist(); closeModal('addgoal-modal'); renderGoals(); renderOverview(); }
}

/* ─── INIT ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  document.getElementById('cover-year').textContent = new Date().getFullYear();
  // close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
  });
});
