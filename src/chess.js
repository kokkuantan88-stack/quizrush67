// ===== Chess engine (rules + bot) =====
const Chess = (() => {
  const KN = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  const KG = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const DIAG = [[-1,-1],[-1,1],[1,-1],[1,1]], ORTH = [[-1,0],[1,0],[0,-1],[0,1]];
  const isW = p => p >= 'A' && p <= 'Z';
  const colorOf = p => p === '.' ? null : (isW(p) ? 'w' : 'b');
  const inB = (r, f) => r >= 0 && r < 8 && f >= 0 && f < 8;

  function newGame() {
    const rows = ['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'];
    return { b: rows.join('').split(''), turn: 'w', cr: 'KQkq', ep: -1, half: 0, full: 1 };
  }
  function fromFEN(fen) {
    const [pos, turn, cr, ep, half, full] = fen.split(' ');
    const b = [];
    for (const ch of pos.replace(/\//g, '')) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push('.'); else b.push(ch); }
    let e = -1; if (ep && ep !== '-') e = (8 - +ep[1]) * 8 + (ep.charCodeAt(0) - 97);
    return { b, turn, cr: cr === '-' ? '' : cr, ep: e, half: +(half || 0), full: +(full || 1) };
  }
  function attacked(b, s, by) {
    const r = s >> 3, f = s & 7;
    if (by === 'w') { for (const df of [-1, 1]) { const rr = r + 1, ff = f + df; if (inB(rr, ff) && b[rr*8+ff] === 'P') return true; } }
    else { for (const df of [-1, 1]) { const rr = r - 1, ff = f + df; if (inB(rr, ff) && b[rr*8+ff] === 'p') return true; } }
    const n = by === 'w' ? 'N' : 'n', k = by === 'w' ? 'K' : 'k';
    const B1 = by === 'w' ? 'B' : 'b', R1 = by === 'w' ? 'R' : 'r', Q1 = by === 'w' ? 'Q' : 'q';
    for (const [dr, df] of KN) { const rr = r + dr, ff = f + df; if (inB(rr, ff) && b[rr*8+ff] === n) return true; }
    for (const [dr, df] of KG) { const rr = r + dr, ff = f + df; if (inB(rr, ff) && b[rr*8+ff] === k) return true; }
    for (const [dr, df] of DIAG) { let rr = r + dr, ff = f + df; while (inB(rr, ff)) { const p = b[rr*8+ff]; if (p !== '.') { if (p === B1 || p === Q1) return true; break; } rr += dr; ff += df; } }
    for (const [dr, df] of ORTH) { let rr = r + dr, ff = f + df; while (inB(rr, ff)) { const p = b[rr*8+ff]; if (p !== '.') { if (p === R1 || p === Q1) return true; break; } rr += dr; ff += df; } }
    return false;
  }
  const kingSq = (b, c) => b.indexOf(c === 'w' ? 'K' : 'k');
  const inCheck = (st, c = st.turn) => attacked(st.b, kingSq(st.b, c), c === 'w' ? 'b' : 'w');

  function pseudo(st) {
    const b = st.b, c = st.turn, moves = [], opp = c === 'w' ? 'b' : 'w';
    for (let s = 0; s < 64; s++) {
      const p = b[s]; if (p === '.' || colorOf(p) !== c) continue;
      const r = s >> 3, f = s & 7, t = p.toUpperCase();
      const add = (to, extra) => moves.push(Object.assign({ from: s, to, piece: p, cap: b[to] }, extra || {}));
      if (t === 'P') {
        const dir = c === 'w' ? -1 : 1, start = c === 'w' ? 6 : 1, last = c === 'w' ? 0 : 7, r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        if (b[r1*8+f] === '.') {
          if (r1 === last) { for (const pr of 'QRBN') add(r1*8+f, { promo: pr }); }
          else { add(r1*8+f); if (r === start && b[(r+2*dir)*8+f] === '.') add((r+2*dir)*8+f, { dbl: true }); }
        }
        for (const df of [-1, 1]) {
          const ff = f + df; if (ff < 0 || ff > 7) continue;
          const to = r1*8+ff, q = b[to];
          if (q !== '.' && colorOf(q) !== c) { if (r1 === last) { for (const pr of 'QRBN') add(to, { promo: pr }); } else add(to); }
          else if (q === '.' && to === st.ep) add(to, { epCap: true, cap: c === 'w' ? 'p' : 'P' });
        }
      } else if (t === 'N' || t === 'K') {
        for (const [dr, df] of (t === 'N' ? KN : KG)) {
          const rr = r + dr, ff = f + df; if (!inB(rr, ff)) continue;
          const q = b[rr*8+ff]; if (q === '.' || colorOf(q) !== c) add(rr*8+ff);
        }
        if (t === 'K') {
          if (c === 'w' && s === 60) {
            if (st.cr.includes('K') && b[61] === '.' && b[62] === '.' && b[63] === 'R' && !attacked(b,60,opp) && !attacked(b,61,opp) && !attacked(b,62,opp)) add(62, { castle: 'K' });
            if (st.cr.includes('Q') && b[59] === '.' && b[58] === '.' && b[57] === '.' && b[56] === 'R' && !attacked(b,60,opp) && !attacked(b,59,opp) && !attacked(b,58,opp)) add(58, { castle: 'Q' });
          }
          if (c === 'b' && s === 4) {
            if (st.cr.includes('k') && b[5] === '.' && b[6] === '.' && b[7] === 'r' && !attacked(b,4,opp) && !attacked(b,5,opp) && !attacked(b,6,opp)) add(6, { castle: 'k' });
            if (st.cr.includes('q') && b[3] === '.' && b[2] === '.' && b[1] === '.' && b[0] === 'r' && !attacked(b,4,opp) && !attacked(b,3,opp) && !attacked(b,2,opp)) add(2, { castle: 'q' });
          }
        }
      } else {
        const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
        for (const [dr, df] of dirs) {
          let rr = r + dr, ff = f + df;
          while (inB(rr, ff)) { const q = b[rr*8+ff]; if (q === '.') add(rr*8+ff); else { if (colorOf(q) !== c) add(rr*8+ff); break; } rr += dr; ff += df; }
        }
      }
    }
    return moves;
  }
  function make(st, m) {
    const b = st.b.slice(), c = st.turn;
    b[m.to] = m.promo ? (c === 'w' ? m.promo : m.promo.toLowerCase()) : m.piece;
    b[m.from] = '.';
    if (m.epCap) b[m.to + (c === 'w' ? 8 : -8)] = '.';
    if (m.castle === 'K') { b[61] = 'R'; b[63] = '.'; }
    if (m.castle === 'Q') { b[59] = 'R'; b[56] = '.'; }
    if (m.castle === 'k') { b[5] = 'r'; b[7] = '.'; }
    if (m.castle === 'q') { b[3] = 'r'; b[0] = '.'; }
    let cr = st.cr;
    if (m.piece === 'K') cr = cr.replace('K', '').replace('Q', '');
    if (m.piece === 'k') cr = cr.replace('k', '').replace('q', '');
    for (const s of [m.from, m.to]) {
      if (s === 63) cr = cr.replace('K', ''); if (s === 56) cr = cr.replace('Q', '');
      if (s === 7) cr = cr.replace('k', ''); if (s === 0) cr = cr.replace('q', '');
    }
    return { b, turn: c === 'w' ? 'b' : 'w', cr, ep: m.dbl ? (m.from + m.to) / 2 : -1,
      half: (m.piece.toUpperCase() === 'P' || m.cap !== '.') ? 0 : st.half + 1, full: st.full + (c === 'b' ? 1 : 0) };
  }
  function legal(st) {
    return pseudo(st).filter(m => { const ns = make(st, m); return !attacked(ns.b, kingSq(ns.b, st.turn), ns.turn); });
  }
  function perft(st, d) { if (d === 0) return 1; let n = 0; for (const m of legal(st)) n += perft(make(st, m), d - 1); return n; }
  const key = st => st.b.join('') + st.turn + st.cr + st.ep;
  function insufficient(b) {
    const ps = b.filter(p => p !== '.' && p.toUpperCase() !== 'K');
    if (ps.length === 0) return true;
    if (ps.length === 1 && 'NBnb'.includes(ps[0])) return true;
    return false;
  }

  // ---- evaluation ----
  const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  const PST = {
    P: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    R: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    K: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  };
  function evaluate(b) { // white's perspective
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (p === '.') continue;
      const t = p.toUpperCase();
      if (isW(p)) s += VAL[t] + PST[t][i];
      else s -= VAL[t] + PST[t][(7 - (i >> 3)) * 8 + (i & 7)];
    }
    return s;
  }
  const order = ms => ms.sort((a, b) => score(b) - score(a));
  const score = m => (m.cap !== '.' ? 10 * VAL[m.cap.toUpperCase()] - VAL[m.piece.toUpperCase()] / 10 + 1000 : 0) + (m.promo ? 800 : 0);

  let nodes = 0, deadline = Infinity, aborted = false;
  function quiesce(st, alpha, beta, qd) {
    nodes++;
    const stand = (st.turn === 'w' ? 1 : -1) * evaluate(st.b);
    if (stand >= beta) return beta;
    if (alpha < stand) alpha = stand;
    if (qd <= 0) return alpha;
    const caps = order(legal(st).filter(m => m.cap !== '.' || m.promo));
    for (const m of caps) {
      const v = -quiesce(make(st, m), -beta, -alpha, qd - 1);
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function negamax(st, depth, alpha, beta, ply) {
    nodes++;
    if ((nodes & 1023) === 0 && Date.now() > deadline) aborted = true;
    if (aborted) return 0;
    const ms = legal(st);
    if (ms.length === 0) return inCheck(st) ? -100000 + ply : 0;
    if (st.half >= 100) return 0;
    if (depth === 0) return quiesce(st, alpha, beta, 4);
    order(ms);
    let best = -Infinity;
    for (const m of ms) {
      const v = -negamax(make(st, m), depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  function searchRoot(st, depth, noise, prevBest) {
    let ms = order(legal(st));
    if (prevBest) { const i = ms.findIndex(m => m.from === prevBest.from && m.to === prevBest.to && m.promo === prevBest.promo); if (i > 0) ms.unshift(ms.splice(i, 1)[0]); }
    let best = null, bestV = -Infinity, alpha = -Infinity;
    for (const m of ms) {
      // noisy levels search every root move with a full window so bounds never get mistaken for exact scores
      let v = -negamax(make(st, m), depth - 1, -Infinity, noise ? Infinity : -alpha, 1);
      if (aborted) break;
      if (noise) v += (Math.random() - 0.5) * noise;
      if (v > bestV) { bestV = v; best = m; }
      if (v > alpha) alpha = v;
    }
    return { move: best, score: bestV };
  }
  // level 1..5
  const LEVELS = {
    1: { depth: 1, noise: 400, random: 0.4, time: 500 },
    2: { depth: 1, noise: 120, random: 0.1, time: 500 },
    3: { depth: 2, noise: 40, random: 0, time: 1200 },
    4: { depth: 3, noise: 10, random: 0, time: 2000 },
    5: { depth: 5, noise: 0, random: 0, time: 2500 },
  };
  function bestMove(st, level) {
    const L = LEVELS[level] || LEVELS[3];
    const ms = legal(st); if (!ms.length) return null;
    if (Math.random() < L.random) return ms[Math.floor(Math.random() * ms.length)];
    nodes = 0; aborted = false; deadline = Date.now() + L.time;
    let best = null;
    for (let d = 1; d <= L.depth; d++) {
      const r = searchRoot(st, d, L.noise, best);
      if (aborted && best) break;
      if (r.move) best = r.move;
      if (r.score > 90000) break;
    }
    aborted = false; deadline = Infinity;
    return best || ms[0];
  }
  return { newGame, fromFEN, legal, make, inCheck, perft, key, insufficient, bestMove, colorOf, evaluate };
})();
if (typeof module !== 'undefined') module.exports = Chess;
