/* ── DEFAULT CONFIG ──────────────────────────────────── */
const DEFAULT_CATS = [
  { id:'insurance', name:'Insurance & subs',    budget:350,  color:'#3b82f6', icon:'🛡', active:true, rollover:true  },
  { id:'utilities', name:'Utilities & bills',   budget:450,  color:'#22c55e', icon:'💡', active:true, rollover:false },
  { id:'rates',     name:'Rates & phone',        budget:180,  color:'#a78bfa', icon:'📱', active:true, rollover:true  },
  { id:'groceries', name:'Groceries & dog food', budget:670,  color:'#f59e0b', icon:'🛒', active:true, rollover:false },
  { id:'car',       name:'Car & transport',      budget:520,  color:'#ec4899', icon:'🚗', active:true, rollover:true  },
  { id:'living',    name:'Living allowances',    budget:1400, color:'#6c63ff', icon:'👛', active:true, rollover:false },
  { id:'dining',    name:'Dining & takeaway',    budget:400,  color:'#ef4444', icon:'🍽', active:true, rollover:false },
  { id:'entertain', name:'Entertainment',        budget:200,  color:'#f59e0b', icon:'🎬', active:true, rollover:false },
  { id:'health',    name:'Health & medical',     budget:200,  color:'#22c55e', icon:'❤', active:true, rollover:true  },
  { id:'clothing',  name:'Clothing & personal',  budget:150,  color:'#ec4899', icon:'👕', active:true, rollover:false },
  { id:'home',      name:'Home & garden',        budget:200,  color:'#22c55e', icon:'🏡', active:true, rollover:false },
  { id:'holiday',   name:'Holiday & travel',     budget:0,    color:'#3b82f6', icon:'✈', active:true, rollover:true  },
  { id:'other',     name:'Other',                budget:0,    color:'#8888a0', icon:'📦', active:true, rollover:false },
];

const DEFAULT_SETTINGS = { greg:5378, bek:3365, mortgage:5250 };

/* ── STATE ───────────────────────────────────────────── */
let S = {
  fn: 0, ot: 0, user: 'greg',
  transactions: [],
  goals: [
    { id:1, name:'Dream home deposit', target:150000, saved:12000, contrib:750,  emoji:'🏠', date:'2031-03' },
    { id:2, name:'Holiday fund',        target:8000,   saved:1200,  contrib:300,  emoji:'✈',  date:'2026-12' },
    { id:3, name:'Emergency buffer',    target:20000,  saved:5000,  contrib:200,  emoji:'💰', date:'2027-06' },
  ],
  history: [],
  expandedCat: null,
  addingGoalId: null,
  adjustingCatId: null,
  nextGoalId: 4,
  nextCatId: 100,
  cats: JSON.parse(JSON.stringify(DEFAULT_CATS)),
  settings: { ...DEFAULT_SETTINGS },
  // catSurplus: { [catId]: number } — accumulated rollover balance per category
  catSurplus: {},
  // txnSplit tracks if a transaction was created via split (for display)
  splitCount: 1,
};

function load() {
  try {
    const r = localStorage.getItem('gb_v3');
    if (r) {
      const p = JSON.parse(r);
      S = { ...S, ...p,
        settings:   { ...DEFAULT_SETTINGS,  ...(p.settings||{}) },
        cats:       p.cats       || JSON.parse(JSON.stringify(DEFAULT_CATS)),
        catSurplus: p.catSurplus || {},
      };
    }
  } catch(e) {}
}

function save() {
  try { localStorage.setItem('gb_v3', JSON.stringify(S)); } catch(e) {}
}

/* ── HELPERS ─────────────────────────────────────────── */
const $    = id => document.getElementById(id);
const fmt  = n  => '$' + Math.abs(Math.round(n)).toLocaleString('en-AU');
const fmtS = n  => (n < 0 ? '-' : '') + fmt(n);
const activeCats  = ()  => S.cats.filter(c => c.active !== false);
const rolloverCats = () => S.cats.filter(c => c.active !== false && c.rollover);
const catById = id => S.cats.find(c => c.id === id) || { name:'Other', color:'#888', icon:'📦' };

// Effective budget = base + rollover surplus
function effectiveBudget(catId) {
  const c = catById(catId);
  const base = c.budget || 0;
  const surplus = S.catSurplus[catId] || 0;
  return base + surplus;
}

