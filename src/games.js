// ===== Reward games =====
const Games = (() => {
  const h = (html) => { const t = document.createElement('div'); t.innerHTML = html.trim(); return t.firstElementChild; };
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // swipe helper
  function swipe(el, fn) {
    let sx = 0, sy = 0, on = false;
    el.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; on = true; });
    el.addEventListener('pointerup', e => { if (!on) return; on = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U')); });
  }
  const KEYDIR = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' };

  const list = [
    // ---------- NUMBER RUSH ----------
    { id: 'rush', name: 'Number Rush', emoji: '⚡', color: '#ff9a3c', desc: '60 seconds of quick mental maths. 10 tokens per correct answer.',
      start(el, api) {
        let score = 0, t = 60, cur, timer;
        el.innerHTML = `<div class="gamebox"><div class="row"><span class="pill coin">Score <b id="rs">0</b></span><span class="pill" style="background:#efeafe;color:#6c4cf5">⏳ <b id="rt">60</b>s</span></div>
          <div class="card" style="min-width:300px;text-align:center"><div class="big" id="rq" style="font-size:40px">…</div><div class="row" id="ra" style="justify-content:center;margin-top:14px"></div></div></div>`;
        const gen = () => {
          const op = ['+', '−', '×', '÷'][ri(0, 3)]; let a, b, ans;
          if (op === '+') { a = ri(12, 99); b = ri(12, 99); ans = a + b; }
          if (op === '−') { a = ri(30, 150); b = ri(5, a); ans = a - b; }
          if (op === '×') { a = ri(3, 12); b = ri(3, 15); ans = a * b; }
          if (op === '÷') { b = ri(2, 12); ans = ri(2, 15); a = b * ans; }
          const opts = new Set([ans]); while (opts.size < 3) { const w = ans + ri(-10, 10); if (w !== ans && w >= 0) opts.add(w); }
          cur = { text: `${a} ${op} ${b}`, ans, opts: shuffle([...opts]) };
          el.querySelector('#rq').textContent = cur.text;
          const ra = el.querySelector('#ra'); ra.innerHTML = '';
          cur.opts.forEach(o => { const bt = h(`<button class="btn" style="font-size:24px;min-width:80px">${o}</button>`); bt.onclick = () => pickAns(o); ra.appendChild(bt); });
        };
        const pickAns = o => { if (o === cur.ans) { score++; } else { t = Math.max(0, t - 3); } el.querySelector('#rs').textContent = score; gen(); };
        gen();
        timer = setInterval(() => { t--; el.querySelector('#rt').textContent = t; if (t <= 0) { clearInterval(timer); api.end(score * 10, `You got ${score} right!`); } }, 1000);
        return () => clearInterval(timer);
      } },
    // ---------- 2048 BLITZ ----------
    { id: '2048', name: '2048 Blitz', emoji: '🔢', color: '#3aa0ff', desc: 'Merge tiles for 3 minutes. Reach 512 for 100 tokens, 1024 for 200.',
      start(el, api) {
        let g = Array(16).fill(0), t = 180, over = false;
        el.innerHTML = `<div class="gamebox"><div class="row"><span class="pill coin">Best <b id="bt">0</b></span><span class="pill" style="background:#efeafe;color:#6c4cf5">⏳ <b id="tt">3:00</b></span><button class="btn sm ghost" id="stop">Cash out</button></div>
          <div class="g2048" id="gb"></div><div class="dpad"><span></span><button data-d="U">↑</button><span></span><button data-d="L">←</button><button data-d="D">↓</button><button data-d="R">→</button></div></div>`;
        const colors = { 0: '#e9e3fd', 2: '#fff', 4: '#fff4d6', 8: '#ffd27a', 16: '#ffb35c', 32: '#ff8f6b', 64: '#ff5d73', 128: '#a98bff', 256: '#8f76ff', 512: '#6c4cf5', 1024: '#3aa0ff', 2048: '#20bf8a' };
        const add = () => { const e = g.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (e.length) g[e[ri(0, e.length - 1)]] = Math.random() < 0.9 ? 2 : 4; };
        const draw = () => { const gb = el.querySelector('#gb'); gb.innerHTML = g.map(v => `<div style="background:${colors[v] || '#231a4a'};color:${v >= 128 ? '#fff' : '#231a4a'};font-size:${v >= 1024 ? 20 : 26}px">${v || ''}</div>`).join(''); el.querySelector('#bt').textContent = Math.max(...g); };
        const line = arr => { const a = arr.filter(v => v); for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; a.splice(i + 1, 1); } while (a.length < 4) a.push(0); return a; };
        const move = d => {
          if (over) return; const before = g.join();
          for (let k = 0; k < 4; k++) {
            let idx = [];
            for (let j = 0; j < 4; j++) idx.push(d === 'L' ? k * 4 + j : d === 'R' ? k * 4 + 3 - j : d === 'U' ? j * 4 + k : (3 - j) * 4 + k);
            const nl = line(idx.map(i => g[i])); idx.forEach((i, j) => g[i] = nl[j]);
          }
          if (g.join() !== before) { add(); draw(); }
          const can = g.some(v => !v) || g.some((v, i) => (i % 4 < 3 && v === g[i + 1]) || (i < 12 && v === g[i + 4]));
          if (!can) finish('No moves left!');
        };
        const reward = m => m >= 2048 ? 500 : m >= 1024 ? 200 : m >= 512 ? 100 : m >= 256 ? 50 : m >= 128 ? 20 : 0;
        const finish = msg => { if (over) return; over = true; clearInterval(timer); const m = Math.max(...g); api.end(reward(m), `${msg} Best tile: ${m}.`); };
        add(); add(); draw();
        const onKey = e => { const d = KEYDIR[e.key]; if (d) { e.preventDefault(); move(d); } };
        document.addEventListener('keydown', onKey);
        swipe(el.querySelector('#gb'), move);
        el.querySelectorAll('.dpad button').forEach(b => b.onclick = () => move(b.dataset.d));
        el.querySelector('#stop').onclick = () => finish('Cashed out.');
        const timer = setInterval(() => { t--; el.querySelector('#tt').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; if (t <= 0) finish("Time's up!"); }, 1000);
        return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
      } },
    // ---------- MINESWEEPER ----------
    { id: 'mines', name: 'Minesweeper', emoji: '💣', color: '#231a4a', desc: 'Clear the field. +50 tokens per bomb avoided if you win, −100 if you blow up.',
      start(el, api) {
        const W = 9, H = 9, B = 10; let bombs = null, open = new Set(), flags = new Set(), over = false, flagMode = false;
        el.innerHTML = `<div class="gamebox"><div class="row"><span class="pill coin">💣 <b>${B}</b></span><span class="pill" style="background:#efeafe;color:#6c4cf5">🚩 <b id="fc">0</b></span><button class="btn sm ghost" id="fm">Mode: dig ⛏</button></div>
          <div class="mines" id="mb" style="grid-template-columns:repeat(${W},34px)"></div><div class="muted small">Right-click or switch to flag mode to place a flag.</div></div>`;
        const nb = i => { const r = Math.floor(i / W), c = i % W, out = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < H && cc >= 0 && cc < W) out.push(rr * W + cc); } return out; };
        const cnt = i => nb(i).filter(j => bombs.has(j)).length;
        const place = safe => { bombs = new Set(); const no = new Set([safe, ...nb(safe)]); while (bombs.size < B) { const k = ri(0, W * H - 1); if (!no.has(k)) bombs.add(k); } };
        const mb = el.querySelector('#mb');
        const cols = ['', '#3aa0ff', '#20bf8a', '#ff5d73', '#6c4cf5', '#d97a00', '#0aa', '#231a4a', '#999'];
        const draw = (reveal) => {
          mb.innerHTML = '';
          for (let i = 0; i < W * H; i++) {
            const b = document.createElement('button');
            if (open.has(i) || (reveal && bombs && bombs.has(i))) {
              b.className = 'open';
              if (bombs && bombs.has(i)) { b.textContent = '💣'; if (reveal === i) b.className = 'open boom'; }
              else { const n = cnt(i); b.textContent = n || ''; b.style.color = cols[n]; }
            } else if (flags.has(i)) b.textContent = '🚩';
            b.onclick = () => act(i, flagMode);
            b.oncontextmenu = e => { e.preventDefault(); act(i, true); };
            mb.appendChild(b);
          }
          el.querySelector('#fc').textContent = flags.size;
        };
        const flood = i => { const st = [i]; while (st.length) { const k = st.pop(); if (open.has(k) || flags.has(k)) continue; open.add(k); if (cnt(k) === 0) nb(k).forEach(j => { if (!open.has(j)) st.push(j); }); } };
        const act = (i, flag) => {
          if (over || open.has(i)) return;
          if (flag) { flags.has(i) ? flags.delete(i) : flags.add(i); return draw(); }
          if (flags.has(i)) return;
          if (!bombs) place(i);
          if (bombs.has(i)) { over = true; draw(i); setTimeout(() => api.end(-100, 'BOOM! You hit a bomb.'), 700); return; }
          flood(i); draw();
          if (open.size === W * H - B) { over = true; draw(-1); setTimeout(() => api.end(B * 50, `Field cleared! ${B} bombs avoided.`), 500); }
        };
        el.querySelector('#fm').onclick = e => { flagMode = !flagMode; e.target.textContent = flagMode ? 'Mode: flag 🚩' : 'Mode: dig ⛏'; };
        draw();
        return () => {};
      } },
    // ---------- SNAKE ----------
    { id: 'snake', name: 'Snake Arena', emoji: '🐍', color: '#20bf8a', desc: 'Eat apples, grow longer, avoid walls and yourself. 10 tokens per apple.',
      start(el, api) {
        const N = 20, S = 18; let snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], dir = 'R', next = 'R', food, over = false, eaten = 0;
        el.innerHTML = `<div class="gamebox"><div class="row"><span class="pill coin">🍎 <b id="se">0</b></span></div><canvas id="sc" width="${N * S}" height="${N * S}" style="background:#1d1540"></canvas>
          <div class="dpad"><span></span><button data-d="U">↑</button><span></span><button data-d="L">←</button><button data-d="D">↓</button><button data-d="R">→</button></div></div>`;
        const cv = el.querySelector('#sc'), cx = cv.getContext('2d');
        const putFood = () => { do { food = { x: ri(0, N - 1), y: ri(0, N - 1) }; } while (snake.some(s => s.x === food.x && s.y === food.y)); };
        putFood();
        const opp = { U: 'D', D: 'U', L: 'R', R: 'L' };
        const turn = d => { if (d !== opp[dir]) next = d; };
        const step = () => {
          if (over) return; dir = next;
          const hd = { x: snake[0].x + (dir === 'R') - (dir === 'L'), y: snake[0].y + (dir === 'D') - (dir === 'U') };
          if (hd.x < 0 || hd.y < 0 || hd.x >= N || hd.y >= N || snake.some(s => s.x === hd.x && s.y === hd.y)) { over = true; clearInterval(timer); return api.end(eaten * 10, `Crash! You ate ${eaten} apples.`); }
          snake.unshift(hd);
          if (hd.x === food.x && hd.y === food.y) { eaten++; el.querySelector('#se').textContent = eaten; putFood(); } else snake.pop();
          cx.fillStyle = '#1d1540'; cx.fillRect(0, 0, N * S, N * S);
          cx.fillStyle = '#ff5d73'; cx.beginPath(); cx.arc(food.x * S + S / 2, food.y * S + S / 2, S / 2 - 2, 0, 7); cx.fill();
          snake.forEach((s, i) => { cx.fillStyle = i ? '#20bf8a' : '#ffc93c'; cx.fillRect(s.x * S + 1, s.y * S + 1, S - 2, S - 2); });
        };
        const onKey = e => { const d = KEYDIR[e.key]; if (d) { e.preventDefault(); turn(d); } };
        document.addEventListener('keydown', onKey);
        swipe(cv, turn);
        el.querySelectorAll('.dpad button').forEach(b => b.onclick = () => turn(b.dataset.d));
        const timer = setInterval(step, 130);
        return () => { clearInterval(timer); document.removeEventListener('keydown', onKey); };
      } },
    // ---------- MEMORY MATCH ----------
    { id: 'memory', name: 'Memory Match', emoji: '🃏', color: '#ff5d73', desc: 'Match fractions with decimals and percentages. Faster = more tokens.',
      start(el, api) {
        const pairs = [['1/2', '0.5'], ['1/4', '25%'], ['3/4', '0.75'], ['1/5', '20%'], ['2/5', '0.4'], ['3/8', '0.375'], ['1/10', '10%'], ['7/10', '70%']];
        const cards = shuffle(pairs.flatMap((p, i) => [{ v: p[0], k: i }, { v: p[1], k: i }]));
        let up = [], done = new Set(), t0 = Date.now(), lock = false, moves = 0;
        el.innerHTML = `<div class="gamebox"><div class="row"><span class="pill coin">Moves <b id="mm">0</b></span><span class="pill" style="background:#efeafe;color:#6c4cf5">⏳ <b id="mt">0</b>s</span></div><div class="mem" id="mg"></div></div>`;
        const mg = el.querySelector('#mg');
        const draw = () => { mg.innerHTML = ''; cards.forEach((c, i) => { const b = document.createElement('button'); const shown = up.includes(i) || done.has(c.k); b.className = done.has(c.k) ? 'done' : shown ? 'up' : ''; b.textContent = shown ? c.v : '?'; b.onclick = () => flip(i); mg.appendChild(b); }); };
        const flip = i => {
          if (lock || up.includes(i) || done.has(cards[i].k)) return;
          up.push(i); draw();
          if (up.length === 2) {
            moves++; el.querySelector('#mm').textContent = moves; lock = true;
            setTimeout(() => {
              if (cards[up[0]].k === cards[up[1]].k) done.add(cards[up[0]].k);
              up = []; lock = false; draw();
              if (done.size === pairs.length) { clearInterval(timer); const s = Math.round((Date.now() - t0) / 1000); api.end(s < 45 ? 150 : s < 75 ? 100 : 50, `All matched in ${s}s and ${moves} moves!`); }
            }, 650);
          }
        };
        draw();
        const timer = setInterval(() => el.querySelector('#mt').textContent = Math.round((Date.now() - t0) / 1000), 500);
        return () => clearInterval(timer);
      } },
  ];
  return { list };
})();
