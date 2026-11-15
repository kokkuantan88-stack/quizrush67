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
    boss: { name: 'Boss Fight', e: '👾', cost: 7000, desc: 'Turn-based fight vs the Calculator King, up to 15 min. If they lose all HP, you get 10,000 of their tokens' },
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
    fixDay() { if (S.day.date !== today()) S.day = { date: today(), easy: 0, quizzes: 0 }; },
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
      const MAX_HP = 100, BOSS_HP = 400, LIMIT = 15 * 60000, DODGE_MS = 9000;
      const F = { hp: MAX_HP, bhp: BOSS_HP, turn: 0, phase: 'menu', defend: false, t0: Date.now(), apples: 2, msg: `${esc(from)} summoned the Calculator King! Defeat it, or survive 15 minutes.`, over: false };
      const m = modal(`
        <div class="row" style="justify-content:space-between;margin-bottom:6px"><h2 style="margin:0">👾 The Calculator King</h2><span class="pill" style="background:#efeafe;color:#6c4cf5">⏳ <b id="bTime">15:00</b></span></div>
        <div class="small" style="font-weight:800">Boss HP <span id="bHpT"></span></div><div class="bar" style="height:12px;margin:2px 0 8px"><i id="bHp" style="background:linear-gradient(90deg,#ff5d73,#ff9a3c)"></i></div>
        <canvas id="bc" width="480" height="300" style="display:block;margin:0 auto;background:#140d33;width:100%"></canvas>
        <div class="small" style="font-weight:800;margin-top:8px">Your HP <span id="pHpT"></span>${F.defend ? '' : ''}</div><div class="bar" style="height:12px;margin:2px 0 8px"><i id="pHp" style="background:linear-gradient(90deg,#20bf8a,#3aa0ff)"></i></div>
        <div id="bMsg" class="small" style="min-height:20px;font-weight:700;margin-bottom:8px"></div>
        <div id="bPanel"></div>
        ${demo ? '<div style="text-align:right;margin-top:8px"><button class="btn sm ghost" id="bEnd">End preview</button></div>' : `<div class="muted small" style="margin-top:8px">Lose all your HP and ${fmt(10000)} of your tokens go to ${esc(from)}.</div>`}`);
      m.querySelector('.card').style.maxWidth = '640px';
      const cv = $('#bc', m), cx = cv.getContext('2d');
      const P = { x: 240, y: 240 }; let shots = [], inv = 0, raf = null, dodgeEnd = 0, spawnT = 0, keys = {}, last = 0, clockT = null;
      const ARENA = { x0: 40, x1: 440, y0: 150, y1: 290 };
      const toCanvas = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * 480 / r.width, y: (e.clientY - r.top) * 300 / r.height }; };
      const clamp = () => { P.x = Math.max(ARENA.x0 + 8, Math.min(ARENA.x1 - 8, P.x)); P.y = Math.max(ARENA.y0 + 8, Math.min(ARENA.y1 - 8, P.y)); };
      const onPtr = e => { if (F.phase !== 'dodge') return; const p = toCanvas(e); P.x = p.x; P.y = p.y; clamp(); };
      cv.addEventListener('pointermove', onPtr); cv.addEventListener('pointerdown', onPtr);
      const KEYMAP = { ArrowLeft: 'L', ArrowRight: 'R', ArrowUp: 'U', ArrowDown: 'D', a: 'L', d: 'R', w: 'U', s: 'D', A: 'L', D: 'R', W: 'U', S: 'D' };
      const kd = e => { const k = KEYMAP[e.key]; if (F.phase === 'dodge' && k) { keys[k] = true; e.preventDefault(); } }, ku = e => { const k = KEYMAP[e.key]; if (k) keys[k] = false; };
      document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
      const SYM = ['÷', '×', '+', '−', '%', '=', '√', 'π'];
      const star = (x, y, r) => { cx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; cx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } cx.closePath(); cx.fill(); };
      const drawBoss = (x, t, hurt) => {
        cx.save(); cx.translate(x, 70 + Math.sin(t / 300) * 5); if (hurt) cx.translate((Math.random() - 0.5) * 8, 0);
        cx.fillStyle = '#ffc93c'; cx.beginPath(); cx.moveTo(-34, -52); cx.lineTo(-22, -70); cx.lineTo(-8, -56); cx.lineTo(0, -76); cx.lineTo(8, -56); cx.lineTo(22, -70); cx.lineTo(34, -52); cx.closePath(); cx.fill();
        cx.fillStyle = hurt ? '#ff5d73' : '#6c4cf5'; cx.beginPath(); cx.roundRect(-60, -52, 120, 104, 16); cx.fill();
        cx.fillStyle = '#9ff0c8'; cx.beginPath(); cx.roundRect(-46, -40, 92, 40, 8); cx.fill();
        cx.strokeStyle = '#140d33'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(-30, -30); cx.lineTo(-12, -22); cx.moveTo(30, -30); cx.lineTo(12, -22); cx.stroke();
        cx.fillStyle = '#140d33'; cx.beginPath(); cx.arc(-18, -13, 4, 0, 7); cx.arc(18, -13, 4, 0, 7); cx.fill();
        for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { cx.fillStyle = c === 3 ? '#ff5d73' : '#efe9ff'; cx.beginPath(); cx.roundRect(-44 + c * 23, 10 + r * 19, 18, 14, 4); cx.fill(); }
        cx.restore();
      };
      let hurtUntil = 0, hurtFlash = 0, bx = 240;
      const render = now => {
        cx.fillStyle = '#140d33'; cx.fillRect(0, 0, 480, 300);
        drawBoss(bx, now, now < hurtUntil);
        cx.strokeStyle = F.phase === 'dodge' ? '#ffffff' : 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.strokeRect(ARENA.x0, ARENA.y0, ARENA.x1 - ARENA.x0, ARENA.y1 - ARENA.y0);
        cx.font = 'bold 22px Fredoka, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        shots.forEach(s => { cx.fillStyle = s.c || '#ff5d73'; cx.fillText(s.s, s.x, s.y); });
        if (F.phase === 'dodge') { cx.fillStyle = now < hurtFlash ? '#ff5d73' : (F.defend ? '#3aa0ff' : '#ffc93c'); star(P.x, P.y, 11); cx.fillStyle = '#fff'; cx.font = 'bold 13px Nunito, sans-serif'; cx.fillText(`Dodge! ${Math.max(0, Math.ceil((dodgeEnd - now) / 1000))}s`, 240, ARENA.y0 - 10); }
      };
      const ui = () => {
        $('#bHp', m).style.width = (100 * F.bhp / BOSS_HP) + '%'; $('#bHpT', m).textContent = `${Math.max(0, F.bhp)} / ${BOSS_HP}`;
        $('#pHp', m).style.width = (100 * F.hp / MAX_HP) + '%'; $('#pHpT', m).textContent = `${Math.max(0, F.hp)} / ${MAX_HP}${F.defend ? ' · 🛡️ defending' : ''}`;
        $('#bMsg', m).innerHTML = F.msg;
      };
      // ---- player turn ----
      const menu = () => {
        if (F.over) return; F.phase = 'menu'; shots = []; render(performance.now()); ui();
        const it = S.items || {};
        $('#bPanel', m).innerHTML = `<div class="row"><button class="btn red" id="bAtk">⚔️ Attack</button><button class="btn green" id="bItm">🎒 Items</button><button class="btn" id="bDef">🛡️ Defend</button></div>
          <div class="muted small" style="margin-top:6px">Attack: answer a maths question to deal damage. Defend: halve the damage of the next attack.</div>`;
        $('#bAtk', m).onclick = attack; $('#bItm', m).onclick = items; $('#bDef', m).onclick = () => { F.defend = true; F.msg = '🛡️ You brace yourself.'; dodge(); };
      };
      const attack = () => {
        F.phase = 'attack'; const q = Quiz.make(S.level, 'Mixed', F.turn < 4 ? 0 : 1); const qStart = Date.now();
        $('#bPanel', m).innerHTML = `<div style="font-weight:700;margin-bottom:8px">${q.text}</div>` + (q.choices
          ? `<div class="choices">${q.choices.map((c, i) => `<button class="choice" data-bc="${i}">${esc(c)}</button>`).join('')}</div>`
          : `<div class="ansrow"><input id="bAns" inputmode="decimal" autocomplete="off" placeholder="Answer to strike"><button class="btn red" id="bGo">Strike!</button></div>`);
        const go = v => {
          if (F.phase !== 'attack') return;
          const ok = Quiz.check(q, v);
          if (ok) {
            const fast = Date.now() - qStart < 15000; let dmg = 28 + Math.floor(Math.random() * 16) + (fast ? 12 : 0);
            F.bhp = Math.max(0, F.bhp - dmg); hurtUntil = performance.now() + 500;
            let extra = ''; if (Math.random() < 0.25) { F.apples++; extra = ' The boss dropped an 🍎!'; }
            F.msg = `💥 Correct! You hit for <b>${dmg}</b>${fast ? ' (quick strike!)' : ''}.${extra}`;
            if (F.bhp <= 0) return end('win');
          } else F.msg = `❌ Missed! The answer was <b>${esc(Quiz.answerText(q))}</b>.`;
          dodge();
        };
        if (q.choices) $$('[data-bc]', m).forEach(b => b.onclick = () => go(b.dataset.bc));
        else { const inp = $('#bAns', m); inp.focus(); inp.onkeydown = e => { if (e.key === 'Enter') go(inp.value); }; $('#bGo', m).onclick = () => go(inp.value); }
      };
      const items = () => {
        const it = S.items || (S.items = {}); const pies = it.pie || 0, pots = it.potion || 0;
        $('#bPanel', m).innerHTML = `<div class="row">
          <button class="btn sm green" data-it="apple" ${F.apples ? '' : 'disabled'}>🍎 Apple +15 HP (${F.apples})</button>
          <button class="btn sm green" data-it="pie" ${pies ? '' : 'disabled'}>🥧 Pie +40 HP (${pies})</button>
          <button class="btn sm green" data-it="potion" ${pots ? '' : 'disabled'}>🧪 Potion full HP (${pots})</button>
          <button class="btn sm ghost" id="bBack">Back</button></div><div class="muted small" style="margin-top:6px">Buy Pies and Potions in the Shop before a fight. Using an item takes your turn.</div>`;
        $('#bBack', m).onclick = menu;
        $$('[data-it]', m).forEach(b => b.onclick = () => {
          const k = b.dataset.it, before = F.hp;
          if (k === 'apple') { F.apples--; F.hp = Math.min(MAX_HP, F.hp + 15); }
          if (k === 'pie') { it.pie--; F.hp = Math.min(MAX_HP, F.hp + 40); }
          if (k === 'potion') { it.potion--; F.hp = MAX_HP; }
          Store.save(); F.msg = `💚 You healed ${F.hp - before} HP.`; dodge();
        });
      };
      // ---- boss turn ----
      const dodge = () => {
        if (F.over) return;
        F.phase = 'dodge'; F.turn++; shots = []; P.x = 240; P.y = (ARENA.y0 + ARENA.y1) / 2; inv = 0;
        dodgeEnd = performance.now() + DODGE_MS; spawnT = 400; last = performance.now();
        $('#bPanel', m).innerHTML = '<div class="muted small">Move the ⭐ with WASD, the arrow keys, your mouse or your finger. Every hit costs HP.</div>'; ui();
        raf = requestAnimationFrame(loop);
      };
      const rage = () => 1 + (1 - F.bhp / BOSS_HP) * 0.8 + Math.min(F.turn, 20) * 0.03;
      const spawn = now => {
        const pat = F.turn % 4, r = rage(), cxp = bx, cyp = 110;
        if (pat === 1) { // aimed volley
          for (let k = 0; k < 3; k++) { const a = Math.atan2(P.y - cyp, P.x - cxp) + (Math.random() - 0.5) * 0.9, v = (0.13 + Math.random() * 0.06) * r; shots.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: SYM[k % SYM.length] }); }
          return 420 / r;
        }
        if (pat === 2) { // rain
          for (let k = 0; k < 2; k++) shots.push({ x: ARENA.x0 + Math.random() * (ARENA.x1 - ARENA.x0), y: ARENA.y0 - 20, vx: 0, vy: (0.12 + Math.random() * 0.08) * r, s: SYM[Math.floor(Math.random() * SYM.length)], c: '#3aa0ff' });
          return 260 / r;
        }
        if (pat === 3) { // ring burst
          const n = 10, off = Math.random() * Math.PI; for (let k = 0; k < n; k++) { const a = off + k * 2 * Math.PI / n, v = 0.11 * r; shots.push({ x: cxp, y: cyp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, s: '×', c: '#ffc93c' }); }
          return 900 / r;
        }
        // walls with a gap
        const gap = ARENA.x0 + 40 + Math.random() * (ARENA.x1 - ARENA.x0 - 120);
        for (let x = ARENA.x0 + 10; x < ARENA.x1; x += 24) if (x < gap || x > gap + 70) shots.push({ x, y: ARENA.y0 - 20, vx: 0, vy: 0.1 * r, s: '=', c: '#20bf8a' });
        return 1300 / r;
      };
      const loop = now => {
        if (F.over || F.phase !== 'dodge') return;
        const dt = Math.min(50, now - last); last = now;
        const sp = 0.3 * dt; if (keys.L) P.x -= sp; if (keys.R) P.x += sp; if (keys.U) P.y -= sp; if (keys.D) P.y += sp; clamp();
        bx = 240 + Math.sin(now / 700) * 150;
        spawnT -= dt; if (spawnT <= 0) spawnT = spawn(now);
        shots.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; });
        shots = shots.filter(s => s.x > -30 && s.x < 510 && s.y < 330 && s.y > -40);
        // no invulnerability: every symbol that touches you deals damage, then disappears
        let hitNow = false;
        shots = shots.filter(s => { if (s.y > ARENA.y0 - 5 && Math.hypot(s.x - P.x, s.y - P.y) < 15) { F.hp = Math.max(0, F.hp - Math.round((5 + Math.floor(rage() * 2)) * (F.defend ? 0.5 : 1))); hitNow = true; return false; } return true; });
        if (hitNow) { hurtFlash = now + 150; ui(); if (F.hp <= 0) return end('lose'); }
        render(now);
        if (now >= dodgeEnd) { F.defend = false; F.msg = `Your turn! (round ${F.turn + 1})`; menu(); return; }
        raf = requestAnimationFrame(loop);
      };
      // ---- clock + ending ----
      clockT = setInterval(() => {
        const left = LIMIT - (Date.now() - F.t0); const el = $('#bTime', m); if (el) el.textContent = mmss(left);
        if (left <= 0 && !F.over) end('time');
      }, 500);
      const stop = () => { F.over = true; cancelAnimationFrame(raf); clearInterval(clockT); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); m.remove(); };
      const end = result => {
        if (F.over) return; F.over = true; cancelAnimationFrame(raf); clearInterval(clockT); ui();
        let title, body;
        if (result === 'win') { title = '🏆 You defeated the Calculator King!'; body = demo ? 'Preview — no tokens.' : '+1,000 🪙 victory bonus.'; if (!demo) addTokens(1000, 'Boss defeated'); }
        else if (result === 'time') { title = '⏳ You survived 15 minutes!'; body = 'The Calculator King gives up and leaves.'; }
        else {
          title = '💀 You ran out of HP…';
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
      render(performance.now()); menu();
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
    $$('[data-buy]').forEach(b => b.onclick = () => { const k = b.dataset.buy, c = k === 'pie' ? 500 : 1500; if (!spend(c)) return; S.items = S.items || {}; S.items[k] = (S.items[k] || 0) + 1; Store.save(); viewShop(); toast(k === 'pie' ? '🥧 Pie bought' : '🧪 Potion bought', 'good'); });
  }

  // ---------- boot ----------
  Store.load();
  if (!S.name) S.name = '';
  renderHud(); route('study');
  setInterval(() => { Store.fixDay(); }, 60000);
  Net.init(); Store.connect();
})();