function getFNLabel(off) {
  const now  = new Date();
  const base = new Date(now.getTime() + off * 14*24*3600*1000);
  const end  = new Date(base.getTime() + 13*24*3600*1000);
  const f  = d => d.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
  const fy = d => d.toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
  return f(base) + ' — ' + fy(end);
}

const fnTxns     = (fn)    => S.transactions.filter(t => t.fn === (fn ?? S.fn));
const catSpend   = (id, t) => (t||fnTxns()).filter(t=>t.cat===id).reduce((s,t)=>s+t.amount,0);
const totalSpend = (t)     => (t||fnTxns()).reduce((s,t)=>s+t.amount,0);
const income     = ()      => S.settings.greg + S.settings.bek + (S.ot||0);
const remaining  = ()      => income() - S.settings.mortgage - totalSpend();

/* ── USER ────────────────────────────────────────────── */
function setUser(who) {
  S.user = who; save();
  $('user-screen').classList.add('hidden');
  $('app').classList.remove('hidden');
  renderAll();
}
function switchUser() {
  $('user-screen').classList.remove('hidden');
  $('app').classList.add('hidden');
}

/* ── TABS ────────────────────────────────────────────── */
const TABS = ['overview','spending','goals','stats','settings'];
function showTab(name) {
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  $('tab-'+name).classList.add('active');
  document.querySelectorAll('.nav-tab')[TABS.indexOf(name)].classList.add('active');
  if (name==='overview')  renderOverview();
  if (name==='spending')  renderSpending();
  if (name==='goals')     renderGoals();
  if (name==='stats')     renderStats();
  if (name==='settings')  renderSettings();
}

function renderAll() {
  $('fn-label').textContent = getFNLabel(S.fn);
  ['active-user-pill','spending-pill'].forEach(id => {
    const el = $(id); if (!el) return;
    el.textContent = S.user==='greg'?'Greg':'Bek';
    el.className = 'pill '+S.user;
  });
  const otEl = $('ov-ot'); if (otEl) otEl.value = S.ot||0;
  const active = document.querySelector('.pane.active')?.id?.replace('tab-','');
  if (!active||active==='overview') renderOverview();
  else if (active==='spending')  renderSpending();
  else if (active==='goals')     renderGoals();
  else if (active==='stats')     renderStats();
  else if (active==='settings')  renderSettings();
}

