// ===== App =====
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const yesterday = () => { const d = new Date(Date.now() - 864e5); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const fmt = n => Math.round(n).toLocaleString('en-SG');

  // ---------- catalog ----------
  const DIFF = [
    { name: 'Easy', tokens: 1200, secs: 45, mins: 10, blurb: 'One concept, one step' },
    { name: 'Medium', tokens: 2500, secs: 90, mins: 10, blurb: 'Two or three steps, word problems' },
    { name: 'Hard', tokens: 4200, secs: 180, mins: 15, blurb: 'Multi-step problem sums' },
  ];
  const SABS = {
    ink: { name: 'Ink Splat', e: '🎨', cost: 150, desc: 'Paint splats cover the question until they tap them away' },
    flip: { name: 'Upside Down', e: '🙃', cost: 200, desc: 'The question flips upside down' },
    freeze: { name: 'Freeze', e: '🧊', cost: 250, desc: 'Answer buttons freeze for 3 seconds' },
    shuffle: { name: 'Shuffle', e: '🔀', cost: 250, desc: 'Keypad and options scramble for 2 questions' },
    fog: { name: 'Fog', e: '🌫️', cost: 300, desc: 'The question blurs; they rub to clear it' },
    glitch: { name: 'Glitch Theme', e: '💖', cost: 400, desc: 'Pink comic-font quiz for 3 questions' },
    boss: { name: 'Boss Fight', e: '👾', cost: 7000, desc: 'Turn-based fight vs the talking Calculator King, up to 15 min. If they lose all HP, you get 10,000 of their tokens' },
  };
  const MSGS = ['Good luck! 🍀', "Bet you can't beat my score 😏", 'GG 🤝', 'Study harder! 📚', 'You got this 💪', 'Nice try 😂', 'Race you to 10/10 🏁'];
  const STICKERS = ['🐔', '🔥', '👻', '🦆', '💥', '🍕', '🤡', '🐸'];
  const MSG_COST = 500, STICKER_COST = 1000, SHIELD_COST = 200, HINT_COST = 300;
  const AVATARS = [['🦊', 0], ['🐼', 200], ['🐸', 300], ['🐧', 400], ['🦄', 500], ['🐙', 800], ['🐉', 1000], ['🤖', 1500], ['👑', 3000], ['🦖', 5000]];
  const DRAW_PENALTY = 10000;
  const CHESS = { 1: ['Pawn', 'Beginner', 1000], 2: ['Knight', 'Casual, ~800', 2000], 3: ['Bishop', 'Club beginner, ~1200', 4000], 4: ['Rook', 'Strong club, ~1600', 7000], 5: ['Queen', 'Expert', 12000] };

  // ---------- state ----------
  const blank = () => ({ v: 1, name: '', avatar: '🦊', owned: ['🦊'], tokens: 0, arcadeMs: 0, shields: 1, botRivals: true,
    streak: { last: '', n: 0 }, day: { date: today(), easy: 0, quizzes: 0 }, mastery: {}, review: [],
    stats: { quizzes: 0, correct: 0, total: 0, cw: 0, cl: 0, cd: 0 }, items: {}, level: 'P6', savedAt: 0 });
  let S = blank();
  const Store = {
    db: null, doc: null, timer: null,
    load() { try { const raw = localStorage.getItem('mathquest'); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch (e) {} this.fixDay(); },
    fixDay() { if (S.day.date !== today()) S.day = { date: today(), easy: 0, quizzes: 0 }; if (!S.starterGiven) { S.starterGiven = true; S.starter100k = true; S.tokens += 100000; this.gift = 100000; } else if (!S.starter100k) { S.starter100k = true; S.tokens += 90000; this.gift = 90000; } },
    save() { S.savedAt = Date.now(); try { localStorage.setItem('mathquest', JSON.stringify(S)); } catch (e) {}
      clearTimeout(this.timer); this.timer = setTimeout(() => { if (this.doc) { try { const p = this.doc.set(JSON.parse(JSON.stringify(S))); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }, 1200); },
    async connect() {
      try {
        if (!window.claude || !claude.use) return;
        const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
        if (user && !S.name) { try { const me = await user.me(); if (me && me.name) { S.name = me.name.split(' ')[0]; Store.save(); Net.updatePresence(); renderHud(); } } catch (e) {} }
        if (!db || !user) return;
        const id = await user.id(); if (!id) return;
        this.doc = db.collection('data/users/' + id).doc('state');
        let data = null;
        try { const snap = await this.doc.get(); data = snap && (typeof snap.data === 'function' ? snap.data() : (snap.data !== undefined ? snap.data : snap)); } catch (e) {}
        if (data && data.v && (data.savedAt || 0) > (S.savedAt || 0)) { S = Object.assign(blank(), data); this.fixDay(); renderHud(); route(cur, true); }
        else this.save();
      } catch (e) { this.doc = null; }
    },
  };

  // ---------- toasts / HUD ----------
  function toast(text, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = text; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200); }
  function addTokens(n, why) {
    if (!n) return;
    S.tokens = Math.max(0, S.tokens + n); Store.save(); renderHud();
    const p = $('#hudTokens'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump');
    if (why) toast(`${n > 0 ? '+' : ''}${fmt(n)} 🪙 ${why}`, n > 0 ? 'good' : 'bad');
  }
  function spend(n) { if (S.tokens < n) { toast(`You need ${fmt(n)} 🪙 — you have ${fmt(S.tokens)}. Do a quiz!`, 'bad'); return false; } S.tokens -= n; Store.save(); renderHud(); return true; }
  function renderHud() {
    $('#hudTokens span').textContent = fmt(S.tokens);
    $('#hudArcade span').textContent = mmss(S.arcadeMs);
    $('#hudMe').textContent = `${S.avatar} ${S.name || 'Player'}`;
  }

  // ---------- routing ----------
  const TABS = [['study', '📚 Study'], ['arcade', '🕹️ Arcade'], ['chess', '♞ Chess'], ['friends', '👥 Friends'], ['shop', '🛍️ Shop']];
  let cur = 'study', cleanup = null, locked = false;
  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(([id, label]) => `<button class="tab ${cur === id ? 'on' : ''}" data-t="${id}" ${locked && cur !== id ? 'disabled' : ''}>${label}</button>`).join('');
    $$('#tabs .tab').forEach(b => b.onclick = () => route(b.dataset.t));
  }
  function route(id, force) {
    if (locked && !force) return;
    if (cleanup) { cleanup(); cleanup = null; }
    cur = id; renderTabs(); window.scrollTo(0, 0);
    ({ study: viewStudy, arcade: viewArcade, chess: viewChess, friends: viewFriends, shop: viewShop })[id]();
    Net.updatePresence();
  }
  function modal(html) { const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="card">${html}</div>`; document.body.appendChild(m); return m; }

  // =====================================================================
  // STUDY
  // =====================================================================
  let pickTopic = 'Mixed', pickDiff = 1, timed = true;
  function mastery(level, topic) {
    const m = S.mastery[`${level}:${topic}`]; if (!m || !m.t) return { pct: 0, label: 'New' };
    const pct = Math.round(100 * m.c / m.t); return { pct, label: m.t >= 10 && pct >= 85 ? 'Mastered' : pct >= 60 ? 'Practising' : 'Learning' };
  }
  function viewStudy() {
    const lv = S.level, topics = Quiz.LEVELS[lv];
    if (pickTopic !== 'Mixed' && !topics.includes(pickTopic)) pickTopic = 'Mixed';
    $('#view').innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card"><h2>Hi ${esc(S.name || 'there')} ${S.avatar}</h2>
          <div class="row"><span class="tag">🔥 Streak: ${S.streak.n} day${S.streak.n === 1 ? '' : 's'}</span><span class="tag">✅ ${S.stats.quizzes} quizzes</span><span class="tag">🛡️ ${S.shields} shield${S.shields === 1 ? '' : 's'}</span></div>
          <p class="muted small" style="margin:10px 0 0">Finish a quiz with 5/10 or better to earn tokens and Arcade time. Spend tokens on chess hints, avatars, and sabotaging your friends.</p></div>
        <div class="card"><h3>🔁 Review list</h3><p class="muted small" style="margin:0 0 10px">${S.review.length ? `${S.review.length} question${S.review.length === 1 ? '' : 's'} you got wrong. Get each right twice to clear it.` : 'Questions you get wrong land here.'}</p>
          <button class="btn ghost" id="reviewBtn" ${S.review.length ? '' : 'disabled'}>Practise review (${Math.min(10, S.review.length)})</button></div>
      </div>
      <div class="card">
        <h2>Start a quiz</h2>
        <div class="row" style="margin-bottom:14px">${Object.keys(Quiz.LEVELS).map(l => `<button class="chip ${l === lv ? 'on' : ''}" data-lv="${l}">${l}</button>`).join('')}</div>
        <h3>Topic</h3>
        <div class="grid g3" style="margin-bottom:16px">
          <button class="topic ${pickTopic === 'Mixed' ? 'on' : ''}" data-tp="Mixed">🎲 Mixed<div class="muted small">All ${lv} topics</div></button>
          ${topics.map(t => { const m = mastery(lv, t); return `<button class="topic ${pickTopic === t ? 'on' : ''}" data-tp="${esc(t)}">${esc(t)}<div class="muted small">${m.label}${m.pct ? ` · ${m.pct}%` : ''}</div><div class="bar"><i style="width:${m.pct}%"></i></div></button>`; }).join('')}
        </div>
        <h3>Difficulty</h3>
        <div class="grid g3" style="margin-bottom:16px">${DIFF.map((d, i) => `<button class="diff d${i} ${pickDiff === i ? 'on' : ''}" data-df="${i}"><div class="big">${d.name}</div><div class="small">${d.blurb}</div><div style="margin-top:8px">🪙 ${d.tokens} · ⏱ +${d.mins} min · ${d.secs}s/question</div></button>`).join('')}</div>
        <div class="row" style="justify-content:space-between">
          <label class="switch"><input type="checkbox" id="timedBox" ${timed ? 'checked' : ''}> Timer on</label>
          <button class="btn green" id="go" style="font-size:20px;padding:14px 28px">Start 10 questions ▶</button>
        </div>
      </div>`;
    $$('[data-lv]').forEach(b => b.onclick = () => { S.level = b.dataset.lv; Store.save(); viewStudy(); });
    $$('[data-tp]').forEach(b => b.onclick = () => { pickTopic = b.dataset.tp; viewStudy(); });
    $$('[data-df]').forEach(b => b.onclick = () => { pickDiff = +b.dataset.df; viewStudy(); });
    $('#timedBox').onchange = e => timed = e.target.checked;
    $('#go').onclick = () => startQuiz(false);
    $('#reviewBtn').onclick = () => startQuiz(true);
  }

  // =====================================================================
  // QUIZ ENGINE
  // =====================================================================
  let QZ = null;
  function startQuiz(review) {
    let qs;
    if (review) qs = S.review.slice(0, 10).map(q => Object.assign({}, q));
    else qs = Array.from({ length: 10 }, () => Quiz.make(S.level, pickTopic, pickDiff));
    QZ = { review, level: S.level, topic: pickTopic, diff: review ? 1 : pickDiff, timed, qs, i: 0, log: [], paused: 0, timeLeft: 0, startT: Date.now(), shuffleLeft: 0, glitchLeft: 0, applied: false, entry: '' };
    locked = true; renderTabs(); Net.updatePresence();
    showQuestion();
    QZ.tick = setInterval(tick, 250);
    cleanup = () => { clearInterval(QZ && QZ.tick); };
  }
  function tick() {
    if (!QZ || !QZ.timed || QZ.paused > 0 || QZ.answered) return;
    QZ.timeLeft -= 250;
    const secs = DIFF[QZ.qs[QZ.i].diff ?? QZ.diff].secs * 1000;
    const bar = $('#tbar'); if (bar) bar.style.width = Math.max(0, 100 * QZ.timeLeft / secs) + '%';
    if (QZ.timeLeft <= 0) submit(null);
  }
  function showQuestion() {
    const q = QZ.qs[QZ.i]; QZ.answered = false; QZ.applied = false; QZ.entry = '';
    QZ.timeLeft = DIFF[q.diff ?? QZ.diff].secs * 1000; QZ.qStart = Date.now();
    if (QZ.shuffleLeft > 0) QZ.shuffleLeft--;
    if (QZ.glitchLeft > 0) { QZ.glitchLeft--; if (!QZ.glitchLeft) document.body.classList.remove('glitch'); }
    const shuffled = QZ.shuffleLeft > 0;
    $('#view').innerHTML = `
      <div class="qwrap">
        <div class="row" style="justify-content:space-between;margin-bottom:10px"><b class="big" style="font-size:20px">Question ${QZ.i + 1} of ${QZ.qs.length}</b><button class="btn sm ghost" id="quit">Quit</button></div>
        <div class="dots">${QZ.qs.map((_, k) => `<i class="${k < QZ.i ? (QZ.log[k].ok ? 'ok' : 'no') : k === QZ.i ? 'cur' : ''}"></i>`).join('')}</div>
        ${QZ.timed ? '<div class="timer"><i id="tbar" style="width:100%"></i></div>' : ''}
        <div class="card" id="qcard">
          <div class="qmeta"><span class="tag">${esc(q.level)}</span><span class="tag">${esc(q.topic)}</span><span class="tag">${DIFF[q.diff ?? QZ.diff].name}</span>${QZ.review ? '<span class="tag">Review</span>' : ''}</div>
          <div class="qtext">${q.text}</div>
        </div>
        <div class="card" id="answerArea" style="margin-top:12px">${answerUI(q, shuffled)}</div>
      </div>`;
    $('#quit').onclick = () => {
      const m = modal(`<h2>Quit this quiz?</h2><p class="muted">You won't get tokens or Arcade time for it.</p><div class="row"><button class="btn red" id="yq">Quit</button><button class="btn ghost" id="nq">Keep going</button></div>`);
      QZ.paused++;
      $('#yq', m).onclick = () => { m.remove(); endQuizCleanup(); route('study', true); };
      $('#nq', m).onclick = () => { m.remove(); QZ.paused--; };
    };
    bindAnswer(q);
    // pending sabotages from friends, then bot rivals
    Sab.queue = Sab.queue.filter(s => s.exp > Date.now());
    if (Sab.queue.length) { const s = Sab.queue.shift(); setTimeout(() => Sab.apply(s.type, s.from, false, s.cid), 600); }
    else if (S.botRivals && QZ.i >= 1 && Math.random() < 0.15) setTimeout(() => { if (QZ && !QZ.applied && !QZ.answered) Sab.apply(pick(['ink', 'flip', 'fog', 'shuffle', 'freeze']), 'RoboRival 🤖', true); }, 1500 + Math.random() * 3000);
  }
  function answerUI(q, shuffled) {
    if (q.choices) {
      const order = q.choices.map((_, i) => i); if (shuffled) order.sort(() => Math.random() - 0.5);
      return `<div class="choices">${order.map(i => `<button class="choice" data-c="${i}">${'ABCD'[order.indexOf(i)]}. ${esc(q.choices[i])}</button>`).join('')}</div>`;
    }
    let keys = ['7', '8', '9', '/', '⌫', '4', '5', '6', '.', '−', '1', '2', '3', '0', '%'];
    if (shuffled) keys = keys.sort(() => Math.random() - 0.5);
    return `<div class="ansrow"><input id="ans" inputmode="decimal" autocomplete="off" placeholder="Your answer${q.unit ? ` (${esc(q.unit)})` : ''}"><button class="btn green" id="sub">Check ✓</button></div>
      <div class="keypad">${keys.map(k => `<button class="key" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="muted small" style="margin-top:8px">Fractions like 3/4 or 1 1/2 are fine.</div>`;
  }
  function bindAnswer(q) {
    if (q.choices) { $$('.choice').forEach(b => b.onclick = () => submit(b.dataset.c)); return; }
    const inp = $('#ans');
    if (window.matchMedia('(pointer:fine)').matches) inp.focus();
    inp.onkeydown = e => { if (e.key === 'Enter') submit(inp.value); };
    $('#sub').onclick = () => submit(inp.value);
    $$('.key').forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === '⌫') inp.value = inp.value.slice(0, -1); else inp.value += k === '−' ? '-' : k; });
  }
  function submit(val) {
    if (!QZ || QZ.answered) return;
    if (val !== null && !QZ.qs[QZ.i].choices && String(val).trim() === '') { toast('Type an answer first'); return; }
    QZ.answered = true;
    const q = QZ.qs[QZ.i], ok = val !== null && Quiz.check(q, val);
    QZ.log.push({ q, given: val, ok, ms: Date.now() - QZ.qStart });
    const f = document.createElement('div'); f.className = 'flash'; f.textContent = ok ? '✅' : (val === null ? '⏰' : '❌'); $('#qcard').appendChild(f);
    setTimeout(() => { if (!QZ) return; QZ.i++; if (QZ.i >= QZ.qs.length) finishQuiz(); else showQuestion(); }, 750);
  }
  function endQuizCleanup() { if (QZ) clearInterval(QZ.tick); QZ = null; locked = false; document.body.classList.remove('glitch'); Sab.closeBoss(); renderTabs(); }
  function finishQuiz() {
    const z = QZ; endQuizCleanup(); cleanup = null;
    Store.fixDay();
    const correct = z.log.filter(l => l.ok).length, n = z.log.length;
    const avgMs = z.log.reduce((a, l) => a + l.ms, 0) / n;
    const lines = []; let tokens = 0, arcade = 0;
    // mastery + review
    for (const l of z.log) {
      const k = `${l.q.level}:${l.q.topic}`; const m = S.mastery[k] || { c: 0, t: 0 }; m.t++; if (l.ok) m.c++; S.mastery[k] = m;
      if (z.review) { const r = S.review.find(x => x.id === l.q.id); if (r) { if (l.ok) r.hits = (r.hits || 0) + 1; } }
      else if (!l.ok) { const keep = Object.assign({}, l.q, { hits: 0 }); S.review.unshift(keep); }
    }
    const cleared = z.review ? S.review.filter(r => (r.hits || 0) >= 2).length : 0;
    if (z.review) S.review = S.review.filter(r => (r.hits || 0) < 2);
    S.review = S.review.slice(0, 60);
    S.stats.quizzes++; S.stats.correct += correct; S.stats.total += n; S.day.quizzes++;
    let paid = true;
    if (correct < 5) { paid = false; lines.push(['Score below 5/10 — no tokens this time', 0]); }
    else if (avgMs < 3000) { paid = false; lines.push(['Answered too fast to count — no tokens', 0]); }
    if (paid) {
      let base = z.review ? 1500 : DIFF[z.diff].tokens;
      if (!z.review && z.diff === 0) { S.day.easy++; if (S.day.easy > 3) { base = Math.round(base / 2); lines.push([`Easy quiz #${S.day.easy} today (half pay)`, base]); } else lines.push([`${DIFF[z.diff].name} quiz`, base]); }
      else lines.push([z.review ? 'Review quiz' : `${DIFF[z.diff].name} quiz`, base]);
      tokens += base;
      if (correct === n) { tokens += 1000; lines.push(['Perfect score bonus', 1000]); }
      if (S.streak.last !== today()) { S.streak.n = S.streak.last === yesterday() ? S.streak.n + 1 : 1; S.streak.last = today(); const sb = Math.min(S.streak.n, 5) * 500; tokens += sb; lines.push([`Daily streak (${S.streak.n} day${S.streak.n === 1 ? '' : 's'})`, sb]); }
      arcade = (z.diff === 2 ? 15 : 10) * 60000;
      S.arcadeMs = Math.min(30 * 60000, S.arcadeMs + arcade);
    }
    S.tokens += tokens; Store.save(); renderHud(); Net.updatePresence();
    const wrong = z.log.filter(l => !l.ok);
    $('#view').innerHTML = `
      <div class="qwrap">
        <div class="card" style="text-align:center;margin-bottom:12px">
          <div style="font-size:56px">${correct === n ? '🏆' : correct >= 8 ? '🌟' : correct >= 5 ? '👍' : '💪'}</div>
          <h2 style="font-size:34px;margin:4px 0">${correct} / ${n}</h2>
          <div class="muted">${esc(z.review ? 'Review' : `${z.level} · ${z.topic} · ${DIFF[z.diff].name}`)} · ${Math.round(avgMs / 1000)}s per question${cleared ? ` · ${cleared} cleared from review` : ''}</div>
        </div>
        <div class="card" style="margin-bottom:12px"><h3>You earned</h3>
          ${lines.map(([t, v]) => `<div class="earn"><span>${esc(t)}</span><span>${v ? '🪙 ' + fmt(v) : ''}</span></div>`).join('')}
          <div class="earn" style="border:0;font-size:18px"><span>Total</span><span>🪙 ${fmt(tokens)}${arcade ? ` · ⏱ +${arcade / 60000} min Arcade` : ''}</span></div>
        </div>
        ${wrong.length ? `<div class="card" style="margin-bottom:12px"><h3>Worked solutions</h3>${wrong.map(l => `<div class="sol"><div style="font-weight:700">${l.q.text}</div><div class="small muted">Your answer: ${l.given === null ? 'ran out of time' : esc(l.q.choices ? l.q.choices[+l.given] : l.given)} · Correct: <span class="ans">${esc(Quiz.answerText(l.q))}</span></div><div style="margin-top:6px">${l.q.sol}</div></div>`).join('')}</div>` : ''}
        <div class="row"><button class="btn green" id="again">Another quiz</button><button class="btn yellow" id="toArc" ${S.arcadeMs > 0 ? '' : 'disabled'}>🕹️ Arcade (${mmss(S.arcadeMs)})</button><button class="btn ghost" id="toChess">♞ Chess</button></div>
      </div>`;
    $('#again').onclick = () => route('study');
    $('#toArc').onclick = () => route('arcade');
    $('#toChess').onclick = () => route('chess');
    if (tokens) { const p = $('#hudTokens'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  }

  // =====================================================================
  // SABOTAGE EFFECTS
  // =====================================================================
  const Sab = {
    queue: [], boss: null,
    incoming(type, from, cid) {
      if (QZ && !QZ.answered) this.apply(type, from, false, cid);
      else { this.queue.push({ type, from, cid, exp: Date.now() + 600000 }); this.queue = this.queue.filter(s => s.exp > Date.now()).slice(-5); if (!QZ) toast(`${SABS[type].e} ${esc(from)} sent you ${SABS[type].name}! It hits in your next quiz 😈`, 'bad'); }
    },
    banner(text) { const b = document.createElement('div'); b.className = 'sabbanner'; b.innerHTML = text; document.body.appendChild(b); setTimeout(() => b.remove(), 2600); },
    apply(type, from, bot, cid) {
      if (!QZ) return; QZ.applied = true;
      const s = SABS[type]; this.banner(`${s.e} ${esc(from)} hit you with <b>${s.name}</b>!`);
      const card = $('#qcard'), area = $('#answerArea'); if (!card) return;
      if (type === 'ink') {
        const cols = ['#ff5d73', '#3aa0ff', '#20bf8a', '#ffc93c', '#6c4cf5', '#ff9a3c'];
        for (let k = 0; k < 7; k++) {
          const sz = 70 + Math.random() * 90, sp = document.createElement('div'); sp.className = 'splat';
          const c = pick(cols);
          Object.assign(sp.style, { width: sz + 'px', height: sz * (0.8 + Math.random() * 0.4) + 'px', left: Math.random() * 80 + '%', top: Math.random() * 60 + '%', background: `radial-gradient(circle at 40% 40%, ${c} 55%, ${c}cc 62%, transparent 70%)`, transform: `translate(-30%,-20%) rotate(${Math.random() * 360}deg)` });
          sp.onpointerdown = () => sp.remove(); card.appendChild(sp);
        }
      }
      if (type === 'flip') {
        card.classList.add('flipped');
        const fb = document.createElement('button'); fb.className = 'btn sm yellow flipback'; fb.textContent = '🙃 Flip back';
        fb.onclick = () => { card.classList.remove('flipped'); fb.remove(); };
        $('.qwrap').appendChild(fb); fb.style.position = 'fixed'; fb.style.right = '20px'; fb.style.bottom = '20px';
      }
      if (type === 'freeze') {
        area.classList.add('frozen'); const ice = document.createElement('div'); ice.className = 'ice'; area.appendChild(ice); QZ.paused++;
        let n = 3; ice.textContent = `🧊 Frozen ${n}`;
        const t = setInterval(() => { n--; ice.textContent = `🧊 Frozen ${n}`; if (n <= 0) { clearInterval(t); ice.remove(); area.classList.remove('frozen'); if (QZ) QZ.paused--; } }, 1000);
      }
      if (type === 'shuffle') { QZ.shuffleLeft = 3; const q = QZ.qs[QZ.i]; area.innerHTML = answerUI(q, true); (QZ.demo ? bindAnswerDemo : bindAnswer)(q); }
      if (type === 'fog') {
        let blur = 9; card.style.filter = `blur(${blur}px)`;
        const tip = document.createElement('div'); tip.className = 'fogtip'; tip.textContent = '🌫️ Rub the card to clear the fog'; $('.qwrap').appendChild(tip);
        const rub = () => { blur -= 0.18; if (blur <= 0) { card.style.filter = ''; tip.remove(); card.removeEventListener('pointermove', rub); } else card.style.filter = `blur(${blur}px)`; };
        card.addEventListener('pointermove', rub);
      }
      if (type === 'glitch') { QZ.glitchLeft = 4; document.body.classList.add('glitch'); }
      if (type === 'boss') this.bossFight(from, cid, !!QZ.demo);
    },
    closeBoss() { if (this.boss) { this.boss(); this.boss = null; } },
    bossFight(from, fromCid, demo) {
      if (this.boss) return;
      if (QZ) QZ.paused++;
      const VENGE = !!S.kingBetrayed; // after a betrayal he is unsparable and much stronger
      const MAX_HP = 100, BOSS_HP = VENGE ? 800 : 400, LIMIT = 15 * 60000, DODGE_MS = 9000, DMG_X = VENGE ? 1.7 : 1;
      const F = { hp: MAX_HP, bhp: BOSS_HP, turn: 0, phase: 'menu', defend: false, t0: Date.now(), apples: 2, mercy: 0, say: '', sayUntil: 0, vphase: 1, msg: VENGE ? `${esc(from)} summoned the Vengeful Calculator King! He can't be spared: defeat him to turn him back to normal, or survive 15 minutes.` : `${esc(from)} summoned the Calculator King! Defeat him, spare him, or survive 15 minutes.`, over: false };
      const vPhase = () => F.bhp > BOSS_HP * 2 / 3 ? 1 : F.bhp > BOSS_HP / 3 ? 2 : 3;
      const m = modal(`
        <div class="row" style="justify-content:space-between;margin-bottom:6px"><h2 style="margin:0">${VENGE ? '😡 The Vengeful Calculator King <span id="vPh" class="tag" style="vertical-align:middle">Phase 1/3</span>' : '👾 The Calculator King'}</h2><span class="pill" style="background:#efeafe;color:#6c4cf5">⏳ <b id="bTime">15:00</b></span></div>
        <div class="small" style="font-weight:800">Boss HP <span id="bHpT"></span></div><div class="bar" style="height:12px;margin:2px 0 8px"><i id="bHp" style="background:linear-gradient(90deg,#ff5d73,#ff9a3c)"></i></div>
        <div class="bossstage"><canvas id="bc" width="640" height="420" style="background:#140d33"></canvas></div>
        <div class="small" style="font-weight:800;margin-top:8px">Your HP <span id="pHpT"></span>${F.defend ? '' : ''}</div><div class="bar" style="height:12px;margin:2px 0 8px"><i id="pHp" style="background:linear-gradient(90deg,#20bf8a,#3aa0ff)"></i></div>
        <div class="small" style="font-weight:800">Mercy <span id="mHpT"></span></div><div class="bar" style="height:8px;margin:2px 0 8px"><i id="mHp" style="background:linear-gradient(90deg,#ffc93c,#ffe08a)"></i></div>
        <div id="bMsg" class="small" style="min-height:20px;font-weight:700;margin-bottom:8px"></div>
        <div id="bPanel"></div>
        ${demo ? '<div style="text-align:right;margin-top:8px"><button class="btn sm ghost" id="bEnd">End preview</button></div>' : `<div class="muted small" style="margin-top:8px">Lose all your HP and ${fmt(10000)} of your tokens go to ${esc(from)}.</div>`}`);
      m.classList.add('bossfull'); // full-screen fight: arena shrinks to fit so the buttons always stay on screen
      const cv = $('#bc', m), cx = cv.getContext('2d');
      const P = { x: 240, y: 240 }; let shots = [], inv = 0, raf = null, dodgeEnd = 0, spawnT = 0, keys = {}, last = 0, clockT = null;
      let CW = 640, CH_H = 420; const ARENA = { x0: 16, x1: 624, y0: 140, y1: 390 }; // resized to fill the screen by layout(): King on top, box below
      const AC = { x: (ARENA.x0 + ARENA.x1) / 2, y: (ARENA.y0 + ARENA.y1) / 2 };
      const toCanvas = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * CW / r.width, y: (e.clientY - r.top) * CH_H / r.height }; };
      const clamp = () => { P.x = Math.max(ARENA.x0 + 8, Math.min(ARENA.x1 - 8, P.x)); P.y = Math.max(ARENA.y0 + 8, Math.min(ARENA.y1 - 8, P.y)); };
      let idleRaf = null;
      const say = (t, ms = 3800) => { F.say = t; F.sayUntil = performance.now() + ms; };
      const sparable = () => !VENGE && (F.mercy >= 100 || F.bhp <= BOSS_HP * 0.25);
      const trusting = () => !VENGE && F.mercy >= 100;
      const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', A: 'L', D: 'R', W: 'U', S: 'D' };
      const kd = e => { const k = KEYMAP[e.key]; if (F.phase === 'dodge' && k) { keys[k] = true; e.preventDefault(); } }, ku = e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; };
      document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      const SYM = ['÷', '×', '+', '−', '%', '=', '√', 'π'];
      const star = (x, y, r) => { cx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; cx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } cx.closePath(); cx.fill(); };
      const drawBoss = (x, t, hurt) => {
        cx.save(); cx.translate(x, by + Math.sin(t / 300) * 4); if (hurt) cx.translate((Math.random() - 0.5) * 8, 0); cx.scale(0.8, 0.8);
        cx.fillStyle = '#ffc93c'; cx.beginPath(); cx.moveTo(-34, -52); cx.lineTo(-22, -70); cx.lineTo(-8, -56); cx.lineTo(0, -76); cx.lineTo(8, -56); cx.lineTo(22, -70); cx.lineTo(34, -52); cx.closePath(); cx.fill();
        cx.fillStyle = hurt ? '#ff5d73' : (VENGE ? ['#8a0f2e', '#8a0f2e', '#5c0a3f', '#2a0712'][F.vphase] : '#6c4cf5'); cx.beginPath(); cx.roundRect(-60, -52, 120, 104, 16); cx.fill();
        cx.fillStyle = '#9ff0c8'; cx.beginPath(); cx.roundRect(-46, -40, 92, 40, 8); cx.fill();
        cx.strokeStyle = '#140d33'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(-30, -30); cx.lineTo(-12, -22); cx.moveTo(30, -30); cx.lineTo(12, -22); cx.stroke();
        cx.fillStyle = '#140d33'; cx.beginPath(); cx.arc(-18, -13, 4, 0, 7); cx.arc(18, -13, 4, 0, 7); cx.fill();
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { cx.fillStyle = c === 3 ? '#ff5d73' : '#efe9ff'; cx.beginPath(); cx.roundRect(-44 + c * 23, 10 + r * 19, 18, 14, 4); cx.fill(); }
        cx.restore();
      };
      let hurtUntil = 0, hurtFlash = 0, bx = 320; const by = 68; // King's position (top, sways side to side)
      const render = now => {
        cx.fillStyle = '#140d33'; cx.fillRect(0, 0, CW, CH_H);
        drawBoss(bx, now, now < hurtUntil);
        cx.strokeStyle = F.phase === 'dodge' ? '#ffffff' : 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.strokeRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
        cx.font = 'bold 22px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        shots.forEach(s => {
          if (s.spike) { // a stack of ▲ rising from the floor
            cx.save(); cx.beginPath(); cx.rect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0); cx.clip();
            cx.fillStyle = s.done ? 'rgba(255,154,60,.4)' : '#ff9a3c'; cx.beginPath(); cx.moveTo(s.x - 9, ARENA.y1); cx.lineTo(s.x, ARENA.y1 - s.h); cx.lineTo(s.x + 9, ARENA.y1); cx.fill();
            cx.restore(); return;
          }
          if (s.gate) { // a ruler from the top and one from the bottom
            cx.save(); cx.beginPath(); cx.rect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0); cx.clip();
            cx.fillStyle = s.done ? 'rgba(255,201,60,.4)' : '#ffc93c';
            cx.fillRect(s.x - 10, ARENA.y0, 20, s.gapY - ARENA.y0); cx.fillRect(s.x - 10, s.gapY + s.gapH, 20, ARENA.y1 - s.gapY - s.gapH);
            cx.fillStyle = '#7a5300'; for (let y = ARENA.y0 + 6; y < ARENA.y1; y += 12) if (y < s.gapY || y > s.gapY + s.gapH) cx.fillRect(s.x - 10, y, y % 36 < 12 ? 9 : 5, 2);
            cx.restore(); return;
          }
          if (s.cannon) {
            const nowp = performance.now(), live = nowp >= s.warnUntil, horiz = s.side === 'L' || s.side === 'R';
            const gx = s.side === 'L' ? ARENA.x0 - 4 : s.side === 'R' ? ARENA.x1 + 4 : s.pos, gy = s.side === 'T' ? ARENA.y0 - 4 : s.side === 'B' ? ARENA.y1 + 4 : s.pos;
            cx.save();
            if (live) { cx.fillStyle = s.done ? 'rgba(160,240,255,.35)' : 'rgba(160,240,255,.9)'; cx.shadowColor = '#7fe3ff'; cx.shadowBlur = 18; if (horiz) cx.fillRect(ARENA.x0, s.pos - 22, ARENA.x1 - ARENA.x0, 44); else cx.fillRect(s.pos - 22, ARENA.y0, 44, ARENA.y1 - ARENA.y0); }
            else { cx.strokeStyle = 'rgba(127,227,255,.55)'; cx.setLineDash([6, 6]); cx.lineWidth = 2; cx.beginPath(); if (horiz) { cx.moveTo(ARENA.x0, s.pos - 22); cx.lineTo(ARENA.x1, s.pos - 22); cx.moveTo(ARENA.x0, s.pos + 22); cx.lineTo(ARENA.x1, s.pos + 22); } else { cx.moveTo(s.pos - 22, ARENA.y0); cx.lineTo(s.pos - 22, ARENA.y1); cx.moveTo(s.pos + 22, ARENA.y0); cx.lineTo(s.pos + 22, ARENA.y1); } cx.stroke(); cx.setLineDash([]); }
            cx.shadowBlur = 0; cx.translate(gx, gy); cx.rotate({ L: 0, R: Math.PI, T: Math.PI / 2, B: -Math.PI / 2 }[s.side]);
            cx.fillStyle = '#6c4cf5'; cx.beginPath(); cx.roundRect(-30, -20, 30, 40, 6); cx.fill();
            cx.fillStyle = live ? '#ffffff' : '#9ff0c8'; cx.beginPath(); cx.roundRect(-25, -15, 20, 12, 3); cx.fill();
            cx.fillStyle = '#efe9ff'; for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) cx.fillRect(-24 + j * 10, 2 + k * 8, 7, 5);
            cx.restore(); return;
          }
          if (s.stomp && s.rw) {
            const live = performance.now() >= s.warnUntil;
            cx.beginPath(); cx.roundRect(s.x - s.rw / 2, s.y - s.rh / 2, s.rw, s.rh, 12);
            if (!live) { cx.strokeStyle = 'rgba(255,93,115,.8)'; cx.setLineDash([6, 5]); cx.lineWidth = 2; cx.stroke(); cx.setLineDash([]); }
            else { cx.fillStyle = s.done ? 'rgba(255,93,115,.45)' : '#ff5d73'; cx.fill(); cx.fillStyle = '#fff'; cx.fillText('8', s.x, s.y); }
            return;
          }
          if (s.stomp) {
            const live = performance.now() >= s.warnUntil;
            if (!live) { cx.strokeStyle = 'rgba(255,93,115,.8)'; cx.setLineDash([5, 4]); cx.lineWidth = 2; cx.beginPath(); cx.arc(s.x, s.y, s.rad || 30, 0, 7); cx.stroke(); cx.setLineDash([]); }
            else { cx.fillStyle = s.done ? 'rgba(255,93,115,.45)' : '#ff5d73'; cx.beginPath(); cx.arc(s.x, s.y, s.rad || 30, 0, 7); cx.fill(); cx.fillStyle = '#fff'; cx.fillText('8', s.x, s.y); }
            return;
          }
          if (s.arm) {
            const nowp = performance.now(), live = nowp >= s.warnUntil, a = armAngle(s, nowp);
            cx.save(); cx.beginPath(); cx.rect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0); cx.clip();
            cx.strokeStyle = live ? '#ff2d55' : 'rgba(255,93,115,.35)'; cx.lineWidth = live ? 12 : 3; cx.lineCap = 'round';
            cx.beginPath(); cx.moveTo(ARM_C.x, ARM_C.y); cx.lineTo(ARM_C.x + Math.cos(a) * ARM_L, ARM_C.y + Math.sin(a) * ARM_L); cx.stroke(); cx.restore();
            cx.fillStyle = '#ffc93c'; cx.beginPath(); cx.arc(ARM_C.x, ARM_C.y, 7, 0, 7); cx.fill();
            return;
          }
          if (s.laser) {
            const live = performance.now() >= s.warnUntil; cx.fillStyle = live ? (s.done ? 'rgba(255,93,115,.4)' : '#ff2d55') : 'rgba(255,93,115,.25)';
            if (s.axis === 'h') cx.fillRect(ARENA.x0, s.pos - (live ? 9 : 2), ARENA.x1 - ARENA.x0, live ? 18 : 4); else cx.fillRect(s.pos - (live ? 9 : 2), ARENA.y0, live ? 18 : 4, ARENA.y1 - ARENA.y0);
            return;
          }
          if (s.bar) { if (s.x < ARENA.x0 || s.x > ARENA.x1) return; cx.fillStyle = s.kind === 'blue' ? '#3aa0ff' : '#ff9a3c'; cx.globalAlpha = s.done ? 0.35 : 1; cx.fillRect(s.x - 7, ARENA.y0 + 2, 14, ARENA.y1 - ARENA.y0 - 4); cx.globalAlpha = 1; return; }
          cx.fillStyle = s.c || '#ff5d73'; if (s.big) { cx.font = 'bold 34px Fredoka, sans-serif'; cx.fillText(s.s, s.x, s.y); cx.font = 'bold 22px Fredoka, sans-serif'; } else cx.fillText(s.s, s.x, s.y);
        });
        if (F.phase === 'dodge' && (!F.grav && !F.moon && (VENGE ? false : (F.turn % 12 === 4 || F.turn % 12 === 5)))) { cx.font = 'bold 12px Nunito, sans-serif'; cx.fillStyle = '#3aa0ff'; cx.fillText('BLUE: stay still', ARENA.x0 + 70, ARENA.y1 + 18); cx.fillStyle = '#ff9a3c'; cx.fillText('ORANGE: keep moving', ARENA.x1 - 85, ARENA.y1 + 18); cx.font = 'bold 22px Fredoka, sans-serif'; }
        if (now < F.sayUntil && F.say) {
          cx.font = 'bold 13px Nunito, sans-serif'; const words = F.say.split(' '), lines = ['']; words.forEach(w => { if ((lines.at(-1) + ' ' + w).length > 28) lines.push(w); else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim(); });
          const bw = Math.max(...lines.map(l => cx.measureText(l).width)) + 22, bh = lines.length * 17 + 14, right = bx < CW / 2, sx = right ? bx + 74 : bx - 74 - bw, sy = by - 46;
          cx.fillStyle = '#fff'; cx.beginPath(); cx.roundRect(sx, sy, bw, bh, 10); cx.fill();
          cx.beginPath(); const tx = right ? sx : sx + bw; cx.moveTo(tx, sy + 14); cx.lineTo(right ? tx - 12 : tx + 12, sy + 22); cx.lineTo(tx, sy + 28); cx.fill();
          cx.fillStyle = '#231a4a'; cx.textAlign = 'left'; lines.forEach((l, i) => cx.fillText(l, sx + 11, sy + 15 + i * 17)); cx.textAlign = 'center';
        }
        if (F.phase === 'dodge' && F.moon) {
          cx.fillStyle = now < hurtFlash ? '#ff5d73' : '#ffe08a'; cx.beginPath(); cx.arc(P.x, P.y, 13, 0, 7); cx.fill();
          cx.fillStyle = '#140d33'; cx.beginPath(); cx.arc(P.x + 6, P.y - 4, 11, 0, 7); cx.fill();
          const a = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[F.shield];
          cx.strokeStyle = now < blocked ? '#ffffff' : '#3aa0ff'; cx.lineWidth = 6; cx.lineCap = 'round'; cx.beginPath(); cx.arc(P.x, P.y, 26, a - 0.6, a + 0.6); cx.stroke();
          cx.fillStyle = '#fff'; cx.font = 'bold 13px Nunito, sans-serif'; cx.fillText(`🌙 Block! ${Math.max(0, Math.ceil((dodgeEnd - now) / 1000))}s`, CW / 2, ARENA.y1 + 18);
        } else if (F.phase === 'dodge' || F.phase === 'trap') { cx.fillStyle = now < hurtFlash ? '#ff5d73' : F.grav ? '#7fe3ff' : (F.defend ? '#3aa0ff' : '#ffc93c'); star(P.x, P.y, 11); cx.fillStyle = '#fff'; cx.font = 'bold 13px Nunito, sans-serif'; cx.fillText(`Dodge! ${Math.max(0, Math.ceil((dodgeEnd - now) / 1000))}s`, CW / 2, ARENA.y1 + 18); }
      };
      const ui = () => {
        $('#bHp', m).style.width = (100 * F.bhp / BOSS_HP) + '%'; $('#bHpT', m).textContent = `${Math.max(0, F.bhp)} / ${BOSS_HP}`;
        $('#pHp', m).style.width = (100 * F.hp / MAX_HP) + '%'; $('#pHpT', m).textContent = `${Math.max(0, F.hp)} / ${MAX_HP}${F.defend ? ' · 🛡️ defending' : ''}${F.powerTurns > 0 ? ` · ⚡×1.5 (${F.powerTurns})` : ''}${F.nextX ? ' · 🔥×2.5 next' : ''}${F.flat ? ` · 📐+${F.flat}` : ''}`;
        $('#bMsg', m).innerHTML = F.msg;
        $('#mHp', m).style.width = Math.min(100, F.mercy) + '%'; $('#mHpT', m).textContent = VENGE ? '🚫 Unsparable — he remembers what you did' : sparable() ? '💛 He can be spared!' : `${Math.min(100, F.mercy)}%`;
      };
      // ---- player turn ----
      const menu = () => {
        if (F.over) return; F.phase = 'menu'; shots = []; ui();
        cancelAnimationFrame(idleRaf); const idle = now => { if (F.over || F.phase === 'dodge') return; bx = CW / 2 + Math.sin(now / 1400) * Math.min(160, CW / 4); render(now); idleRaf = requestAnimationFrame(idle); }; idleRaf = requestAnimationFrame(idle);
        const sp = sparable();
        $('#bPanel', m).innerHTML = `<div class="row"><button class="btn red" id="bAtk">${trusting() ? '🗡️ Attack (he trusts you…)' : '⚔️ Attack'}</button><button class="btn" id="bTalk" style="background:#3aa0ff;box-shadow:0 4px 0 #2079d1">💬 Talk</button><button class="btn green" id="bItm">🎒 Items</button><button class="btn ghost" id="bDef">🛡️ Defend</button><button class="btn ${sp ? 'yellow' : 'ghost'}" id="bSpare">🕊️ Spare</button></div>
          <div class="muted small" style="margin-top:6px">Attack: answer a maths question to deal damage. Talk: calm him down. Spare works once he's calm or badly hurt.</div>`;
        $('#bAtk', m).onclick = F.lastStand ? finalAttack : attack; $('#bItm', m).onclick = items; $('#bTalk', m).onclick = talk;
        if (F.lastStand) { $('#bAtk', m).textContent = '⚔️ Finish him'; $('#bSpare', m).className = 'btn yellow'; }
        $('#bDef', m).onclick = () => { F.defend = true; F.msg = '🛡️ You brace yourself.'; say(pick(['Hiding behind a shield? How very... divisive.', 'Defend all you like. I have infinite digits!'])); dodge(); };
        $('#bSpare', m).onclick = () => {
          if (VENGE && F.lastStand) return trapAttack();
          if (VENGE) { F.msg = '🚫 He cannot be spared.'; say(pick(['Mercy? You had your chance.', 'I trusted you ONCE.', 'No spare. No mercy. No remainder.'])); return dodge(); }
          if (sparable()) { say('...Fine. You may go. Study hard, little number cruncher.', 6000); return end('spare'); }
          F.msg = "🕊️ He isn't ready to be spared yet."; say(pick(['SPARE me? I am the KING! Ha!', 'Mercy does not compute!', 'Try harder, human.'])); dodge();
        };
      };
      const TALK = {
        buttons: { label: '😊 Compliment his buttons', gain: 25, lines: ['My buttons? ...They ARE rather shiny.', 'Hmph. Flattery will get you... partway.', 'Nobody ever notices the % key. Thank you.'] },
        joke: { label: '😂 Tell a maths joke', gain: 35, jokes: ['Why was 6 afraid of 7? Because 7 8 9!', 'Parallel lines have so much in common. Shame they never meet.', 'I would tell you a joke about infinity, but it never ends.', 'Why did the obtuse angle go to the beach? It was over 90 degrees.'], lines: ['Ha... HA HA! Error: too funny!', 'Okay, that one got me. Beep.', '*snort* ...I did NOT laugh.'] },
        crown: { label: '👑 Ask about his crown', gain: 20, lines: ['I won it in the Great Long Division War of 1987.', 'It is heavy. Being king of maths is lonely.', 'You like it? Nobody ever asks about the crown...'] },
      };
      const talk = () => {
        F.phase = 'talk';
        $('#bPanel', m).innerHTML = `<div class="row">${Object.entries(TALK).map(([k, t]) => `<button class="btn sm" style="background:#3aa0ff;box-shadow:0 4px 0 #2079d1" data-tk="${k}">${t.label}</button>`).join('')}<button class="btn sm ghost" id="bBack">Back</button></div>`;
        $('#bBack', m).onclick = menu;
        $$('[data-tk]', m).forEach(b => b.onclick = () => {
          const t = TALK[b.dataset.tk];
          if (VENGE) { F.msg = '💬 He ignores you.'; say(pick(['Talk? After what you did?!', 'Save your jokes. I am done laughing.', 'Your words mean nothing now.'])); return dodge(); }
          F.mercy = Math.min(100, F.mercy + t.gain);
          F.msg = b.dataset.tk === 'joke' ? `😂 You: "${pick(t.jokes)}"` : `💬 You ${b.dataset.tk === 'buttons' ? 'compliment his buttons' : 'ask about his crown'}.`;
          say(sparable() ? '...Maybe we don\'t have to fight after all.' : pick(t.lines), 5000); dodge();
        });
      };
      const attack = () => {
        F.phase = 'attack';
        if (trusting()) { // betrayal: a trivial question, and he goes down in one strike
          const a = 1 + Math.floor(Math.random() * 5), b2 = 1 + Math.floor(Math.random() * 5), ans = a + b2;
          $('#bPanel', m).innerHTML = `<div style="font-weight:700;margin-bottom:8px">He lowers his guard and smiles at you. What is ${a} + ${b2}?</div><div class="ansrow"><input id="bAns" inputmode="decimal" autocomplete="off" placeholder="Answer to strike"><button class="btn red" id="bGo">Strike!</button><button class="btn ghost" id="bBack">Back</button></div>`;
          const inp = $('#bAns', m); inp.focus();
          const strike = () => {
            if (F.phase !== 'attack') return;
            if (Quiz.parse(inp.value) !== ans) { F.msg = '❌ Your hand shakes. You miss.'; say('...Were you about to hit me?'); F.mercy = 60; return dodge(); }
            F.bhp = 0; hurtUntil = performance.now() + 1500; S.kingBetrayed = true; Store.save();
            F.msg = '🗡️ One strike. He never saw it coming.'; say('But... I thought we were... friends...', 6000); ui();
            setTimeout(() => end('betray'), 1500); F.phase = 'done'; $('#bPanel', m).innerHTML = '';
          };
          inp.onkeydown = e => { if (e.key === 'Enter') strike(); }; $('#bGo', m).onclick = strike; $('#bBack', m).onclick = menu;
          return;
        }
        const q = Quiz.make(S.level, 'Mixed', F.turn < 4 ? 0 : 1); const qStart = Date.now();
        $('#bPanel', m).innerHTML = `<div style="font-weight:700;margin-bottom:8px">${q.text}</div>` + (q.choices
          ? `<div class="choices">${q.choices.map((c, i) => `<button class="choice" data-bc="${i}">${esc(c)}</button>`).join('')}</div>`
          : `<div class="ansrow"><input id="bAns" inputmode="decimal" autocomplete="off" placeholder="Answer to strike"><button class="btn red" id="bGo">Strike!</button></div>`);
        const go = v => {
          if (F.phase !== 'attack') return;
          const ok = Quiz.check(q, v);
          const pMul = F.powerTurns > 0 ? 1.5 : 1, fMul = F.nextX || 1; if (F.powerTurns > 0) F.powerTurns--; F.nextX = 0; // buffs are used up by any attack
          if (ok) {
            const fast = Date.now() - qStart < 15000; let dmg = 28 + Math.floor(Math.random() * 16) + (fast ? 12 : 0) + (F.flat || 0);
            dmg = Math.round(dmg * pMul * fMul);
            F.bhp = Math.max(0, F.bhp - dmg); hurtUntil = performance.now() + 500;
            let extra = ''; if (Math.random() < 0.25) { F.apples++; extra = ' The boss dropped an 🍎!'; }
            F.msg = `💥 Correct! You hit for <b>${dmg}</b>${fast ? ' (quick strike!)' : ''}.${extra}`;
            say(F.bhp <= BOSS_HP * 0.25 ? pick(['My battery... is running low...', 'Please... I just wanted to be good at sums...']) : pick(['OUCH! My buttons!', 'You carried the one?! Impossible!', 'Lucky guess, human!', 'ERR... ERR... recalculating!']));
            if (F.bhp <= 0 && VENGE && !F.lastStand) {
              F.bhp = 1; F.lastStand = true; F.msg = '⚠️ He clings on with <b>1 HP</b>. Attack to finish him… or Spare him?';
              say('...Not... yet... I still have one digit left...', 7000); ui(); return menu();
            }
            if (F.bhp <= 0) return end('win');
            if (VENGE && vPhase() !== F.vphase) {
              F.vphase = vPhase(); const ph = $('#vPh', m); if (ph) ph.textContent = `Phase ${F.vphase}/3`;
              say(F.vphase === 2 ? 'ERROR... ERROR... ENTERING PHASE TWO! LASER MODE!' : 'MAXIMUM CALCULATION! EVERYTHING AT ONCE!!', 5000);
              F.msg += F.vphase === 2 ? ' ⚠️ <b>Phase 2:</b> lasers and homing digits!' : ' ☠️ <b>Phase 3:</b> every attack at once!';
            }
          } else { F.msg = `❌ Missed! The answer was <b>${esc(Quiz.answerText(q))}</b>.`; say(pick(['HA! Wrong! Back to the textbook!', 'Did you even show your working?', 'Even a calculator with no batteries knows that one!'])); }
          dodge();
        };
        if (q.choices) $$('[data-bc]', m).forEach(b => b.onclick = () => go(b.dataset.bc));
        else { const inp = $('#bAns', m); inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') go(inp.value); }; $('#bGo', m).onclick = () => go(inp.value); }
      };
      const items = () => {
        const it = S.items || (S.items = {}); const pies = it.pie || 0, pots = it.potion || 0;
        $('#bPanel', m).innerHTML = `<div class="small" style="font-weight:800;margin-bottom:4px">Heal</div><div class="row">
          <button class="btn sm green" data-it="apple" ${F.apples ? '' : 'disabled'}>🍎 Apple +15 HP (${F.apples})</button>
          <button class="btn sm green" data-it="pie" ${pies ? '' : 'disabled'}>🥧 Pie +40 HP (${pies})</button>
          <button class="btn sm green" data-it="potion" ${pots ? '' : 'disabled'}>🧪 Potion full HP (${pots})</button>
          </div><div class="small" style="font-weight:800;margin:10px 0 4px">Power up</div><div class="row">
          <button class="btn sm red" data-it="pencil" ${it.pencil ? '' : 'disabled'}>⚡ Power Pencil: ×1.5 damage for 3 attacks (${it.pencil || 0})</button>
          <button class="btn sm red" data-it="ruler" ${it.ruler ? '' : 'disabled'}>🔥 Fire Ruler: next attack ×2.5 (${it.ruler || 0})</button>
          <button class="btn sm red" data-it="compass" ${it.compass ? '' : 'disabled'}>📐 Sharp Compass: +12 damage for this fight (${it.compass || 0})</button>
          <button class="btn sm ghost" id="bBack">Back</button></div><div class="muted small" style="margin-top:6px">Buy items in the Shop before a fight. Using an item takes your turn.</div>`;
        $('#bBack', m).onclick = menu;
        $$('[data-it]', m).forEach(b => b.onclick = () => {
          const k = b.dataset.it, before = F.hp;
          if (k === 'apple') { F.apples--; F.hp = Math.min(MAX_HP, F.hp + 15); }
          if (k === 'pie') { it.pie--; F.hp = Math.min(MAX_HP, F.hp + 40); }
          if (k === 'potion') { it.potion--; F.hp = MAX_HP; }
          if (k === 'pencil') { it.pencil--; F.powerTurns = 3; Store.save(); F.msg = '⚡ Power Pencil! Your next 3 attacks deal ×1.5 damage.'; say('Is that... a mechanical pencil?!'); return dodge(); }
          if (k === 'ruler') { it.ruler--; F.nextX = 2.5; Store.save(); F.msg = '🔥 Fire Ruler! Your next attack deals ×2.5 damage.'; say('Put that ruler DOWN!'); return dodge(); }
          if (k === 'compass') { it.compass--; F.flat = (F.flat || 0) + 12; Store.save(); F.msg = `📐 Sharp Compass! +${F.flat} damage on every attack this fight.`; say('Ow, that thing is POINTY.'); return dodge(); }
          Store.save(); F.msg = `💚 You healed ${F.hp - before} HP.`; dodge();
        });
      };
      // ---- boss turn ----
      const dodge = () => {
        if (F.over) return;
        F.phase = 'dodge'; F.turn++; shots = []; P.x = AC.x; P.y = AC.y; inv = 0;
        F.moon = F.turn > 1 && Math.random() < 0.25; F.shield = 'U'; F.moonLast = 0; F.barsFromLeft = Math.random() < 0.5; // bar walls come from one side per round
        // gravity rounds: you fall to the floor and jump over number spikes
        F.grav = !F.moon && (VENGE ? (F.vphase === 2 ? F.turn % 6 === 3 : F.vphase === 3 && Math.random() < 0.2) : F.turn % 12 === 10);
        P.vy = 0; if (F.grav) P.y = ARENA.y1 - 10;
        dodgeEnd = performance.now() + DODGE_MS; spawnT = 400; last = performance.now();
        $('#bPanel', m).innerHTML = `<div class="muted small">${F.moon ? '🌙 <b>Moon mode!</b> You can\'t move. Turn your shield with WASD or the arrow keys to block numbers from each side.' : F.grav ? '⬇ <b>Gravity!</b> You fall to the floor. Jump with W or ↑, move with A/D or ←/→.' : 'Move the ⭐ with WASD or the arrow keys. Every hit costs HP.'}</div>${matchMedia('(pointer:coarse)').matches ? '<div class="dpad" id="bPad" style="margin-top:8px"><span></span><button data-k="U">↑</button><span></span><button data-k="L">←</button><button data-k="D">↓</button><button data-k="R">→</button></div>' : ''}`; ui();
        $$('#bPad button', m).forEach(b => { const k = b.dataset.k; b.onpointerdown = e => { e.preventDefault(); keys[k] = true; }; b.onpointerup = b.onpointerleave = b.onpointercancel = () => { keys[k] = false; }; });
        cancelAnimationFrame(idleRaf); if (F.moon) say(pick(['To the MOON with you!', 'Let\'s see you block THIS!', 'No running this time!']), 2500); else if (F.turn === 1 && !F.say) say('Who dares disturb my calculations?!');
        else if (!(performance.now() < F.sayUntil)) say(pick(VENGE ? ['This is for last time!', 'Divide and CONQUER!', 'Feel my betrayal, squared!', 'No remainder. No mercy.'] : ['Dodge THIS!', 'Feel the power of long division!', 'Have some fractions!', 'I hope you revised!', 'Times tables, ATTACK!']), 2500);
        raf = requestAnimationFrame(loop);
      };
      // moon mode: numbers fly in from the four sides; the shield must face them
      let blocked = 0;
      const moonSpawn = now => {
        // fair by design: one number at a time, each reaching the shield at a scheduled moment,
        // with arrivals always spaced far enough apart to turn the shield
        const r = rage(), C = AC;
        const travel = 1500 / Math.sqrt(r), gap = Math.max(VENGE ? 380 : 450, (VENGE ? 620 : 760) / Math.sqrt(r));
        const arrive = Math.max(now + travel, (F.moonLast || 0) + gap); F.moonLast = arrive;
        const d = pick(['U', 'D', 'L', 'R']);
        const st = { U: [C.x, ARENA.y0 + 4], D: [C.x, ARENA.y1 - 4], L: [Math.max(ARENA.x0 + 4, C.x - 320), C.y], R: [Math.min(ARENA.x1 - 4, C.x + 320), C.y] }[d], len = Math.hypot(C.x - st[0], C.y - st[1]);
        const v = (len - 30) / (arrive - now); // reaches the shield ring (radius 30) exactly at its arrival time
        shots.push({ moonShot: true, dir: d, x: st[0], y: st[1], vx: (C.x - st[0]) / len * v, vy: (C.y - st[1]) / len * v, s: pick(SYM), c: '#ffe08a' });
        return gap;
      };
      // number spikes slide along the floor (gravity rounds); the Vengeful King mixes in cannons
      const gravSpawn = now => {
        const r = rage(), fromLeft = F.barsFromLeft;
        if (VENGE && F.vphase === 3 && Math.random() < 0.3) return cannons(now, r);
        const h = 26 + Math.random() * (VENGE ? 52 : 40);
        shots.push({ spike: true, h, x: fromLeft ? ARENA.x0 - 12 : ARENA.x1 + 12, y: ARENA.y1, vx: (fromLeft ? 1 : -1) * (0.15 + Math.random() * 0.04) * r * span(), vy: 0 });
        return Math.max(520, 1050 / r);
      };
      // ruler gates: rulers from the top and bottom with a gap to slip through
      const gates = (now, r) => {
        const fromLeft = F.barsFromLeft, gapH = VENGE ? 92 : 110, gapY = ARENA.y0 + 30 + Math.random() * (ARENA.y1 - ARENA.y0 - 60 - gapH);
        shots.push({ gate: true, gapY, gapH, x: fromLeft ? ARENA.x0 - 12 : ARENA.x1 + 12, y: AC.y, vx: (fromLeft ? 1 : -1) * 0.14 * r * span(), vy: 0 });
        return Math.max(700, 1250 / r);
      };
      // calculator cannons charge at the edge of the box, then fire a thick beam across it
      const cannons = (now, r) => {
        const n = F.vphase === 3 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const side = pick(['L', 'R', 'T', 'B']), horiz = side === 'L' || side === 'R';
          const pos = k === 0 ? (horiz ? P.y : P.x) : (horiz ? ARENA.y0 + 40 + Math.random() * (ARENA.y1 - ARENA.y0 - 80) : ARENA.x0 + 40 + Math.random() * (ARENA.x1 - ARENA.x0 - 80));
          shots.push({ cannon: true, side, pos, warnUntil: now + 950, liveUntil: now + 1650, x: AC.x, y: AC.y, vx: 0, vy: 0 });
        }
        return Math.max(650, 1300 / r);
      };
      const rage = () => 1 + (VENGE ? 0.45 : 0) + (1 - F.bhp / BOSS_HP) * 0.8 + Math.min(F.turn, 20) * 0.03;

      // ---- extra attacks shared by both forms ----
      const atk = {
        bouncers: (now, r) => { for (let k = 0; k < 2; k++) { const a = Math.PI / 2 + (Math.random() - 0.5) * 1.6, v = 0.15 * r; shots.push({ bounce: true, until: now + 5200, x: ARENA.x0 + 30 + Math.random() * (ARENA.x1 - ARENA.x0 - 60), y: ARENA.y0 + 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: '0', c: '#20bf8a' }); } return 1500 / r; },
        waves: (now, r) => { const left = Math.random() < 0.5, baseY = ARENA.y0 + 18 + Math.random() * (ARENA.y1 - ARENA.y0 - 36); for (let k = 0; k < 5; k++) shots.push({ wave: true, t0: now - k * 120, baseY, amp: 22 + Math.random() * 14, x: left ? ARENA.x0 - 20 - k * 22 : ARENA.x1 + 20 + k * 22, y: baseY, vx: (left ? 1 : -1) * 0.14 * r * span(), vy: 0, s: pick(['1', '2', '3', '4', '5']), c: '#c084fc' }); return 900 / r; },
        splitters: (now, r) => { shots.push({ split: ARENA.y0 + 30 + Math.random() * (ARENA.y1 - ARENA.y0 - 60), x: ARENA.x0 + 30 + Math.random() * (ARENA.x1 - ARENA.x0 - 60), y: ARENA.y0 - 20, vx: 0, vy: 0.12 * r, s: '÷', c: '#ff9a3c', big: true }); return 1000 / r; },
        stomps: (now, r) => { shots.push({ stomp: true, x: P.x, y: P.y, warnUntil: now + Math.max(500, 900 / r), liveUntil: now + Math.max(500, 900 / r) + 350, vx: 0, vy: 0 }); return 850 / r; },
        arm: (now, r) => { if (shots.some(s => s.arm)) return 400; shots.push({ arm: true, start: now, ph0: P.x > ARM_C.x ? Math.PI / 2 : -Math.PI / 2, speed: 0.0012 * r, warnUntil: now + 900, liveUntil: now + 5200, x: 240, y: 220, vx: 0, vy: 0 }); return 600; },
      };
      // the arm is a wiper fixed at the top-middle of the arena, swinging side to side
      const armAngle = (s, now) => Math.PI / 2 + Math.PI * 0.44 * Math.sin(s.ph0 + s.speed * Math.max(0, now - s.warnUntil));
      const segDist = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); };
      const ARM_C = { x: (ARENA.x0 + ARENA.x1) / 2, y: ARENA.y0 }; let ARM_L = 440;
      // fit the canvas, box and helpers to the space on screen
      const span = () => Math.min(1.6, Math.max(1, (ARENA.x1 - ARENA.x0) / 600));
      const layout = () => {
        const stage = $('.bossstage', m); if (!stage) return;
        const W = Math.max(320, stage.clientWidth), H = Math.max(260, stage.clientHeight), dpr = window.devicePixelRatio || 1;
        CW = W; CH_H = H; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ARENA.x0 = 12; ARENA.x1 = W - 12; ARENA.y0 = 136; ARENA.y1 = H - 30;
        const ox = AC.x, oy = AC.y; AC.x = (ARENA.x0 + ARENA.x1) / 2; AC.y = (ARENA.y0 + ARENA.y1) / 2;
        ARM_C.x = AC.x; ARM_C.y = ARENA.y0; ARM_L = Math.hypot(ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
        if (F.phase === 'dodge' && !F.moon) { P.x += AC.x - ox; P.y += AC.y - oy; } else { P.x = AC.x; P.y = AC.y; }
        P.x = Math.max(ARENA.x0 + 8, Math.min(ARENA.x1 - 8, P.x)); P.y = Math.max(ARENA.y0 + 8, Math.min(ARENA.y1 - 8, P.y));
        if (F.grav) P.y = Math.min(P.y, ARENA.y1 - 10);
        render(performance.now());
      };
      const ro = window.ResizeObserver ? new ResizeObserver(() => layout()) : null;
      if (ro) ro.observe($('.bossstage', m)); else window.addEventListener('resize', layout);
      const vSpawn = now => {
        const ph = F.vphase, r = rage(), cxp = bx, cyp = by;
        const spiral = () => { for (let arm = 0; arm < (ph === 3 ? 3 : 2); arm++) { const a = now / 260 + arm * 2 * Math.PI / (ph === 3 ? 3 : 2), v = 0.12 * r; shots.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.abs(Math.sin(a)) * v + 0.03, s: '∞', c: '#ff2d55' }); } return 110 / Math.sqrt(r); };
        const bars = () => { const fromLeft = F.barsFromLeft; shots.push({ bar: true, kind: Math.random() < 0.5 ? 'blue' : 'orange', x: fromLeft ? ARENA.x0 - 10 : ARENA.x1 + 10, y: 0, vx: (fromLeft ? 1 : -1) * 0.22 * r * span(), vy: 0 }); return 750 / r; };
        const laser = () => { const h = Math.random() < 0.5; shots.push({ laser: true, axis: h ? 'h' : 'v', pos: h ? (Math.random() < 0.6 ? P.y : ARENA.y0 + 15 + Math.random() * (ARENA.y1 - ARENA.y0 - 30)) : (Math.random() < 0.6 ? P.x : ARENA.x0 + 15 + Math.random() * (ARENA.x1 - ARENA.x0 - 30)), warnUntil: now + 750, liveUntil: now + 1350, x: 240, y: 200, vx: 0, vy: 0 }); return 700 / r; };
        const homing = () => { shots.push({ homing: 1600, x: cxp, y: cyp, vx: 0, vy: 0.1, s: pick(['7', '3', '9', '0']), c: '#ffc93c' }); return 520 / r; };
        // vengeful-only attacks
        const crossLaser = () => { const w = now + 850, l = now + 1450; shots.push({ laser: true, axis: 'h', pos: P.y, warnUntil: w, liveUntil: l, x: AC.x, y: AC.y, vx: 0, vy: 0 }, { laser: true, axis: 'v', pos: P.x, warnUntil: w, liveUntil: l, x: AC.x, y: AC.y, vx: 0, vy: 0 }); return 1250 / r; };
        const stompGrid = () => { // 3×3 stomps with one safe square
          const cellW = (ARENA.x1 - ARENA.x0) / 3, cellH = (ARENA.y1 - ARENA.y0) / 3, cell = Math.min(cellW, cellH), safe = Math.floor(Math.random() * 9), w = now + Math.max(800, 1300 / r);
          for (let k = 0; k < 9; k++) if (k !== safe) shots.push({ stomp: true, rw: cellW - 10, rh: cellH - 10, rad: cell / 2 - 6, x: ARENA.x0 + cellW * (k % 3 + 0.5), y: ARENA.y0 + cellH * (Math.floor(k / 3) + 0.5), warnUntil: w, liveUntil: w + 400, vx: 0, vy: 0 });
          return 2000 / r;
        };
        const collapseRing = () => { // a ring closes in on you; escape through the gap
          const n = 16, gap = Math.floor(Math.random() * n), v = 0.085 * r;
          for (let k = 0; k < n; k++) { if (k === gap || k === (gap + 1) % n) continue; const a = k * 2 * Math.PI / n; shots.push({ x: P.x + Math.cos(a) * 175, y: P.y + Math.sin(a) * 175, vx: -Math.cos(a) * v, vy: -Math.sin(a) * v, s: pick(SYM), c: '#ff2d55' }); }
          return 2100 / r;
        };
        const sideVolley = () => { // a column of digits from one side, with one gap
          const fromLeft = F.barsFromLeft, n = 7, gap = Math.floor(Math.random() * (n - 1)), step = (ARENA.y1 - ARENA.y0) / n;
          for (let k = 0; k < n; k++) { if (k === gap || k === gap + 1) continue; shots.push({ x: fromLeft ? ARENA.x0 - 10 : ARENA.x1 + 10, y: ARENA.y0 + step * (k + 0.5), vx: (fromLeft ? 1 : -1) * 0.15 * r * span(), vy: 0, s: pick(['6', '6', '6', '9']), c: '#ff9a3c' }); }
          return 1100 / r;
        };
        if (ph === 1) return [spiral, bars, () => atk.waves(now, r), () => atk.bouncers(now, r), sideVolley, () => gates(now, r)][F.turn % 6]();
        if (ph === 2) return [laser, homing, () => cannons(now, r), () => atk.stomps(now, r), () => (Math.random() < 0.5 ? atk.arm(now, r) : laser()), crossLaser, stompGrid][F.turn % 7]();
        return pick([spiral, bars, laser, homing, crossLaser, stompGrid, collapseRing, sideVolley, () => cannons(now, r), () => cannons(now, r), () => gates(now, r), () => atk.stomps(now, r), () => atk.arm(now, r), () => atk.splitters(now, r), () => atk.waves(now, r)])();
      };
      const spawn = now => {
        if (VENGE) return vSpawn(now);
        const pat = F.turn % 12, r = rage(), cxp = bx, cyp = by;
        if (pat === 11) return gates(now, r);
        if (pat === 6) return atk.bouncers(now, r);
        if (pat === 7) return atk.waves(now, r);
        if (pat === 8) return atk.splitters(now, r);
        if (pat === 9) return atk.stomps(now, r);
        if (pat === 1) { // aimed volley
          for (let k = 0; k < 3; k++) { const a = Math.atan2(P.y - cyp, P.x - cxp) + (Math.random() - 0.5) * 0.9, v = (0.13 + Math.random() * 0.06) * r; shots.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: SYM[k % SYM.length] }); }
          return 420 / r;
        }
        if (pat === 2) { // rain
          for (let k = 0; k < 2; k++) shots.push({ x: ARENA.x0 + Math.random() * (ARENA.x1 - ARENA.x0), y: ARENA.y0 - 20, vx: 0, vy: (0.12 + Math.random() * 0.08) * r, s: SYM[Math.floor(Math.random() * SYM.length)], c: '#c084fc' });
          return 260 / r;
        }
        if (pat === 3) { // ring burst
          const n = 10, off = Math.random() * Math.PI; for (let k = 0; k < n; k++) { const a = off + k * 2 * Math.PI / n, v = 0.11 * r; shots.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: '×', c: '#ff5d73' }); }
          return 900 / r;
        }
        if (pat === 4 || pat === 5) { // blue bars: stay still · orange bars: keep moving
          const fromLeft = F.barsFromLeft, kind = pat === 4 ? (Math.random() < 0.7 ? 'blue' : 'orange') : (Math.random() < 0.5 ? 'blue' : 'orange');
          shots.push({ bar: true, kind, x: fromLeft ? ARENA.x0 - 10 : ARENA.x1 + 10, y: (ARENA.y0 + ARENA.y1) / 2, vx: (fromLeft ? 1 : -1) * 0.16 * r * span(), vy: 0 });
          if (pat === 5 && Math.random() < 0.5) { const a = Math.atan2(P.y - cyp, P.x - cxp), v = 0.12 * r; shots.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: pick(SYM) }); }
          return 1100 / r;
        }
        // walls with a gap
        const gap = ARENA.x0 + 40 + Math.random() * (ARENA.x1 - ARENA.x0 - 120);
        for (let x = ARENA.x0 + 10; x < ARENA.x1; x += 24) if (x < gap || x > gap + 70) shots.push({ x, y: ARENA.y0 - 20, vx: 0, vy: 0.1 * r, s: '=', c: '#20bf8a' });
        return 1300 / r;
      };
      const loop = now => {
        if (F.over || F.phase !== 'dodge') return;
        const dt = Math.min(50, now - last); last = now;
        const px0 = P.x, py0 = P.y;
        if (F.moon) { for (const k of ['U', 'D', 'L', 'R']) if (keys[k]) F.shield = k; }
        else if (F.grav) {
          const sp = 0.17 * dt, floor = ARENA.y1 - 10, onGround = P.y >= floor - 0.5;
          if (keys.L) P.x -= sp; if (keys.R) P.x += sp;
          if (keys.U && onGround) P.vy = -0.56;
          P.vy += 0.0013 * dt; P.y += P.vy * dt;
          if (P.y >= floor) { P.y = floor; P.vy = 0; } if (P.y < ARENA.y0 + 10) { P.y = ARENA.y0 + 10; P.vy = Math.max(0, P.vy); }
          P.x = Math.max(ARENA.x0 + 8, Math.min(ARENA.x1 - 8, P.x));
        }
        else { const sp = 0.17 * dt; if (keys.L) P.x -= sp; if (keys.R) P.x += sp; if (keys.U) P.y -= sp; if (keys.D) P.y += sp; clamp(); }
        const moving = Math.abs(P.x - px0) + Math.abs(P.y - py0) > 0.01;
        bx = CW / 2 + Math.sin(now / 700) * Math.min(220, CW / 3);
        spawnT -= dt; if (spawnT <= 0) spawnT = F.final ? finalSpawn(now) : F.moon ? moonSpawn(now) : F.grav ? gravSpawn(now) : spawn(now);
        shots.forEach(s => {
          if (s.homing > 0) { s.homing -= dt; const a = Math.atan2(P.y - s.y, P.x - s.x), v = 0.16 * rage(); s.vx += (Math.cos(a) * v - s.vx) * 0.04; s.vy += (Math.sin(a) * v - s.vy) * 0.04; }
          s.x += s.vx * dt; s.y += s.vy * dt;
          if (s.bounce && s.y > ARENA.y0 + 8) { if (s.x < ARENA.x0 + 8 || s.x > ARENA.x1 - 8) { s.vx *= -1; s.x = Math.max(ARENA.x0 + 8, Math.min(ARENA.x1 - 8, s.x)); } if (s.y > ARENA.y1 - 8) { s.vy = -Math.abs(s.vy); } else if (s.y < ARENA.y0 + 10 && s.vy < 0) { s.vy = Math.abs(s.vy); } }
          if (s.wave) s.y = s.baseY + s.amp * Math.sin((now - s.t0) / 220);
        });
        const kids = [];
        shots = shots.filter(s => { if (s.split && s.y >= s.split) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, v = 0.13 * rage(); kids.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: '•', c: '#ff9a3c' }); } return false; } return true; });
        shots.push(...kids);
        shots = shots.filter(s => (s.laser || s.stomp || s.arm || s.cannon) ? now < s.liveUntil : s.bounce ? now < s.until : (s.x > -30 && s.x < CW + 30 && s.y < CH_H + 30 && s.y > -40));
        // no invulnerability: every symbol that touches you deals damage, then disappears
        let hitNow = false;
        const dmgNow = () => Math.round((5 + Math.floor(rage() * 2)) * DMG_X * (F.defend ? 0.5 : 1));
        shots.forEach(s => {
          if (s.spike && !s.done && Math.abs(P.x - s.x) < 9 + 8 && P.y > ARENA.y1 - s.h - 8) { s.done = true; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; }
          if (s.gate && !s.done && Math.abs(P.x - s.x) < 10 + 8 && (P.y < s.gapY + 8 || P.y > s.gapY + s.gapH - 8)) { s.done = true; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; }
          if (s.cannon && !s.done && now >= s.warnUntil && Math.abs(((s.side === 'L' || s.side === 'R') ? P.y : P.x) - s.pos) < 22 + 8) { s.done = true; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; }
          if (s.stomp && !s.done && now >= s.warnUntil && (s.rw ? (Math.abs(P.x - s.x) < s.rw / 2 + 4 && Math.abs(P.y - s.y) < s.rh / 2 + 4) : Math.hypot(P.x - s.x, P.y - s.y) < (s.rad || 30) + 4)) { s.done = true; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; }
          if (s.arm && now >= s.warnUntil && (!s.lastHit || now - s.lastHit > 450)) { const a = armAngle(s, now); if (segDist(P.x, P.y, ARM_C.x, ARM_C.y, ARM_C.x + Math.cos(a) * ARM_L, ARM_C.y + Math.sin(a) * ARM_L) < 11) { s.lastHit = now; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; } }
        });
        shots.forEach(s => { if (s.laser && !s.done && now >= s.warnUntil && Math.abs((s.axis === 'h' ? P.y : P.x) - s.pos) < 13) { s.done = true; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; } });
        shots.forEach(s => { if (s.bar && !s.done && Math.abs(s.x - P.x) < 15) { const hurts = s.kind === 'blue' ? moving : !moving; if (hurts) { s.done = true; F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; } } });
        shots = shots.filter(s => {
          if (!s.moonShot) return true;
          if (Math.hypot(s.x - P.x, s.y - P.y) < 30) { if (s.dir === F.shield) { blocked = now + 120; return false; } F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; return false; }
          return true;
        });
        shots = shots.filter(s => { if (!s.moonShot && !s.spike && !s.gate && !s.cannon && !s.bar && !s.laser && !s.stomp && !s.arm && s.y > ARENA.y0 - 5 && Math.hypot(s.x - P.x, s.y - P.y) < 15) { F.hp = Math.max(0, F.hp - dmgNow()); hitNow = true; return false; } return true; });
        if (hitNow) {
          hurtFlash = now + 150;
          if (F.hp <= 0 && VENGE && !F.spared) { // once per fight, the Vengeful King refuses to let you fall
            F.spared = true; F.hp = MAX_HP; shots = [];
            say("...No. I'm not as bad as you are.", 7000);
            F.msg = '💚 The Vengeful King healed you back to full HP. He will not do it twice.';
          }
          ui(); if (F.hp <= 0) return end('lose');
        }
        render(now);
        if (F.final) finalTick(now);
        if (now >= dodgeEnd && F.final) return end('final');
        if (now >= dodgeEnd) { F.defend = false; F.msg = `Your turn! (round ${F.turn + 1})`; menu(); return; }
        raf = requestAnimationFrame(loop);
      };
      // ---- clock + ending ----
      clockT = setInterval(() => {
        const left = LIMIT - (Date.now() - F.t0); const el = $('#bTime', m); if (el) el.textContent = mmss(left);
        if (left <= 0 && !F.over) end('time');
      }, 500);
      const stop = () => { if (ro) ro.disconnect(); else window.removeEventListener('resize', layout); F.over = true; cancelAnimationFrame(raf); cancelAnimationFrame(idleRaf); clearInterval(clockT); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); m.remove(); };
      // ---- the Vengeful King's last stand ----
      const FINAL = [ // [seconds, mode, line]
        [4, 'cannons', 'THIS IS IT. EVERY NUMBER I HAVE LEFT!'],
        [4, 'bars', 'Blue! Orange! Blue! Keep up!'],
        [4, 'grav', 'Down you go!'],
        [4, 'lasers', 'Cross my lines!'],
        [4, 'moon', 'Block THIS, if you can!'],
        [5, 'all', 'EVERYTHING AT ONCE!!'],
      ];
      const finalMode = now => { let t = (now - F.finalStart) / 1000; for (const [d, mode, line] of FINAL) { if (t < d) return [mode, line]; t -= d; } return ['all', '']; };
      const finalTick = now => {
        const [mode, line] = finalMode(now);
        if (mode === F.fMode) return;
        F.fMode = mode; shots = shots.filter(s => !s.moonShot); say(line, 3500);
        F.moon = mode === 'moon'; F.grav = mode === 'grav'; P.vy = 0; F.moonLast = 0;
        if (F.moon) { P.x = AC.x; P.y = AC.y; } else if (F.grav) P.y = ARENA.y1 - 10;
        $('#bPanel', m).innerHTML = `<div class="small" style="font-weight:800">☠️ FINAL ATTACK — survive!</div><div class="muted small">${F.moon ? '🌙 Turn your shield with WASD/arrows.' : F.grav ? '⬇ Gravity: jump with W/↑.' : 'Move with WASD or the arrow keys.'}</div>`;
      };
      const finalSpawn = now => {
        const r = rage() * 1.15, mode = F.fMode;
        if (mode === 'moon') return moonSpawn(now);
        if (mode === 'grav') return gravSpawn(now);
        if (mode === 'cannons') return cannons(now, r) * 0.7;
        if (mode === 'bars') { const fromLeft = F.barsFromLeft; shots.push({ bar: true, kind: Math.random() < 0.5 ? 'blue' : 'orange', x: fromLeft ? ARENA.x0 - 10 : ARENA.x1 + 10, y: 0, vx: (fromLeft ? 1 : -1) * 0.2 * r * span(), vy: 0 }); return 620 / r; }
        if (mode === 'lasers') { const w = now + 700, l = now + 1250; shots.push({ laser: true, axis: 'h', pos: P.y, warnUntil: w, liveUntil: l, x: AC.x, y: AC.y, vx: 0, vy: 0 }, { laser: true, axis: 'v', pos: P.x, warnUntil: w, liveUntil: l, x: AC.x, y: AC.y, vx: 0, vy: 0 }); return 900 / r; }
        // all: a rotating mix
        const k = Math.floor(Math.random() * 3);
        if (k === 0) cannons(now, r); else if (k === 1) { const a = Math.atan2(P.y - by, P.x - bx); for (let j = -1; j <= 1; j++) shots.push({ x: bx, y: by, vx: Math.cos(a + j * 0.25) * 0.2 * r, vy: Math.sin(a + j * 0.25) * 0.2 * r, s: pick(SYM), c: '#ff2d55' }); }
        else { const h = Math.random() < 0.5; shots.push({ laser: true, axis: h ? 'h' : 'v', pos: h ? P.y : P.x, warnUntil: now + 650, liveUntil: now + 1150, x: AC.x, y: AC.y, vx: 0, vy: 0 }); }
        return 520 / r;
      };
      const finalAttack = () => {
        if (F.over) return;
        F.final = true; F.spared = true; F.fMode = ''; F.phase = 'dodge'; F.defend = false; shots = []; P.x = AC.x; P.y = AC.y;
        F.barsFromLeft = Math.random() < 0.5; F.finalStart = performance.now();
        dodgeEnd = F.finalStart + FINAL.reduce((a, f) => a + f[0], 0) * 1000; spawnT = 600; last = performance.now();
        F.msg = '☠️ He gathers every number he has left…'; ui(); cancelAnimationFrame(idleRaf);
        raf = requestAnimationFrame(loop);
      };
      const trapAttack = () => {
        if (F.over) return;
        F.phase = 'trap'; cancelAnimationFrame(idleRaf); shots = [];
        say('...Mercy? Heh. You should have known better.', 6000); F.msg = '🕊️ You lower your guard and offer mercy…'; ui();
        $('#bPanel', m).innerHTML = '<div class="small" style="font-weight:800">💀 There is nowhere to run.</div>';
        const t0 = performance.now(), hp0 = F.hp;
        const trap = now => {
          if (F.over) return;
          const k = Math.min(1, (now - t0) / 2600);
          if (Math.random() < 0.9) for (let j = 0; j < 4; j++) shots.push({ x: ARENA.x0 + Math.random() * (ARENA.x1 - ARENA.x0), y: ARENA.y0 + Math.random() * (ARENA.y1 - ARENA.y0), vx: 0, vy: 0, s: pick(SYM), c: '#ff2d55' });
          shots = shots.slice(-260); F.hp = Math.max(0, Math.round(hp0 * (1 - k))); hurtFlash = now + 100; ui(); render(now);
          if (k >= 1) return end('trap');
          raf = requestAnimationFrame(trap);
        };
        setTimeout(() => { raf = requestAnimationFrame(trap); }, 1200);
      };
      const end = result => {
        if (F.over) return; F.over = true; cancelAnimationFrame(raf); cancelAnimationFrame(idleRaf); clearInterval(clockT); ui(); render(performance.now());
        let title, body;
        if (result === 'final') { S.kingBetrayed = false; Store.save(); shots = []; say('...You... actually... did it... ...Where am I? Why is my crown on backwards?', 9000); render(performance.now()); title = '🏆 You survived his final attack!'; body = (demo ? '' : '+5,000 🪙. ') + 'The Vengeful King collapses. When he wakes up, he is the normal Calculator King again.'; if (!demo) addTokens(5000, 'Survived the final attack'); }
        else if (result === 'win' && VENGE) { S.kingBetrayed = false; Store.save(); say('...Where am I? Why is my crown on backwards?', 8000); render(performance.now()); title = '🏆 You defeated the Vengeful King!'; body = (demo ? '' : '+3,000 🪙. ') + 'His anger fades. He is back to being the normal Calculator King, and can be spared again.'; if (!demo) addTokens(3000, 'Vengeful King defeated'); }
        else if (result === 'win') { title = '🏆 You defeated the Calculator King!'; body = demo ? 'Preview — no tokens.' : '+1,000 🪙 victory bonus.'; if (!demo) addTokens(1000, 'Boss defeated'); }
        else if (result === 'betray') { title = '🗡️ You struck him down while he trusted you.'; body = (demo ? '' : '+1,000 🪙. ') + 'He will remember this. Next time there will be no mercy.'; if (!demo) addTokens(1000, 'Boss defeated'); }
        else if (result === 'spare') { title = '🕊️ You spared the Calculator King!'; body = demo ? 'Preview — no tokens.' : 'He drops a peace offering: +500 🪙.'; if (!demo) addTokens(500, 'Spared the King'); }
        else if (result === 'time') { title = '⏳ You survived 15 minutes!'; body = 'The Calculator King gives up and leaves.'; }
        else {
          title = result === 'trap' ? '💀 He used your mercy against you.' : '💀 You ran out of HP…';
          if (demo) body = `Preview — in a real fight you'd lose ${fmt(10000)} 🪙 to the sender.`;
          else {
            const amt = Math.min(10000, S.tokens); S.tokens -= amt; Store.save(); renderHud();
            if (fromCid && fromCid !== 'bot') Net.send('ack', { to: fromCid, from: Net.cid, loot: amt, name: S.name || 'Player' });
            body = `${fmt(amt)} 🪙 went to ${esc(from)}.`;
          }
        }
        $('#bPanel', m).innerHTML = `<div style="text-align:center"><h2 style="margin:6px 0">${title}</h2><p>${body}</p><button class="btn green" id="bDone">Back to the quiz</button></div>`;
        $('#bDone', m).onclick = () => { stop(); this.boss = null; if (QZ) QZ.paused--; };
      };
      if (demo) $('#bEnd', m).onclick = () => { stop(); this.boss = null; if (QZ) QZ.paused--; };
      this.boss = () => { stop(); };
      layout();
      say(VENGE ? 'YOU. I remember you, traitor. No mercy this time!' : 'Who dares disturb my calculations?! I am the CALCULATOR KING!', 5000); menu();
    },
  };

  // =====================================================================
  // ARCADE
  // =====================================================================
  function viewArcade() {
    const has = S.arcadeMs > 0;
    $('#view').innerHTML = `
      <div class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><div><h2 style="margin:0">🕹️ Arcade</h2><div class="muted">Time left: <b>${mmss(S.arcadeMs)}</b> · Each quiz adds 10 minutes (Hard: 15), up to 30.</div></div>
        ${has ? '' : '<button class="btn green" id="earn">Do a quiz to unlock ▶</button>'}</div></div>
      <div class="grid g3">${Games.list.map(g => `<button class="gametile" data-g="${g.id}" style="background:${g.color};opacity:${has ? 1 : .55}"><span class="e">${g.emoji}</span><div><div class="big">${g.name}</div><div class="small">${g.desc}</div></div></button>`).join('')}</div>`;
    if (!has) $('#earn').onclick = () => route('study');
    $$('[data-g]').forEach(b => b.onclick = () => { if (S.arcadeMs <= 0) return toast('No Arcade time left. Finish a quiz to earn more!', 'bad'); playGame(Games.list.find(g => g.id === b.dataset.g)); });
  }
  function playGame(g) {
    $('#view').innerHTML = `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">${g.emoji} ${g.name}</h2><div class="row"><span class="pill" style="background:#efeafe;color:#6c4cf5">⏱ <b id="arcLeft">${mmss(S.arcadeMs)}</b></span><button class="btn sm ghost" id="exit">Exit</button></div></div><div id="gameArea"></div></div>`;
    let stopGame = null, done = false;
    const area = $('#gameArea');
    const tick = setInterval(() => {
      S.arcadeMs = Math.max(0, S.arcadeMs - 1000); renderHud(); const el = $('#arcLeft'); if (el) el.textContent = mmss(S.arcadeMs);
      if (S.arcadeMs % 10000 === 0) Store.save();
      if (S.arcadeMs <= 0 && !done) api.end(0, "Arcade time's up! Finish a quiz to play more.");
    }, 1000);
    const api = {
      end(tokens, msg) {
        if (done) return; done = true; clearInterval(tick); if (stopGame) stopGame(); Store.save();
        if (tokens) addTokens(tokens, g.name);
        area.innerHTML = `<div style="text-align:center;padding:20px"><div style="font-size:54px">${tokens > 0 ? '🎉' : tokens < 0 ? '💥' : '🎮'}</div><h2>${esc(msg)}</h2><p class="big" style="font-size:22px">${tokens > 0 ? '+' : ''}${fmt(tokens)} 🪙</p>
          <div class="row" style="justify-content:center"><button class="btn green" id="again" ${S.arcadeMs > 0 ? '' : 'disabled'}>Play again</button><button class="btn ghost" id="back">Back to Arcade</button></div></div>`;
        $('#again').onclick = () => playGame(g); $('#back').onclick = () => route('arcade');
      },
    };
    stopGame = g.start(area, api);
    $('#exit').onclick = () => route('arcade');
    cleanup = () => { clearInterval(tick); if (!done && stopGame) stopGame(); done = true; Store.save(); };
    Net.updatePresence('In the Arcade');
  }

  // =====================================================================
  // CHESS
  // =====================================================================
  let CH = null, chessLevel = 3, chessColor = 'w';
  const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
  const sqName = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
  function newChess() {
    const st = Chess.newGame();
    CH = { st, level: chessLevel, color: chessColor, hist: [], moves: [], over: null, sel: null, hint: null, hintUsed: false, reps: { [Chess.key(st)]: 1 }, last: null, thinking: false, paid: false };
    if (chessColor === 'b') botMove();
  }
  function viewChess() {
    if (!CH) newChess();
    renderChess();
    cleanup = () => {};
  }
  function renderChess() {
    const L = CHESS[CH.level];
    const legal = CH.sel !== null ? Chess.legal(CH.st).filter(m => m.from === CH.sel) : [];
    const chk = Chess.inCheck(CH.st) ? CH.st.b.indexOf(CH.st.turn === 'w' ? 'K' : 'k') : -1;
    let cells = '';
    for (let rr = 0; rr < 8; rr++) for (let ff = 0; ff < 8; ff++) {
      const r = CH.color === 'w' ? rr : 7 - rr, f = CH.color === 'w' ? ff : 7 - ff, i = r * 8 + f, p = CH.st.b[i];
      const cls = ['sq', (r + f) % 2 ? 'd' : 'l'];
      if (CH.sel === i) cls.push('sel');
      if (CH.last && (CH.last.from === i || CH.last.to === i)) cls.push('last');
      if (chk === i) cls.push('chk');
      if (CH.hint && (CH.hint.from === i || CH.hint.to === i)) cls.push('hint');
      const tgt = legal.find(m => m.to === i);
      cells += `<button class="${cls.join(' ')}" data-sq="${i}">${ff === 0 ? `<span class="coord">${8 - r}</span>` : ''}${rr === 7 ? `<span class="coord" style="left:auto;right:3px;top:auto;bottom:2px">${'abcdefgh'[f]}</span>` : ''}${tgt ? (p !== '.' ? '<span class="cap"></span>' : '<span class="dot"></span>') : ''}${p !== '.' ? `<span class="pc ${Chess.colorOf(p)}">${GLYPH[p.toUpperCase()]}︎</span>` : ''}</button>`;
    }
    const status = CH.over ? CH.over.text : CH.thinking ? `🤔 ${L[0]} bot is thinking…` : (CH.st.turn === CH.color ? 'Your move' : 'Bot to move') + (chk >= 0 ? ' — check!' : '');
    $('#view').innerHTML = `
      <div class="chesswrap">
        <div><div class="board" id="board">${cells}</div></div>
        <div class="grid" style="gap:12px">
          <div class="card"><h2 style="margin-bottom:6px">♞ Chess vs ${L[0]} bot</h2><div class="muted small">${L[1]} · Win 🪙 ${fmt(L[2])} · Draw <b style="color:#d63e55">−${fmt(DRAW_PENALTY)} 🪙</b>${CH.hintUsed ? ' · hint used: half tokens' : ''}</div>
            <div class="big" style="font-size:20px;margin-top:10px">${esc(status)}</div>
            ${S.day.quizzes ? '' : '<div class="small" style="margin-top:6px;color:#d63e55;font-weight:800">Finish a quiz today to earn chess tokens.</div>'}
          </div>
          <div class="card"><div class="row">
            <button class="btn sm yellow" id="hint" ${CH.over || CH.st.turn !== CH.color ? 'disabled' : ''}>💡 Hint (${HINT_COST} 🪙)</button>
            <button class="btn sm ghost" id="undo" ${CH.level > 2 || CH.over || CH.thinking || CH.hist.length < 2 ? 'disabled' : ''}>↩ Undo</button>
            <button class="btn sm red" id="resign" ${CH.over ? 'disabled' : ''}>🏳 Resign</button></div></div>
          <div class="card"><h3>New game</h3>
            <div class="row" style="margin-bottom:10px">${[1, 2, 3, 4, 5].map(l => `<button class="chip ${chessLevel === l ? 'on' : ''}" data-cl="${l}">${l}. ${CHESS[l][0]}</button>`).join('')}</div>
            <div class="row"><button class="chip ${chessColor === 'w' ? 'on' : ''}" data-cc="w">Play white</button><button class="chip ${chessColor === 'b' ? 'on' : ''}" data-cc="b">Play black</button><button class="btn sm green" id="newg">Start ▶</button></div>
            <div class="muted small" style="margin-top:8px">Undo works on levels 1 and 2 only.</div></div>
          <div class="card"><h3>Moves</h3><div class="movelist">${CH.moves.length ? CH.moves.map((m, k) => k % 2 === 0 ? `${k / 2 + 1}. ${m}` : ` ${m}<br>`).join('') : '<span class="muted">No moves yet</span>'}</div></div>
        </div>
      </div>`;
    $$('#board .sq').forEach(b => b.onclick = () => clickSq(+b.dataset.sq));
    $('#hint').onclick = () => { if (!spend(HINT_COST)) return; CH.hintUsed = true; CH.hint = Chess.bestMove(CH.st, 4); renderChess(); };
    $('#undo').onclick = () => { if (CH.hist.length < 2) return; for (let k = 0; k < 2; k++) { const h = CH.hist.pop(); CH.st = h.st; CH.moves.pop(); CH.reps = h.reps; CH.last = h.last; } CH.sel = null; CH.hint = null; renderChess(); };
    $('#resign').onclick = () => endChess('loss', 'You resigned.');
    $$('[data-cl]').forEach(b => b.onclick = () => { chessLevel = +b.dataset.cl; renderChess(); });
    $$('[data-cc]').forEach(b => b.onclick = () => { chessColor = b.dataset.cc; renderChess(); });
    $('#newg').onclick = () => { newChess(); renderChess(); };
    Net.updatePresence('Playing chess');
  }
  function clickSq(i) {
    if (CH.over || CH.thinking || CH.st.turn !== CH.color) return;
    const p = CH.st.b[i];
    if (CH.sel !== null) {
      const ms = Chess.legal(CH.st).filter(m => m.from === CH.sel && m.to === i);
      if (ms.length) {
        if (ms.length > 1) { // promotion
          const m = modal(`<h2>Promote to…</h2><div class="row">${[...'QRBN'].map(c => `<button class="btn ghost" style="font-size:34px" data-pr="${c}">${GLYPH[c]}︎</button>`).join('')}</div>`);
          $$('[data-pr]', m).forEach(b => b.onclick = () => { m.remove(); doMove(ms.find(x => x.promo === b.dataset.pr)); });
          return;
        }
        return doMove(ms[0]);
      }
    }
    CH.sel = (p !== '.' && Chess.colorOf(p) === CH.color) ? i : null; renderChess();
  }
  function moveText(m) { const t = m.piece.toUpperCase(); if (m.castle) return 'Kk'.includes(m.castle) ? 'O-O' : 'O-O-O'; return `${t === 'P' ? '' : t}${sqName(m.from)}${m.cap !== '.' ? 'x' : '-'}${sqName(m.to)}${m.promo ? '=' + m.promo : ''}`; }
  function doMove(m) {
    CH.hist.push({ st: CH.st, reps: Object.assign({}, CH.reps), last: CH.last });
    CH.st = Chess.make(CH.st, m); CH.last = m; CH.sel = null; CH.hint = null;
    CH.moves.push(moveText(m) + (Chess.inCheck(CH.st) ? '+' : ''));
    const k = Chess.key(CH.st); CH.reps[k] = (CH.reps[k] || 0) + 1;
    if (checkOver()) { if (cur === 'chess') renderChess(); return; }
    if (cur === 'chess') renderChess();
    if (CH.st.turn !== CH.color) botMove();
  }
  function checkOver() {
    const ms = Chess.legal(CH.st);
    if (!ms.length) { if (Chess.inCheck(CH.st)) endChess(CH.st.turn === CH.color ? 'loss' : 'win', CH.st.turn === CH.color ? 'Checkmate — the bot wins.' : 'Checkmate — you win! 🏆'); else endChess('draw', 'Stalemate — draw.'); return true; }
    if (CH.st.half >= 100) { endChess('draw', 'Draw by the 50-move rule.'); return true; }
    if (CH.reps[Chess.key(CH.st)] >= 3) { endChess('draw', 'Draw by repetition.'); return true; }
    if (Chess.insufficient(CH.st.b)) { endChess('draw', 'Draw — not enough pieces to checkmate.'); return true; }
    return false;
  }
  function botMove() {
    CH.thinking = true; const game = CH;
    setTimeout(() => {
      if (CH !== game || CH.over) return;
      const m = Chess.bestMove(CH.st, CH.level); CH.thinking = false;
      if (m) doMove(m); else checkOver();
      if (cur === 'chess') renderChess();
    }, 350);
    if (cur === 'chess' && $('#board')) renderChess();
  }
  function endChess(result, text) {
    if (CH.over) return;
    CH.thinking = false; CH.over = { result, text };
    S.stats[result === 'win' ? 'cw' : result === 'loss' ? 'cl' : 'cd']++;
    const L = CHESS[CH.level]; let t = result === 'win' ? L[2] : result === 'draw' ? -DRAW_PENALTY : 0;
    if (t > 0 && CH.hintUsed) t = Math.round(t / 2);
    if (t > 0 && !S.day.quizzes) { toast('Finish a quiz today to earn chess tokens!', 'bad'); t = 0; }
    Store.save();
    if (t) addTokens(t, t < 0 ? `Draw penalty vs ${L[0]}` : `Chess win vs ${L[0]}`);
    else if (result === 'win') toast('🏆 You won!', 'good');
    if (cur === 'chess') renderChess();
  }

  // =====================================================================
  // FRIENDS + NETWORK
  // =====================================================================
  const Net = {
    room: null, bossSent: {}, cid: Math.random().toString(36).slice(2, 10), peers: [], selected: null, status: 'Online', lastFrom: {},
    async init() {
      try {
        if (!window.claude || !claude.use) return;
        const room = await claude.use('room'); if (!room) return;
        this.room = room;
        room.onPeers(list => {
          const arr = Array.isArray(list) ? list : Object.values(list || {});
          this.peers = arr.map(p => { const d = (p && (p.presence || p.state || p.data)) || p || {}; return { cid: d.cid, name: d.name, avatar: d.avatar, status: d.status }; })
            .filter(p => p.cid && p.cid !== this.cid && typeof p.name === 'string').map(p => ({ cid: String(p.cid).slice(0, 20), name: p.name.slice(0, 24), avatar: String(p.avatar || '🙂').slice(0, 4), status: String(p.status || 'Online').slice(0, 30) }));
          if (cur === 'friends') renderFriendList();
        });
        const unwrap = x => (x && x.to) ? x : (x && x.data && x.data.to) ? x.data : (x && x.payload) || x;
        room.on('sab', x => { const d = unwrap(x); if (!d || d.to !== this.cid || !SABS[d.type]) return; this.receiveSab(d); });
        room.on('msg', x => { const d = unwrap(x); if (!d || d.to !== this.cid) return; this.receiveMsg(d); });
        room.on('ack', x => { const d = unwrap(x); if (!d || d.to !== this.cid) return;
          if (d.loot) { const t = this.bossSent[d.from]; if (t && Date.now() - t < 1800000) { delete this.bossSent[d.from]; addTokens(Math.max(0, Math.min(10000, Math.floor(+d.loot) || 0)), `👾 Loot from ${esc(String(d.name).slice(0, 24))} — the Calculator King won!`); } return; }
          toast(d.blocked ? `🛡️ ${esc(String(d.name).slice(0, 24))} blocked your ${esc(SABS[d.type] ? SABS[d.type].name : 'sabotage')} with a shield!` : `😈 Your ${esc(SABS[d.type] ? SABS[d.type].name : 'sabotage')} landed on ${esc(String(d.name).slice(0, 24))}!`, d.blocked ? 'bad' : 'good'); });
        this.updatePresence();
        if (cur === 'friends') viewFriends();
      } catch (e) { this.room = null; }
    },
    updatePresence(status) {
      this.status = status || (QZ ? 'Studying 📚' : cur === 'arcade' ? 'In the Arcade' : cur === 'chess' ? 'Playing chess' : 'Online');
      if (!this.room) return;
      try { this.room.presence({ cid: this.cid, name: S.name || 'Player', avatar: S.avatar, status: this.status }); } catch (e) {}
    },
    send(topic, data) { if (!this.room) return false; try { this.room.emit(topic, data); return true; } catch (e) { toast("Couldn't reach your friend — try again.", 'bad'); return false; } },
    receiveSab(d) {
      const now = Date.now(); if (this.lastFrom[d.from] && now - this.lastFrom[d.from] < 3000) return; this.lastFrom[d.from] = now;
      const from = String(d.fromName || 'A friend').slice(0, 24);
      if (S.shields > 0) { S.shields--; Store.save(); toast(`🛡️ Your shield blocked ${esc(from)}'s ${SABS[d.type].name}! (${S.shields} left)`, 'good'); this.send('ack', { to: d.from, blocked: true, type: d.type, name: S.name || 'Player' }); return; }
      this.send('ack', { to: d.from, blocked: false, type: d.type, name: S.name || 'Player' });
      Sab.incoming(d.type, from, d.from);
    },
    receiveMsg(d) {
      const from = esc(String(d.fromName || 'A friend').slice(0, 24));
      if (d.sticker && STICKERS.includes(d.sticker)) { const s = document.createElement('div'); s.className = 'sticker'; s.textContent = d.sticker; document.body.appendChild(s); setTimeout(() => s.remove(), 2300); toast(`${from} sent you a sticker ${d.sticker}`, 'msg'); }
      else if (MSGS.includes(d.text)) toast(`💬 <b>${from}</b>: ${esc(d.text)}`, 'msg');
    },
  };
  function viewFriends() {
    $('#view').innerHTML = `
      <div class="grid g2" style="margin-bottom:14px">
        <div class="card"><h2>👥 Friends</h2>
          <div class="row" style="margin-bottom:10px"><input class="text" id="nm" maxlength="20" value="${esc(S.name)}" placeholder="Your display name"><button class="btn sm" id="saveNm">Save name</button></div>
          ${Net.room ? `<p class="muted small" style="margin:0">Friends who have this page open right now show up below. Share the page from claude.ai to invite them.</p>` :
            `<p class="muted small" style="margin:0">Live friends aren't connected in this view. Open the page from its claude.ai link; friends you share it with appear here while they have it open.</p>`}
          <div id="flist" class="grid" style="margin-top:12px"></div>
        </div>
        <div class="card"><h3>🛡️ Your defences</h3><p class="muted small" style="margin:0 0 10px">You have <b>${S.shields}</b> shield${S.shields === 1 ? '' : 's'}. Each one blocks one sabotage from a friend.</p>
          <button class="btn sm yellow" id="buyShield">Buy shield (${SHIELD_COST} 🪙)</button>
          <h3 style="margin-top:16px">🤖 Bot rivals</h3><label class="switch"><input type="checkbox" id="bots" ${S.botRivals ? 'checked' : ''}> RoboRival sometimes sabotages your quizzes</label>
        </div>
      </div>
      <div class="card" id="targetCard"></div>`;
    $('#saveNm').onclick = () => { S.name = $('#nm').value.trim().slice(0, 20); Store.save(); renderHud(); Net.updatePresence(); toast('Name saved', 'good'); };
    $('#buyShield').onclick = () => { if (spend(SHIELD_COST)) { S.shields++; Store.save(); viewFriends(); toast('🛡️ Shield bought', 'good'); } };
    $('#bots').onchange = e => { S.botRivals = e.target.checked; Store.save(); };
    renderFriendList();
    Bot.run(); cleanup = () => Bot.stop();
  }
  function renderFriendList() {
    const fl = $('#flist'); if (!fl) return;
    if (Net.selected && Net.selected !== 'bot' && !Net.peers.find(p => p.cid === Net.selected)) Net.selected = null;
    const everyone = [BOT_PEER, ...Net.peers];
    if (!Net.selected) Net.selected = 'bot';
    fl.innerHTML = everyone.map(p => `<button class="friend ${Net.selected === p.cid ? 'on' : ''}" data-f="${esc(p.cid)}"><span class="av">${esc(p.avatar)}</span><span style="flex:1">${esc(p.name)}</span><span class="status ${/Stud/.test(p.status) ? '' : 'idle'}">${esc(p.status)}</span></button>`).join('') + (Net.peers.length ? '' : `<div class="muted small">${Net.room ? 'No real friends online yet — practise on RoboRival!' : ''}</div>`);
    $$('[data-f]', fl).forEach(b => b.onclick = () => { Net.selected = b.dataset.f; renderFriendList(); });
    renderTarget();
  }
  function renderTarget() {
    const tc = $('#targetCard'); if (!tc) return;
    const f = Net.selected === 'bot' ? BOT_PEER : Net.peers.find(p => p.cid === Net.selected);
    const isBot = f && f.cid === 'bot';
    tc.innerHTML = `${isBot ? '<div id="botArena" style="margin-bottom:16px"></div>' : ''}
      <h2>${f ? `Target: ${esc(f.avatar)} ${esc(f.name)}` : 'Sabotages'}</h2>
      <p class="muted small" style="margin:0 0 12px">${isBot ? 'RoboRival is doing a quiz right now. Sabotage it to slow it down and make it get answers wrong. Careful — it sometimes takes revenge!' : f ? (/Stud/.test(f.status) ? 'They are in a quiz right now — it hits immediately!' : 'They are not in a quiz. It will hit in their next quiz (within 10 minutes).') : 'Pick a friend above to send one. Tap "Try on me" to see what each does — free.'}</p>
      <div class="grid g3">${Object.entries(SABS).map(([k, s]) => `<div class="sabbtn"><span class="e">${s.e}</span><b>${s.name}</b><span class="small muted">${s.desc}</span><span class="cost">🪙 ${fmt(s.cost)}</span>
        <div class="row">${f ? `<button class="btn sm" data-send="${k}">Send</button>` : ''}<button class="btn sm ghost" data-try="${k}">Try on me</button></div></div>`).join('')}</div>
      ${f ? `<h3 style="margin-top:18px">💬 Messages <span class="cost">🪙 ${MSG_COST}</span></h3><div class="row">${MSGS.map((m, i) => `<button class="chip" data-msg="${i}">${esc(m)}</button>`).join('')}</div>
      <h3 style="margin-top:14px">✨ Stickers <span class="cost">🪙 ${STICKER_COST}</span></h3><div class="row">${STICKERS.map(s => `<button class="chip" style="font-size:24px" data-st="${s}">${s}</button>`).join('')}</div>` : ''}`;
    $$('[data-try]', tc).forEach(b => b.onclick = () => tryOnMe(b.dataset.try));
    if (!f) return;
    if (isBot) {
      Bot.draw();
      $$('[data-send]', tc).forEach(b => b.onclick = () => { const k = b.dataset.send; if (!spend(SABS[k].cost)) return; Bot.hit(k); });
      $$('[data-msg]', tc).forEach(b => b.onclick = () => { if (!spend(MSG_COST)) return; Bot.say(pick(['Beep boop. Whatever 🙄', 'My circuits are unbothered 😎', 'Focus, human! 🤖', 'GG… for now 🤝'])); });
      $$('[data-st]', tc).forEach(b => b.onclick = () => { if (!spend(STICKER_COST)) return; Bot.say(`${b.dataset.st}?! Rude.`); });
      return;
    }
    $$('[data-send]', tc).forEach(b => b.onclick = () => { const k = b.dataset.send; if (!spend(SABS[k].cost)) return; if (Net.send('sab', { to: f.cid, from: Net.cid, fromName: S.name || 'Player', type: k })) { if (k === 'boss') Net.bossSent[f.cid] = Date.now(); toast(`${SABS[k].e} ${SABS[k].name} sent to ${esc(f.name)}!`, 'good'); } else addTokens(SABS[k].cost); });
    $$('[data-msg]', tc).forEach(b => b.onclick = () => { if (!spend(MSG_COST)) return; if (Net.send('msg', { to: f.cid, fromName: S.name || 'Player', text: MSGS[+b.dataset.msg] })) toast('💬 Message sent', 'good'); else addTokens(MSG_COST); });
    $$('[data-st]', tc).forEach(b => b.onclick = () => { if (!spend(STICKER_COST)) return; if (Net.send('msg', { to: f.cid, fromName: S.name || 'Player', sticker: b.dataset.st })) toast(`${b.dataset.st} Sticker sent`, 'good'); else addTokens(STICKER_COST); });
  }
  function tryOnMe(type) {
    // a free demo quiz question with the effect applied
    QZ = { review: false, level: S.level, topic: 'Demo', diff: 0, timed: false, qs: [Object.assign(Quiz.make(S.level, 'Mixed', 0), { text: '' })], i: 0, log: [], paused: 0, timeLeft: 1e9, shuffleLeft: 0, glitchLeft: 0, demo: true };
    const q = QZ.qs[0]; Object.assign(q, Quiz.make(S.level, 'Mixed', 0));
    locked = true; renderTabs();
    $('#view').innerHTML = `<div class="qwrap"><div class="row" style="justify-content:space-between;margin-bottom:10px"><b class="big" style="font-size:20px">Preview: ${SABS[type].e} ${SABS[type].name}</b><button class="btn sm" id="doneDemo">Done</button></div>
      <div class="card" id="qcard"><div class="qmeta"><span class="tag">Demo — no tokens</span></div><div class="qtext">${q.text}</div></div><div class="card" id="answerArea" style="margin-top:12px">${answerUI(q, false)}</div></div>`;
    bindAnswerDemo(q);
    setTimeout(() => Sab.apply(type, 'You (preview)'), 300);
    $('#doneDemo').onclick = () => { QZ = null; locked = false; document.body.classList.remove('glitch'); Sab.closeBoss(); route('friends', true); };
  }
  function bindAnswerDemo(q) {
    const go = v => { const ok = Quiz.check(q, v); toast(ok ? '✅ Correct!' : `❌ Answer: ${esc(Quiz.answerText(q))}`, ok ? 'good' : 'bad'); };
    if (q.choices) { $$('.choice').forEach(b => b.onclick = () => go(b.dataset.c)); return; }
    const inp = $('#ans'); $('#sub').onclick = () => go(inp.value); inp.onkeydown = e => { if (e.key === 'Enter') go(inp.value); };
    $$('.key').forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === '⌫') inp.value = inp.value.slice(0, -1); else inp.value += k === '−' ? '-' : k; });
  }


  // =====================================================================
  // ROBORIVAL — a practice bot you can sabotage
  // =====================================================================
  const BOT_PEER = { cid: 'bot', name: 'RoboRival (bot)', avatar: '🤖', status: 'Studying 📚' };
  const Bot = {
    q: null, i: 0, score: 0, next: 0, fx: {}, wrongLeft: 0, glitchLeft: 0, frozenUntil: 0, bubble: '', bubbleUntil: 0, timer: null, done: false, total: 0,
    newQ() { this.q = Quiz.make(S.level, 'Mixed', 1); this.fx = {}; this.qStart = Date.now(); this.total = 3500 + Math.random() * 3000; this.next = this.qStart + this.total; },
    start() { this.i = 0; this.score = 0; this.done = false; this.wrongLeft = 0; this.glitchLeft = 0; this.newQ(); },
    run() { if (!this.q) this.start(); clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 250); },
    stop() { clearInterval(this.timer); this.timer = null; },
    say(t) { this.bubble = t; this.bubbleUntil = Date.now() + 2500; this.draw(); },
    tick() {
      if (!$('#botArena')) return;
      const now = Date.now();
      if (!this.done && now >= this.next) {
        let pWrong = 0.15 + (this.fx.ink ? 0.2 : 0) + (this.fx.flip ? 0.2 : 0) + (this.fx.fog ? 0.2 : 0) + (this.wrongLeft > 0 ? 0.45 : 0) + (this.glitchLeft > 0 ? 0.15 : 0);
        const ok = Math.random() > pWrong; if (ok) this.score++;
        this.say(ok ? '✅ Easy!' : pick(['❌ Argh, wrong!', '❌ That was YOUR fault!', '❌ Error 404: answer not found']));
        if (this.wrongLeft > 0) this.wrongLeft--; if (this.glitchLeft > 0) this.glitchLeft--;
        this.i++;
        if (this.i >= 10) { this.done = true; this.say(`I scored ${this.score}/10 ${this.score <= 5 ? '😭 You did this!' : '😎'}`); setTimeout(() => { if (this.timer) { this.start(); this.draw(); } }, 5000); }
        else this.newQ();
      }
      this.draw();
    },
    hit(type) {
      if (this.done) { this.start(); }
      const s = SABS[type], now = Date.now();
      toast(`${s.e} ${s.name} hit RoboRival!`, 'good');
      if (type === 'ink') { this.fx.ink = true; this.next += 2500; }
      if (type === 'flip') { this.fx.flip = true; this.next += 2000; }
      if (type === 'fog') { this.fx.fog = true; this.next += 2500; }
      if (type === 'freeze') { this.frozenUntil = now + 3000; this.next += 3000; }
      if (type === 'shuffle') this.wrongLeft = 3;
      if (type === 'glitch') this.glitchLeft = 3;
      if (type === 'boss') { this.fx.boss = true; this.next += 30000; this.wrongLeft = Math.max(this.wrongLeft, 1); }
      this.total = this.next - this.qStart;
      this.say(pick(['Hey! 😠', 'NOOO my circuits! 🤯', 'You will pay for this 😤', 'Not cool, human 😾', 'Rebooting… 🔄']));
      if (S.botRivals && Math.random() < 0.25) setTimeout(() => { toast('🤖 RoboRival is taking revenge…', 'bad'); Sab.incoming(pick(['ink', 'flip', 'fog', 'shuffle']), 'RoboRival 🤖'); }, 2500);
    },
    draw() {
      const el = $('#botArena'); if (!el || !this.q) return;
      const now = Date.now(), frozen = now < this.frozenUntil, left = Math.max(0, this.next - now);
      const pct = this.done ? 100 : Math.max(0, Math.min(100, 100 - 100 * left / (this.total || 1)));
      const glitch = this.glitchLeft > 0;
      const splats = this.fx.ink ? [[8, 10, '#ff5d73'], [55, 20, '#3aa0ff'], [30, 45, '#ffc93c'], [70, 55, '#20bf8a']].map(([x, y, c]) => `<span style="position:absolute;left:${x}%;top:${y}%;width:70px;height:60px;border-radius:50%;background:${c};opacity:.92"></span>`).join('') : '';
      el.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:8px"><b class="big" style="font-size:18px">🤖 RoboRival's quiz</b><span class="tag">Q ${Math.min(this.i + 1, 10)}/10 · Score ${this.score}</span></div>
        <div style="position:relative">
          <div style="position:relative;overflow:hidden;border-radius:16px;padding:14px;min-height:110px;border:2px solid var(--line);background:${glitch ? '#ffe0f1' : '#faf8ff'};${glitch ? 'font-family:\'Comic Sans MS\',cursive;color:#7a0046;' : ''}transition:transform .5s;${this.fx.flip ? 'transform:rotate(180deg);' : ''}${this.fx.fog ? 'filter:blur(6px);' : ''}">
            <div style="font-weight:700">${this.done ? 'Quiz finished — starting a new one soon…' : this.q.text}</div>${splats}
          </div>
          ${frozen ? '<div class="ice" style="inset:0">🧊 Frozen!</div>' : ''}
          ${this.fx.boss && !this.done ? '<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(20,13,51,.75);border-radius:16px;color:#fff;font-weight:800;font-size:18px">👾 Fighting the Calculator King…</div>' : ''}
          ${now < this.bubbleUntil ? `<div style="position:absolute;right:8px;top:-14px;background:var(--ink);color:#fff;padding:6px 12px;border-radius:14px;font-weight:800;font-size:14px;z-index:8">${esc(this.bubble)}</div>` : ''}
        </div>
        <div class="bar" style="margin-top:10px"><i style="width:${pct}%;background:linear-gradient(90deg,#ff9a3c,#ff5d73)"></i></div>
        <div class="muted small" style="margin-top:6px">${this.wrongLeft > 0 ? `🔀 Confused for ${this.wrongLeft} more answer${this.wrongLeft === 1 ? '' : 's'} · ` : ''}${glitch ? '💖 Glitched · ' : ''}Thinking…</div>`;
    },
  };

  // =====================================================================
  // SHOP
  // =====================================================================
  function viewShop() {
    $('#view').innerHTML = `
      <div class="card" style="margin-bottom:14px"><h2>🛍️ Shop</h2><p class="muted" style="margin:0">You have 🪙 <b>${fmt(S.tokens)}</b>. Tokens have no money value and can't be bought.</p></div>
      <div class="grid g2">
        <div class="card"><h3>Avatars</h3><div class="grid g3">${AVATARS.map(([a, c]) => { const own = S.owned.includes(a); return `<button class="sabbtn" data-av="${a}" style="align-items:center;text-align:center;${S.avatar === a ? 'border-color:#6c4cf5' : ''}"><span style="font-size:40px">${a}</span><b>${S.avatar === a ? 'Equipped' : own ? 'Equip' : `🪙 ${fmt(c)}`}</b></button>`; }).join('')}</div></div>
        <div class="card"><h3>Power-ups</h3>
          <div class="sabbtn" style="margin-bottom:10px"><span class="e">🥧</span><b>Pie</b><span class="small muted">Heals 40 HP in a boss fight. You have ${(S.items || {}).pie || 0}.</span><button class="btn sm green" data-buy="pie" style="align-self:flex-start">Buy for 500 🪙</button></div>
          <div class="sabbtn" style="margin-bottom:10px"><span class="e">🧪</span><b>Potion</b><span class="small muted">Full HP in a boss fight. You have ${(S.items || {}).potion || 0}.</span><button class="btn sm green" data-buy="potion" style="align-self:flex-start">Buy for 1,500 🪙</button></div>
          <div class="sabbtn" style="margin-bottom:10px"><span class="e">⚡</span><b>Power Pencil</b><span class="small muted">×1.5 damage for 3 attacks in a boss fight. You have ${(S.items || {}).pencil || 0}.</span><button class="btn sm red" data-buy="pencil" style="align-self:flex-start">Buy for 800 🪙</button></div>
          <div class="sabbtn" style="margin-bottom:10px"><span class="e">🔥</span><b>Fire Ruler</b><span class="small muted">Your next attack deals ×2.5 damage. You have ${(S.items || {}).ruler || 0}.</span><button class="btn sm red" data-buy="ruler" style="align-self:flex-start">Buy for 1,200 🪙</button></div>
          <div class="sabbtn" style="margin-bottom:10px"><span class="e">📐</span><b>Sharp Compass</b><span class="small muted">+12 damage on every attack for the rest of the fight. You have ${(S.items || {}).compass || 0}.</span><button class="btn sm red" data-buy="compass" style="align-self:flex-start">Buy for 1,500 🪙</button></div>
          <div class="sabbtn" style="margin-bottom:10px"><span class="e">🛡️</span><b>Shield</b><span class="small muted">Blocks one sabotage from a friend. You have ${S.shields}.</span><button class="btn sm yellow" id="sh" style="align-self:flex-start">Buy for ${SHIELD_COST} 🪙</button></div>
          <div class="sabbtn"><span class="e">📊</span><b>Your stats</b><span class="small">Quizzes: ${S.stats.quizzes} · Accuracy: ${S.stats.total ? Math.round(100 * S.stats.correct / S.stats.total) : 0}%<br>Chess: ${S.stats.cw} W / ${S.stats.cd} D / ${S.stats.cl} L</span></div>
        </div>
      </div>`;
    $$('[data-av]').forEach(b => b.onclick = () => {
      const a = b.dataset.av, c = AVATARS.find(x => x[0] === a)[1];
      if (!S.owned.includes(a)) { if (!spend(c)) return; S.owned.push(a); toast(`New avatar ${a}!`, 'good'); }
      S.avatar = a; Store.save(); renderHud(); Net.updatePresence(); viewShop();
    });
    $('#sh').onclick = () => { if (spend(SHIELD_COST)) { S.shields++; Store.save(); viewShop(); toast('🛡️ Shield bought', 'good'); } };
    $$('[data-buy]').forEach(b => b.onclick = () => { const k = b.dataset.buy, c = { pie: 500, potion: 1500, pencil: 800, ruler: 1200, compass: 1500 }[k], nm = { pie: '🥧 Pie', potion: '🧪 Potion', pencil: '⚡ Power Pencil', ruler: '🔥 Fire Ruler', compass: '📐 Sharp Compass' }[k]; if (!spend(c)) return; S.items = S.items || {}; S.items[k] = (S.items[k] || 0) + 1; Store.save(); viewShop(); toast(`${nm} bought`, 'good'); });
  }

  // ---------- boot ----------
  Store.load();
  if (!S.name) S.name = '';
  renderHud(); route('study');
  if (Store.gift) { Store.save(); setTimeout(() => toast(Store.gift === 100000 ? '🎁 Welcome gift: 100,000 starter tokens!' : '🎁 Starter tokens topped up: +90,000 (100,000 total)!', 'good'), 400); }
  setInterval(() => { Store.fixDay(); }, 60000);
  Net.init(); Store.connect();
})();