/* ── OVERVIEW ────────────────────────────────────────── */
function renderOverview() {
  const inc = income(), sp = totalSpend(), sav = inc - S.settings.mortgage - sp;
  $('ov-income').textContent = fmt(inc);
  $('ov-spent').textContent  = fmt(sp);
  const svEl = $('ov-saved');
  svEl.textContent = fmtS(sav);
  svEl.className = 'kpi-val '+(sav>=0?'good':'bad');
  $('ov-total-income').textContent = fmt(inc);

  const txns = fnTxns();
  $('ov-cat-rows').innerHTML = activeCats()
    .filter(c => catSpend(c.id,txns)>0 || (c.budget||0)>0)
    .map(c => {
      const s = catSpend(c.id,txns), eff = effectiveBudget(c.id);
      const over = eff>0 && s>eff;
      return `<div class="row"><span class="lbl">${c.icon} ${c.name}${c.rollover?'<span class="cat-rollover-tag">rollover</span>':''}</span>
        <span class="val" style="color:${over?'var(--danger)':'inherit'}">${fmt(s)}</span></div>`;
    }).join('');

  const remEl = $('ov-remaining');
  remEl.textContent = fmtS(sav);
  remEl.style.color = sav>=0?'var(--good)':'var(--danger)';

  // Rollover balances panel
  // effectiveBudget(id) = base + runningBalance (what's available THIS fortnight)
  // After close: newRunningBalance = effectiveBudget - spent = eff - spent
  const rc = rolloverCats();
  $('ov-rollover-rows').innerHTML = rc.length===0
    ? `<div style="padding:14px;font-size:13px;color:var(--text3);">Enable rollover on categories in Settings.</div>`
    : rc.map(c => {
        const carried  = S.catSurplus[c.id]||0;   // balance brought forward from last fn
        const base     = c.budget||0;              // this fortnight's base budget
        const eff      = effectiveBudget(c.id);    // = carried + base = total available
        const spent    = catSpend(c.id, txns);     // spent so far this fn
        const afterClose = eff - spent;            // what will roll to next fn
        const isOver   = afterClose < 0;
        return `<div class="rollover-row">
          <div class="rollover-row-icon">${c.icon}</div>
          <div class="rollover-row-body">
            <div class="rollover-row-name">${c.name}</div>
            <div class="rollover-row-meta">
              Available: ${fmt(eff)} (${fmt(carried>=0?'+'+Math.round(carried):Math.round(carried))} carried + ${fmt(base)} budget)
              · Spent: ${fmt(spent)}
            </div>
          </div>
          <div class="rollover-row-right">
            <div class="rollover-bal ${isOver?'negative':''}">
              ${fmt(afterClose)}
              <div style="font-size:10px;color:var(--text3);font-family:var(--mono);">after close</div>
            </div>
            <button class="rollover-adj-btn" onclick="openAdjustRollover('${c.id}')">adjust</button>
          </div>
        </div>`;
      }).join('');

  // Goals
  $('ov-goals-mini').innerHTML = S.goals.map(g => {
    const p = Math.min(100,Math.round((g.saved/g.target)*100));
    const col = p>=75?'var(--good)':p>=40?'var(--warn)':'var(--danger)';
    return `<div class="goal-mini">
      <div class="goal-mini-top"><span class="goal-mini-name">${g.emoji} ${g.name}</span>
        <span class="goal-mini-amt">${fmt(g.saved)} / ${fmt(g.target)}</span></div>
      <div class="prog"><div class="prog-fill" style="width:${p}%;background:${col};"></div></div>
    </div>`;
  }).join('');

  // Recent
  const recent = [...S.transactions].sort((a,b)=>b.id-a.id).slice(0,6);
  $('ov-recent').innerHTML = recent.length===0
    ? `<div style="padding:14px;font-size:13px;color:var(--text3);">No purchases yet this fortnight.</div>`
    : recent.map(t => {
        const c = catById(t.cat);
        const splitTag = t.splitOf ? `<span style="font-size:10px;color:var(--accent);margin-left:4px;">split ${t.splitPart}/${t.splitOf}</span>` : '';
        return `<div class="act-row">
          <div class="act-icon">${c.icon}</div>
          <div class="act-body">
            <div class="act-desc">${t.desc}${splitTag}</div>
            <div class="act-meta">${c.name} <span class="who-tag ${t.who}">${t.who==='greg'?'Greg':'Bek'}</span></div>
          </div>
          <div class="act-amt">${fmt(t.amount)}</div>
        </div>`;
      }).join('');
}

/* ── SPENDING ────────────────────────────────────────── */
function renderSpending() {
  const txns = fnTxns();
  $('cat-list').innerHTML = activeCats().map(c => {
    const sp    = catSpend(c.id, txns);
    const eff   = effectiveBudget(c.id);
    const base  = c.budget||0;
    const surp  = S.catSurplus[c.id]||0;
    const p     = eff>0 ? Math.min(100,Math.round((sp/eff)*100)) : 0;
    const over  = eff>0 && sp>eff;
    const close = eff>0 && sp>eff*0.8 && !over;
    const barCol= over?'var(--danger)':close?'var(--warn)':c.color;
    const cTxns = txns.filter(t=>t.cat===c.id);
    const isExp = S.expandedCat===c.id;

    const badge = over
      ? `<span class="badge badge-over">over ${fmt(sp-eff)}</span>`
      : close ? `<span class="badge badge-close">nearly</span>`
      : eff>0 ? `<span style="font-size:11px;color:var(--good);">${fmt(eff-sp)} left</span>` : '';

    const rolloverTag = c.rollover && surp>0
      ? `<span class="cat-rollover-tag">+${fmt(surp)} carried</span>` : '';

    const txnRows = isExp ? `<div class="cat-txns">
      ${cTxns.length===0
        ? `<div style="padding:8px 0;font-size:12px;color:var(--text3);">No purchases yet</div>`
        : cTxns.map(t => {
            const splitTag = t.splitOf?`<span style="font-size:10px;color:var(--accent);"> split ${t.splitPart}/${t.splitOf}</span>`:'';
            return `<div class="txn-item">
              <div class="txn-body">
                <div class="txn-desc">${t.desc}${splitTag}</div>
                <div class="txn-meta">${t.date||''} <span class="who-tag ${t.who}">${t.who==='greg'?'Greg':'Bek'}</span></div>
              </div>
              <div class="txn-right">
                <span class="txn-amt">${fmt(t.amount)}</span>
                <button class="del-btn" onclick="event.stopPropagation();delTxn(${t.id})">&#215;</button>
              </div>
            </div>`;
          }).join('')}
    </div>` : '';

    return `<div class="cat-card${isExp?' expanded':''}" onclick="toggleCat('${c.id}')">
      <div class="cat-top">
        <div class="cat-icon-wrap">${c.icon}</div>
        <div class="cat-body">
          <div class="cat-name">${c.name} ${rolloverTag}</div>
          <div class="cat-count">${cTxns.length} purchase${cTxns.length!==1?'s':''}</div>
        </div>
        <div class="cat-right">
          <div class="cat-spent ${over?'over':''}">${fmt(sp)}</div>
          <div class="cat-of">${eff>0?(surp>0?`of ${fmt(eff)} (incl. ${fmt(surp)} rollover)`:`of ${fmt(eff)}`):'no budget'}</div>
        </div>
      </div>
      ${eff>0?`<div class="cat-prog-wrap">
        <div class="prog"><div class="prog-fill" style="width:${p}%;background:${barCol};"></div></div>
        <div class="cat-prog-status"><span>${p}% used</span>${badge}</div>
      </div>`:''}
      ${txnRows}
    </div>`;
  }).join('');
}

/* ── GOALS ───────────────────────────────────────────── */
function renderGoals() {
  $('goals-list').innerHTML = S.goals.map((g,i) => {
    const p   = Math.min(100,Math.round((g.saved/g.target)*100));
    const rem = Math.max(0,g.target-g.saved);
    const fns = g.contrib>0?Math.ceil(rem/g.contrib):null;
    const col = p>=75?'var(--good)':p>=40?'var(--warn)':'var(--danger)';
    return `<div class="goal-card">
      <div class="goal-card-top">
        <div>
          <div class="goal-card-name">${g.emoji} ${g.name}</div>
          <div class="goal-card-meta">Target ${fmt(g.target)}${g.date?' · '+g.date:''}</div>
        </div>
        <div>
          <div class="goal-card-amt" style="color:${col};">${fmt(g.saved)}</div>
          <div class="goal-card-pct">${p}%</div>
        </div>
      </div>
      <div class="prog"><div class="prog-fill" style="width:${p}%;background:${col};"></div></div>
      <div class="goal-card-foot">
        <span>${fmt(g.contrib)}/fortnight</span>
        <span>${fns?fns+' fortnights left':'no contrib set'}</span>
      </div>
      <div class="goal-card-actions">
        <button class="add-money-btn" onclick="openAddToGoal(${g.id})">+ Add money</button>
        <button class="del-btn" onclick="delGoal(${i})" style="margin-left:auto;">&#215;</button>
      </div>
    </div>`;
  }).join('');

  const tc = S.goals.reduce((s,g)=>s+g.contrib,0);
  const rem = remaining();
  $('goal-contrib-summary').innerHTML =
    S.goals.map(g=>`<div class="row"><span class="lbl">${g.emoji} ${g.name}</span><span class="val">${fmt(g.contrib)}</span></div>`).join('') +
    `<div class="row total-row"><span>Total</span><span>${fmt(tc)}</span></div>
     <div class="row"><span class="lbl">Left after goals</span>
       <span class="val" style="color:${rem-tc>=0?'var(--good)':'var(--danger)'}">${fmtS(rem-tc)}</span></div>`;
}

/* ── STATS ───────────────────────────────────────────── */
let _cChart=null, _hChart=null;

function renderStats() {
  const hist=S.history, txns=fnTxns(), allTx=S.transactions;
  const totSaved=hist.reduce((s,h)=>s+h.saved,0);
  const avg=hist.length?Math.round(totSaved/hist.length):0;
  const best=hist.length?Math.max(...hist.map(h=>h.saved)):0;
  $('st-avg').textContent=$('st-avg').textContent=fmt(avg);
  $('st-total').textContent=fmt(totSaved);
  $('st-best').textContent=fmt(best);
  $('st-count').textContent=hist.length;

  const ac=activeCats().filter(c=>catSpend(c.id,txns)>0||(c.budget||0)>0);
  if (!ac.length) {
    $('st-fn-bars').innerHTML=`<div style="padding:14px;font-size:13px;color:var(--text3);">No spending yet.</div>`;
  } else {
    const mx=Math.max(...ac.map(c=>catSpend(c.id,txns)));
    $('st-fn-bars').innerHTML=[...ac].sort((a,b)=>catSpend(b.id,txns)-catSpend(a.id,txns)).map(c=>{
      const sp=catSpend(c.id,txns), eff=effectiveBudget(c.id), over=eff>0&&sp>eff;
      return `<div class="stat-bar">
        <div class="stat-bar-head">
          <span class="stat-bar-lbl">${c.icon} ${c.name}</span>
          <span class="stat-bar-val" style="color:${over?'var(--danger)':'inherit'}">${fmt(sp)}${eff>0?' / '+fmt(eff):''}</span>
        </div>
        <div class="prog" style="height:6px;"><div class="prog-fill" style="width:${Math.round((sp/mx)*100)}%;background:${over?'var(--danger)':c.color};"></div></div>
      </div>`;
    }).join('');
  }

  if (_cChart){_cChart.destroy();_cChart=null;}
  if (_hChart){_hChart.destroy();_hChart=null;}

  const sc=activeCats().filter(c=>catSpend(c.id,txns)>0||effectiveBudget(c.id)>0);
  if (sc.length) {
    _cChart=new Chart($('catChart'),{type:'bar',data:{
      labels:sc.map(c=>c.icon+' '+c.name.split(' ')[0]),
      datasets:[
        {label:'Spent', data:sc.map(c=>catSpend(c.id,txns)), backgroundColor:sc.map(c=>c.color+'bb'), borderRadius:4},
        {label:'Budget',data:sc.map(c=>effectiveBudget(c.id)), backgroundColor:'transparent', borderColor:sc.map(c=>c.color), borderWidth:1.5, borderRadius:4},
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{ticks:{color:'#55556a',font:{size:10},autoSkip:false,maxRotation:45},grid:{display:false},border:{color:'rgba(255,255,255,0.05)'}},
          y:{ticks:{color:'#55556a',callback:v=>'$'+Math.round(v),font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.05)'}}}}
    });
  }

  if (hist.length) {
    const rec=hist.slice(-12);
    _hChart=new Chart($('histChart'),{type:'line',data:{
      labels:rec.map(h=>h.label.split('—')[0].trim()),
      datasets:[{data:rec.map(h=>h.saved),borderColor:'#6c63ff',backgroundColor:'rgba(108,99,255,0.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#6c63ff'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
        scales:{x:{ticks:{color:'#55556a',font:{size:10},maxRotation:45},grid:{display:false},border:{color:'rgba(255,255,255,0.05)'}},
          y:{ticks:{color:'#55556a',callback:v=>'$'+Math.round(v/1000)+'K',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.05)'}}}}
    });
  }

  const gT=allTx.filter(t=>t.who==='greg').reduce((s,t)=>s+t.amount,0);
  const bT=allTx.filter(t=>t.who==='bek').reduce((s,t)=>s+t.amount,0);
  const tot=gT+bT;
  $('st-who').innerHTML=tot===0
    ?`<div style="padding:14px;font-size:13px;color:var(--text3);">No transactions yet.</div>`
    :[{who:'greg',label:'Greg',amt:gT},{who:'bek',label:'Bek',amt:bT}].map(w=>`<div class="who-row">
        <div class="who-row-label"><span class="who-tag ${w.who}">${w.label}</span></div>
        <div class="who-row-amt">${fmt(w.amt)}</div>
        <div class="who-row-pct">${Math.round((w.amt/tot)*100)}%</div>
      </div>`).join('');

  const top=S.cats.map(c=>({...c,tot:allTx.filter(t=>t.cat===c.id).reduce((s,t)=>s+t.amount,0)}))
    .filter(c=>c.tot>0).sort((a,b)=>b.tot-a.tot).slice(0,6);
  $('st-alltime').innerHTML=top.length===0
    ?`<div style="padding:14px;font-size:13px;color:var(--text3);">No history yet.</div>`
    :top.map(c=>`<div class="stat-bar">
        <div class="stat-bar-head"><span class="stat-bar-lbl">${c.icon} ${c.name}</span><span class="stat-bar-val">${fmt(c.tot)}</span></div>
        <div class="prog" style="height:4px;"><div class="prog-fill" style="width:${Math.round((c.tot/top[0].tot)*100)}%;background:${c.color};"></div></div>
      </div>`).join('');
}

/* ── SETTINGS ────────────────────────────────────────── */
function renderSettings() {
  $('set-greg').value     = S.settings.greg;
  $('set-bek').value      = S.settings.bek;
  $('set-mortgage').value = S.settings.mortgage;

  $('settings-cats').innerHTML = S.cats.map((c,i) => {
    const on = c.active!==false;
    const ro = !!c.rollover;
    const surplus = S.catSurplus[c.id]||0;
    return `<div class="settings-cat-row">
      <div class="settings-cat-icon">${c.icon}</div>
      <div class="settings-cat-body">
        <div class="settings-cat-name">${c.name}</div>
        <div class="settings-cat-budget">${c.budget>0?fmt(c.budget)+'/fn':'No budget'}${ro?' · Rollover: '+fmt(surplus)+' saved':''}</div>
      </div>
      <div class="settings-cat-actions">
        <button class="edit-btn" onclick="openEditCat('${c.id}')">Edit</button>
        <div class="rollover-cat-toggle" title="Rollover unused budget">
          <span style="font-size:10px;color:var(--text3);">rollover</span>
          <button class="toggle-btn ${ro?'on':'off'}" onclick="toggleRollover('${c.id}')"></button>
        </div>
        <button class="toggle-btn ${on?'on':'off'}" onclick="toggleCatActive('${c.id}')" title="Active"></button>
      </div>
    </div>`;
  }).join('');
}

function saveSettings() {
  S.settings.greg     = parseFloat($('set-greg').value)||S.settings.greg;
  S.settings.bek      = parseFloat($('set-bek').value)||S.settings.bek;
  S.settings.mortgage = parseFloat($('set-mortgage').value)||S.settings.mortgage;
  save(); renderOverview();
}

function toggleCatActive(id) {
  const c = S.cats.find(c=>c.id===id);
  if (c) { c.active = !(c.active!==false); save(); renderSettings(); }
}

function toggleRollover(id) {
  const c = S.cats.find(c=>c.id===id);
  if (c) { c.rollover = !c.rollover; save(); renderSettings(); }
}

function openEditCat(id) {
  const c = S.cats.find(c=>c.id===id); if (!c) return;
  $('ec-id').value=''; $('ec-id').value=id;
  $('ec-name').value=c.name; $('ec-budget').value=c.budget||0; $('ec-icon').value=c.icon;
  openSheet('editcat-modal');
}

function saveCatEdit() {
  const id=$('ec-id').value, c=S.cats.find(c=>c.id===id); if (!c) return;
  const nm=$('ec-name').value.trim(); if (!nm) return;
  c.name=nm; c.budget=parseFloat($('ec-budget').value)||0; c.icon=$('ec-icon').value.trim()||c.icon;
  save(); closeSheet('editcat-modal'); renderSettings();
}

function openAddCatModal() { openSheet('addcat-modal'); }

function addCat() {
  const name=$('ac-name').value.trim(); if (!name) return;
  const COLORS=['#3b82f6','#22c55e','#a78bfa','#f59e0b','#ec4899','#6c63ff','#ef4444'];
  S.cats.push({ id:'cat_'+S.nextCatId++, name, budget:parseFloat($('ac-budget').value)||0,
    color:COLORS[S.cats.length%COLORS.length], icon:$('ac-icon').value.trim()||'📦', active:true, rollover:false });
  save(); closeSheet('addcat-modal');
  ['ac-name','ac-budget','ac-icon'].forEach(id=>$(id).value='');
  renderSettings();
}

function resetData() {
  if (!confirm('This will delete ALL your data. Are you sure?')) return;
  localStorage.removeItem('gb_v3'); location.reload();
}

/* ── ROLLOVER LOGIC ──────────────────────────────────── */
function computeRollover() {
  // Called when closing a fortnight
  // For each rollover category: surplus = effectiveBudget - spent (min 0)
  // Deficit can also go negative (overspent) and carry forward
  const txns = fnTxns();
  rolloverCats().forEach(c => {
    const eff   = effectiveBudget(c.id);
    const spent = catSpend(c.id, txns);
    const delta = eff - spent; // positive = unspent, negative = over
    S.catSurplus[c.id] = delta; // carry entire remaining balance (not just base)
  });
}

function openAdjustRollover(catId) {
  const c = catById(catId);
  S.adjustingCatId = catId;
  $('ra-title').textContent = 'Adjust: '+c.name;
  const surp = S.catSurplus[catId]||0;
  const c2   = catById(catId);
  $('ra-desc').textContent = `Running balance: ${fmt(surp)} ${surp>=0?'(saved up)':'(overspent)'}. Each fortnight this grows by $${c2.budget||0} minus whatever you spend. Adjust it here if it needs correcting — e.g. you paid a bill from a different account.`;
  $('ra-amount').value = S.catSurplus[catId]||0;
  openSheet('rollover-adjust-modal');
}

function confirmAdjustRollover() {
  const amt = parseFloat($('ra-amount').value)||0;
  S.catSurplus[S.adjustingCatId] = amt;
  save(); closeSheet('rollover-adjust-modal'); renderAll();
}

/* ── FORTNIGHT CLOSE ─────────────────────────────────── */
function saveFortnight() {
  // Build rollover summary for confirm dialog
  const txns = fnTxns();
  const rc = rolloverCats();
  let rolloverMsg = '';
  if (rc.length > 0) {
    rolloverMsg = '\n\nRollover balances after close:';
    rc.forEach(c => {
      const eff     = effectiveBudget(c.id);
      const spent   = catSpend(c.id, txns);
      const newBal  = eff - spent;
      const sign    = newBal >= 0 ? '+' : '';
      rolloverMsg  += `\n  ${c.icon} ${c.name}: ${sign}$${Math.round(Math.abs(newBal)).toLocaleString('en-AU')} ${newBal<0?'(overspent)':'(carried forward)'}`;
    });
  }

  if (!confirm('Close this fortnight?' + rolloverMsg)) return;

  const inc=income(), sp=totalSpend(), sav=inc-S.settings.mortgage-sp;

  // computeRollover: for each rollover cat, new running balance = effectiveBudget - spent
  // effectiveBudget = old running balance + base budget
  // So: new balance = (old balance + base) - spent
  // This means: if you had $100 carried, base is $200, spent $50 → new balance = $250
  computeRollover();

  S.history.push({ label:getFNLabel(S.fn), income:inc, expenses:S.settings.mortgage+sp, saved:sav, fn:S.fn });
  S.fn++; S.ot=0; S.expandedCat=null;
  save(); renderAll();
}

/* ── INTERACTIONS ────────────────────────────────────── */
function toggleCat(id) { S.expandedCat=S.expandedCat===id?null:id; renderSpending(); }
function recalc() { S.ot=parseFloat($('ov-ot')?.value)||0; save(); renderAll(); }
function changeFN(dir) { S.fn+=dir; save(); renderAll(); }

/* ── TXN MODAL + SPLIT ───────────────────────────────── */
let _splitCount = 1;

function openTxnModal() {
  _splitCount = 1;
  const sel=$('txn-cat');
  sel.innerHTML = activeCats().map(c=>`<option value="${c.id}">${c.icon} ${c.name}${c.rollover?' (rollover)':''}</option>`).join('');
  $('txn-date').value = new Date().toISOString().split('T')[0];
  $('txn-who-note').textContent = `Adding as: ${S.user==='greg'?'Greg':'Bek'}`;
  $('split-label').style.display='none';
  $('split-row').style.display='none';
  $('split-preview').classList.add('hidden');
  $('txn-rollover-hint').classList.add('hidden');
  document.querySelectorAll('.split-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.split-btn')[0]?.classList.add('active');
  checkRolloverCat();
  openSheet('txn-modal');
}

function checkRolloverCat() {
  const catId = $('txn-cat').value;
  const c = catById(catId);
  const hint = $('txn-rollover-hint');
  if (c.rollover) {
    const avail = effectiveBudget(catId);
    $('txn-rollover-avail').textContent = fmt(avail);
    hint.classList.remove('hidden');
    $('split-label').style.display='block';
    $('split-row').style.display='flex';
  } else {
    hint.classList.add('hidden');
    $('split-label').style.display='none';
    $('split-row').style.display='none';
    $('split-preview').classList.add('hidden');
  }
  updateSplitPreview();
}

function setSplit(n) {
  _splitCount = n;
  document.querySelectorAll('.split-btn').forEach((b,i)=>{
    b.classList.toggle('active', i===n-1);
  });
  updateSplitPreview();
}

function updateSplitPreview() {
  const amt = parseFloat($('txn-amount').value)||0;
  const preview = $('split-preview');
  if (_splitCount<=1 || amt===0) { preview.classList.add('hidden'); return; }
  const perFn = amt / _splitCount;
  preview.classList.remove('hidden');
  preview.innerHTML = Array.from({length:_splitCount},(_,i)=>`
    <div class="split-preview-row">
      <span class="split-preview-lbl">Fortnight ${S.fn+i} ${i===0?'(this fn)':'(next '+(i===1?'fn':''+i+' fns')+')'}</span>
      <span class="split-preview-val">${fmt(perFn)}</span>
    </div>`).join('');
}

function addTxn() {
  const desc   = $('txn-desc').value.trim();
  const amount = parseFloat($('txn-amount').value);
  const cat    = $('txn-cat').value;
  const date   = $('txn-date').value;
  if (!desc||!amount) return;

  if (_splitCount>1) {
    // Create one transaction per fortnight
    const perFn = amount / _splitCount;
    for (let i=0;i<_splitCount;i++) {
      S.transactions.push({ id:Date.now()+i, fn:S.fn+i, desc, amount:Math.round(perFn*100)/100,
        cat, date, who:S.user, splitOf:_splitCount, splitPart:i+1 });
    }
  } else {
    S.transactions.push({ id:Date.now(), fn:S.fn, desc, amount, cat, date, who:S.user });
  }

  save(); closeSheet('txn-modal');
  $('txn-desc').value=''; $('txn-amount').value='';
  _splitCount=1;
  renderAll();
}

function delTxn(id) {
  const t = S.transactions.find(t=>t.id===id);
  if (!t) return;
  // If part of a split, offer to delete all parts
  if (t.splitOf>1) {
    const all = confirm(`This is part of a ${t.splitOf}-fortnight split.\n\nDelete ALL ${t.splitOf} parts, or just this one?\n\nOK = Delete all · Cancel = Just this one`);
    if (all) {
      S.transactions = S.transactions.filter(tx => !(tx.desc===t.desc && tx.splitOf===t.splitOf && tx.cat===t.cat));
    } else {
      S.transactions = S.transactions.filter(tx=>tx.id!==id);
    }
  } else {
    if (!confirm('Remove this transaction?')) return;
    S.transactions = S.transactions.filter(tx=>tx.id!==id);
  }
  save(); renderAll();
}

/* ── GOAL MODALS ─────────────────────────────────────── */
function openGoalModal() { openSheet('goal-modal'); }

function addGoal() {
  const name=$('gm-name').value.trim(), tgt=parseFloat($('gm-target').value);
  if (!name||!tgt) return;
  S.goals.push({ id:S.nextGoalId++, name, target:tgt, saved:parseFloat($('gm-saved').value)||0,
    contrib:parseFloat($('gm-contrib').value)||0, emoji:$('gm-emoji').value, date:$('gm-date').value });
  save(); closeSheet('goal-modal');
  ['gm-name','gm-target','gm-contrib'].forEach(id=>$(id).value='');
  $('gm-saved').value='0';
  renderGoals(); renderOverview();
}

function delGoal(i) {
  if (!confirm('Remove this goal?')) return;
  S.goals.splice(i,1); save(); renderGoals(); renderOverview();
}

function openAddToGoal(id) {
  S.addingGoalId=id;
  const g=S.goals.find(g=>g.id===id);
  $('agm-title').textContent='Add to: '+g.name;
  $('agm-amount').value='';
  openSheet('addgoal-modal');
}

function confirmAddToGoal() {
  const amt=parseFloat($('agm-amount').value);
  if (!amt||amt<=0) return;
  const g=S.goals.find(g=>g.id===S.addingGoalId);
  if (g) { g.saved+=amt; save(); closeSheet('addgoal-modal'); renderGoals(); renderOverview(); }
}

/* ── SHEET HELPERS ───────────────────────────────────── */
function openSheet(id)  { $(id).classList.add('open'); }
function closeSheet(id) { $(id).classList.remove('open'); }

/* ── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  load();
  // Add amount input listener for split preview updates
  document.addEventListener('input', e => {
    if (e.target.id==='txn-amount') updateSplitPreview();
  });
  document.querySelectorAll('.sheet-backdrop').forEach(el => {
    el.addEventListener('click', e => { if (e.target===el) el.classList.remove('open'); });
  });
});
