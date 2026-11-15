// ===== Question generators (MOE-style P6 / Sec 1 / Sec 2) =====
const Quiz = (() => {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const r2 = x => Math.round(x * 100) / 100;
  const fr = (n, d) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); n /= g; d /= g; return d === 1 ? `${n}` : `${n}/${d}`; };
  const F = (n, d) => { const s = fr(n, d); if (!s.includes('/')) return s; const [a, b] = s.split('/'); const neg = a.startsWith('-'); return `${neg ? '−' : ''}<span class="fr"><sup>${neg ? a.slice(1) : a}</sup><sub>${b}</sub></span>`; };
  const money = x => '$' + (Number.isInteger(x) ? x : x.toFixed(2));
  const sgn = (n, first) => first ? (n < 0 ? '−' + Math.abs(n) : '' + n) : (n < 0 ? ' − ' + Math.abs(n) : ' + ' + n);
  const neg = n => n < 0 ? `(−${Math.abs(n)})` : `${n}`;
  // polynomial a x^2 + b x + c with variable v
  function poly(cs, v = 'x') {
    const deg = cs.length - 1; let out = '';
    cs.forEach((c, i) => {
      const p = deg - i; if (c === 0) return;
      const first = out === '';
      const abs = Math.abs(c);
      const coef = (abs === 1 && p > 0) ? '' : abs;
      const term = coef + (p === 0 ? '' : p === 1 ? v : v + '²');
      out += first ? (c < 0 ? '−' + term : term) : (c < 0 ? ' − ' + term : ' + ' + term);
    });
    return out || '0';
  }
  // multiple choice from a correct string + distractors
  function mcq(q, correct, wrongs, sol) {
    const opts = [correct]; for (const w of wrongs) if (!opts.includes(w) && opts.length < 4) opts.push(w);
    let k = 0; while (opts.length < 4 && k++ < 20) { const w = correct + ' '; if (!opts.includes(w)) opts.push(w); }
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    return { text: q, choices: opts, answer: opts.indexOf(correct), sol };
  }
  const num = (text, answer, sol, extra) => Object.assign({ text, answer, sol }, extra || {});

  const G = {
    // ---------------- PRIMARY 6 ----------------
    'P6:Fractions': d => {
      if (d === 0) { const den = pick([3,4,5,6,8]), nu = ri(1, den - 1), n = den * ri(3, 15); const a = n * nu / den;
        return num(`Find ${F(nu, den)} of ${n}.`, a, `${n} ÷ ${den} = ${n / den}<br>${n / den} × ${nu} = <b>${a}</b>`); }
      if (d === 1) { const d1 = pick([3,4,5]), n1 = ri(1, d1 - 1), d2 = pick([3,4,5,6]), n2 = ri(1, d2 - 1), T = d1 * d2 * ri(2, 8) * 5;
        const R = T - T * n1 / d1, left = R - R * n2 / d2;
        return num(`Mei had $${T}. She spent ${F(n1, d1)} of it on a bag and ${F(n2, d2)} of the remainder on shoes. How much money did she have left?`, left,
          `Spent on bag: ${F(n1, d1)} × ${T} = $${T * n1 / d1}<br>Remainder: ${T} − ${T * n1 / d1} = $${R}<br>Spent on shoes: ${F(n2, d2)} × ${R} = $${R * n2 / d2}<br>Left: ${R} − ${R * n2 / d2} = <b>$${left}</b>`, { unit: '$' }); }
      const a = pick([2,3,4,5]), b = ri(1, a - 1), c = pick([3,4,5]), e = ri(1, c - 1), x = a * c * ri(2, 6);
      const R = x - x * b / a, L = R - R * e / c;
      return num(`Ravi had some marbles. He gave ${F(b, a)} of them to Ali and ${F(e, c)} of the remainder to Ben. He had ${L} marbles left. How many marbles did he have at first?`, x,
        `Work backwards. ${L} is ${F(c - e, c)} of the remainder, so remainder = ${L} ÷ ${c - e} × ${c} = ${R}<br>${R} is ${F(a - b, a)} of the total, so total = ${R} ÷ ${a - b} × ${a} = <b>${x}</b>`);
    },
    'P6:Percentage': d => {
      if (d === 0) { const p = 5 * ri(1, 19), n = 20 * ri(2, 25), a = n * p / 100;
        return num(`Find ${p}% of ${n}.`, a, `${p}/100 × ${n} = <b>${a}</b>`); }
      if (d === 1) { const P = 20 * ri(2, 15), p = pick([10,15,20,25,30,40]), sale = P * (100 - p) / 100;
        return num(`A jacket costs $${P}. During a sale it is sold at a ${p}% discount. What is the sale price?`, sale,
          `Discount = ${p}% × ${P} = $${P * p / 100}<br>Sale price = ${P} − ${P * p / 100} = <b>$${sale}</b>`, { unit: '$' }); }
      const p = pick([10,20,25,30,40]), orig = 20 * ri(2, 20), sale = orig * (100 - p) / 100;
      return num(`After a ${p}% discount, a bag costs $${sale}. What was the original price?`, orig,
        `$${sale} is ${100 - p}% of the original.<br>1% = ${sale} ÷ ${100 - p} = $${r2(sale / (100 - p))}<br>100% = <b>$${orig}</b>`, { unit: '$' });
    },
    'P6:Ratio': d => {
      if (d === 0) { const a = ri(1, 5), b = ri(a + 1, 9), u = ri(3, 20), N = (a + b) * u;
        return num(`$${N} is shared between Amy and Ben in the ratio ${a} : ${b}. How much does Ben get?`, b * u,
          `Total units = ${a} + ${b} = ${a + b}<br>1 unit = ${N} ÷ ${a + b} = $${u}<br>Ben = ${b} × ${u} = <b>$${b * u}</b>`, { unit: '$' }); }
      if (d === 1) { const a = ri(2, 4), b = ri(a + 1, 6), c = ri(b + 1, 9), u = ri(4, 15);
        return num(`The ratio of red to blue to green beads is ${a} : ${b} : ${c}. There are ${(c - a) * u} more green beads than red beads. How many beads are there altogether?`, (a + b + c) * u,
          `Green − red = ${c} − ${a} = ${c - a} units = ${(c - a) * u}<br>1 unit = ${u}<br>Total = ${a + b + c} units = <b>${(a + b + c) * u}</b>`); }
      let a, b, p, q, guard = 0;
      do { a = ri(2, 6); b = ri(2, 7); p = ri(1, 5); q = ri(2, 9); guard++; }
      while ((gcd(a, b) !== 1 || gcd(p, q) !== 1 || p * (a + b) >= a * (p + q)) && guard < 500);
      if (guard >= 500) { a = 3; b = 5; p = 1; q = 3; }
      const lcm = (a + b) * (p + q) / gcd(a + b, p + q), T = lcm * ri(1, 3), A = T * a / (a + b), B = T - A, t = A - T * p / (p + q);
      return num(`The ratio of Jun's stickers to Kai's stickers was ${a} : ${b}. After Jun gave ${t} stickers to Kai, the ratio became ${p} : ${q}. How many stickers did Jun have at first?`, A,
        `The total does not change. Before: ${a + b} units; after: ${p + q} parts.<br>Make the totals the same: Jun's share changes from ${a}/${a + b} to ${p}/${p + q} of the total.<br>${a}/${a + b} − ${p}/${p + q} of the total = ${t}, so total = ${A + B}<br>Jun at first = ${a}/${a + b} × ${A + B} = <b>${A}</b>`);
    },
    'P6:Speed': d => {
      if (d === 0) { const v = 5 * ri(8, 20), t = ri(2, 5);
        return num(`A car travels at ${v} km/h for ${t} hours. How far does it travel (in km)?`, v * t, `Distance = speed × time = ${v} × ${t} = <b>${v * t} km</b>`, { unit: 'km' }); }
      if (d === 1) { const v1 = 10 * ri(4, 8), t1 = ri(1, 3), v2 = 10 * ri(4, 8), t2 = ri(1, 3), D = v1 * t1 + v2 * t2, avg = r2(D / (t1 + t2));
        return num(`A bus travelled at ${v1} km/h for ${t1} h and then at ${v2} km/h for ${t2} h. What was its average speed for the whole journey, in km/h? (Round to 2 d.p. if needed.)`, avg,
          `Total distance = ${v1}×${t1} + ${v2}×${t2} = ${D} km<br>Total time = ${t1 + t2} h<br>Average speed = ${D} ÷ ${t1 + t2} = <b>${avg} km/h</b>`, { unit: 'km/h', tol: 0.01 }); }
      const v1 = 10 * ri(4, 9), v2 = 10 * ri(4, 9), mins = pick([30, 45, 60, 75, 90, 120]), D = (v1 + v2) * mins / 60;
      return num(`Town A and Town B are ${D} km apart. A van leaves A towards B at ${v1} km/h. At the same time a lorry leaves B towards A at ${v2} km/h. How many minutes later do they meet?`, mins,
        `They close the gap at ${v1} + ${v2} = ${v1 + v2} km/h<br>Time = ${D} ÷ ${v1 + v2} h = ${D / (v1 + v2)} h = <b>${mins} min</b>`, { unit: 'min' });
    },
    'P6:Algebra': d => {
      if (d === 0) { const a = ri(2, 9), b = ri(1, 20), x = ri(2, 12);
        return num(`Find the value of ${a}k + ${b} when k = ${x}.`, a * x + b, `${a} × ${x} + ${b} = ${a * x} + ${b} = <b>${a * x + b}</b>`); }
      if (d === 1) { const c = pick([2, 3, 4]), a = c * ri(1, 2) + 1, x = ri(2, 15); const b0 = a * x - c * ri(1, Math.floor((a * x - 1) / c)); const b = b0;
        return num(`Find the value of (${a}m − ${b}) ÷ ${c} when m = ${x}.`, (a * x - b) / c, `${a} × ${x} − ${b} = ${a * x - b}<br>${a * x - b} ÷ ${c} = <b>${(a * x - b) / c}</b>`); }
      const p = ri(2, 6), n1 = ri(2, 6), n2 = ri(2, 5), k = ri(2, 4);
      return num(`A pen costs $p and a book costs ${k} times as much as a pen. Ali buys ${n1} pens and ${n2} books. If p = ${p}, how much does he pay?`, n1 * p + n2 * k * p,
        `Book = ${k}p. Total = ${n1}p + ${n2} × ${k}p = ${n1 + n2 * k}p<br>When p = ${p}: ${n1 + n2 * k} × ${p} = <b>$${n1 * p + n2 * k * p}</b>`, { unit: '$' });
    },
    'P6:Area and volume': d => {
      if (d === 0) { const l = ri(3, 20), w = ri(2, 12), h = ri(2, 10);
        return num(`A cuboid is ${l} cm long, ${w} cm wide and ${h} cm high. Find its volume in cm³.`, l * w * h, `Volume = ${l} × ${w} × ${h} = <b>${l * w * h} cm³</b>`, { unit: 'cm³' }); }
      if (d === 1) { const r = ri(2, 20), area = r2(3.14 * r * r);
        return num(`Find the area of a circle of radius ${r} cm. (Take π = 3.14)`, area, `Area = π r² = 3.14 × ${r} × ${r} = <b>${area} cm²</b>`, { unit: 'cm²', tol: 0.01 }); }
      const l = pick([20, 25, 30, 40, 50]), w = pick([10, 20, 25, 30]), h1 = ri(5, 15), add = ri(2, 9) * l * w / 1000; const rise = add * 1000 / (l * w);
      if (!Number.isInteger(rise * 10)) return G['P6:Area and volume'](2);
      return num(`A tank is ${l} cm long and ${w} cm wide. It contains water to a height of ${h1} cm. ${add} ℓ of water is poured in. What is the new height of the water, in cm?`, h1 + rise,
        `${add} ℓ = ${add * 1000} cm³<br>Rise = ${add * 1000} ÷ (${l} × ${w}) = ${rise} cm<br>New height = ${h1} + ${rise} = <b>${h1 + rise} cm</b>`, { unit: 'cm' });
    },
    'P6:Average': d => {
      if (d === 0) { const xs = [ri(10, 99), ri(10, 99), ri(10, 99)]; const s = xs.reduce((a, b) => a + b); const extra = (4 - s % 4) % 4 + 4 * ri(3, 20); xs.push(extra);
        const t = s + extra; return num(`Find the average of ${xs.join(', ')}.`, t / 4, `Sum = ${t}<br>Average = ${t} ÷ 4 = <b>${t / 4}</b>`); }
      if (d === 1) { const n = ri(5, 8), A = ri(20, 60), B = ri(A - 8, A + 8); const removed = n * A - (n - 1) * B; if (removed <= 0) return G['P6:Average'](1);
        return num(`The average of ${n} numbers is ${A}. When one number is removed, the average of the rest is ${B}. What number was removed?`, removed,
          `Total of ${n} numbers = ${n} × ${A} = ${n * A}<br>Total of ${n - 1} numbers = ${n - 1} × ${B} = ${(n - 1) * B}<br>Removed = <b>${removed}</b>`); }
      const b = ri(12, 25), g = ri(12, 25), ab = ri(40, 70), ag = ri(40, 70), tot = b * ab + g * ag, avg = r2(tot / (b + g));
      return num(`In a class, ${b} boys scored an average of ${ab} marks and ${g} girls scored an average of ${ag} marks. What is the average score of the whole class? (Round to 2 d.p.)`, avg,
        `Boys' total = ${b * ab}, girls' total = ${g * ag}<br>Class total = ${tot}, pupils = ${b + g}<br>Average = <b>${avg}</b>`, { tol: 0.01 });
    },
    // ---------------- SECONDARY 1 ----------------
    'Sec 1:Integers': d => {
      if (d === 0) { const a = ri(-15, -1), b = ri(1, 20), c = ri(-12, -1);
        return num(`Evaluate ${neg(a)} + ${b} − ${neg(c)}.`, a + b - c, `${a} + ${b} = ${a + b}<br>${a + b} − (${c}) = ${a + b} + ${-c} = <b>${a + b - c}</b>`); }
      if (d === 1) { const a = ri(-9, -2), b = ri(-9, -2), c = ri(-6, -2), m = c * ri(1, 6);
        return num(`Evaluate ${neg(a)} × ${neg(b)} − ${m} ÷ ${neg(c)}.`, a * b - m / c, `${a} × ${b} = ${a * b}<br>${m} ÷ ${c} = ${m / c}<br>${a * b} − (${m / c}) = <b>${a * b - m / c}</b>`); }
      const a = ri(-4, -2), b = ri(-5, -2), k = pick([2, 4, 8]), c = ri(1, 4); const sq = b * b; if ((c * sq) % k) return G['Sec 1:Integers'](2);
      const ans = a ** 3 - c * sq / k;
      return num(`Evaluate (${a})³ − ${c} × (${b})² ÷ ${k}.`, ans, `(${a})³ = ${a ** 3}<br>(${b})² = ${sq}<br>${c} × ${sq} ÷ ${k} = ${c * sq / k}<br>${a ** 3} − ${c * sq / k} = <b>${ans}</b>`);
    },
    'Sec 1:Linear equations': d => {
      const x = ri(-6, 12);
      if (d === 0) { const a = ri(2, 9), b = ri(-15, 20); return num(`Solve ${a}x${sgn(b)} = ${a * x + b}.`, x, `${a}x = ${a * x + b}${sgn(-b)} = ${a * x}<br>x = ${a * x} ÷ ${a} = <b>${x}</b>`); }
      if (d === 1) { const a = ri(4, 9), c = ri(1, a - 1), b = ri(-12, 12), e = (a - c) * x + b;
        return num(`Solve ${a}x${sgn(b)} = ${c}x${sgn(e)}.`, x, `${a}x − ${c}x = ${e}${sgn(-b)}<br>${a - c}x = ${e - b}<br>x = <b>${x}</b>`); }
      const m = pick([2, 3, 4, 5]), n = pick([2, 3, 4, 5].filter(v => v !== m)), a = ri(1, 4), b = ri(-5, 5), c = ri(1, 3), e = ri(-5, 5);
      const L = m * n; const num1 = n * (a * x + b) - m * (c * x + e); // RHS = num1 / L
      const coef = n * a - m * c; if (coef === 0) return G['Sec 1:Linear equations'](2);
      return num(`Solve (${poly([a, b])}) / ${m} − (${poly([c, e])}) / ${n} = ${F(num1, L)}.`, x,
        `Multiply both sides by ${L}: ${n}(${poly([a, b])}) − ${m}(${poly([c, e])}) = ${num1}<br>${poly([n * a, n * b])} − (${poly([m * c, m * e])}) = ${num1}<br>${poly([coef, n * b - m * e])} = ${num1}<br>${coef}x = ${num1 - (n * b - m * e)}<br>x = <b>${x}</b>`);
    },
    'Sec 1:Algebraic expressions': d => {
      if (d === 0) { const a = ri(2, 9), b = ri(2, 9), c = ri(1, a - 1 || 1), e = ri(1, 9);
        const A = a - c, B = b + e; const fmt = (p, q) => `${p === 1 ? '' : p}a + ${q}b`;
        return mcq(`Simplify ${a}a + ${b}b − ${c}a + ${e}b.`, fmt(A, B), [fmt(a + c, B), fmt(A, b - e), fmt(a + c, b - e), fmt(A + 1, B)], `${a}a − ${c}a = ${A}a; ${b}b + ${e}b = ${B}b<br>Answer: <b>${fmt(A, B)}</b>`); }
      if (d === 1) { const k = ri(2, 5), p = ri(2, 4), q = ri(1, 9), r = ri(1, 9);
        const c1 = -k * p + r, c0 = k * q;
        const right = poly([c1, c0]);
        return mcq(`Expand and simplify −${k}(${p}x − ${q}) + ${r}x.`, right, [poly([-k * p - r, c0]), poly([c1, -c0]), poly([k * p + r, -c0]), poly([c1, q])],
          `−${k}(${p}x − ${q}) = −${k * p}x + ${k * q}<br>−${k * p}x + ${r}x = ${c1}x<br>Answer: <b>${right}</b>`); }
      const a = ri(2, 5), b = ri(1, 6), c = ri(1, 4), e = ri(1, 6); // (ax - b)/2 - (cx - e)/3
      const A = 3 * a - 2 * c, B = -3 * b + 2 * e; const right = `(${poly([A, B])}) / 6`;
      return mcq(`Simplify (${a}x − ${b})/2 − (${c}x − ${e})/3.`, right, [`(${poly([3 * a + 2 * c, B])}) / 6`, `(${poly([A, -3 * b - 2 * e])}) / 6`, `(${poly([a - c, -b + e])}) / 5`, `(${poly([A, B])}) / 5`],
        `Common denominator 6: [3(${a}x − ${b}) − 2(${c}x − ${e})] / 6<br>= (${3 * a}x − ${3 * b} − ${2 * c}x + ${2 * e}) / 6<br>= <b>${right}</b>`);
    },
    'Sec 1:Angles and polygons': d => {
      if (d === 0) { const n = ri(5, 12); return num(`Find the sum of the interior angles of a ${n}-sided polygon, in degrees.`, (n - 2) * 180, `Sum = (n − 2) × 180° = (${n} − 2) × 180° = <b>${(n - 2) * 180}°</b>`, { unit: '°' }); }
      if (d === 1) { const n = pick([5, 6, 8, 9, 10, 12, 15, 18, 20]); const ext = 360 / n;
        return num(`Find the size of each interior angle of a regular ${n}-sided polygon, in degrees.`, 180 - ext, `Each exterior angle = 360° ÷ ${n} = ${ext}°<br>Interior angle = 180° − ${ext}° = <b>${180 - ext}°</b>`, { unit: '°' }); }
      const k = pick([2, 3, 4, 5, 8, 9]); const ext = 180 / (k + 1), n = 360 / ext;
      return num(`Each interior angle of a regular polygon is ${k} times the size of each exterior angle. How many sides does the polygon have?`, n,
        `Interior + exterior = 180°, so ${k + 1} × exterior = 180°<br>Exterior = ${ext}°<br>n = 360° ÷ ${ext}° = <b>${n}</b>`);
    },
    'Sec 1:Percentage change': d => {
      if (d === 0) { const A = 20 * ri(2, 20), p = pick([5, 10, 15, 20, 25, 30, 40, 50]), B = A * (100 + p) / 100;
        return num(`A price increased from $${A} to $${B}. Find the percentage increase.`, p, `Increase = ${B} − ${A} = $${B - A}<br>% increase = ${B - A} ÷ ${A} × 100% = <b>${p}%</b>`, { unit: '%' }); }
      if (d === 1) { const A = 40 * ri(2, 20), p = pick([5, 10, 12.5, 15, 20, 25, 30, 35]), B = A * (100 - p) / 100;
        return num(`The number of visitors fell from ${A} to ${B}. Find the percentage decrease.`, p, `Decrease = ${A - B}<br>% decrease = ${A - B} ÷ ${A} × 100% = <b>${p}%</b>`, { unit: '%' }); }
      const p = pick([10, 20, 25, 30, 40, 50]), q = pick([10, 20, 25, 30, 40]); const f = (1 + p / 100) * (1 - q / 100); const ch = r2((f - 1) * 100);
      return num(`A shop raised a price by ${p}%, then reduced the new price by ${q}%. Find the overall percentage change. (Use a negative number for a decrease.)`, ch,
        `Overall factor = ${1 + p / 100} × ${1 - q / 100} = ${r2(f * 10000) / 10000}<br>Change = (${r2(f * 10000) / 10000} − 1) × 100% = <b>${ch}%</b>`, { unit: '%', tol: 0.01 });
    },
    // ---------------- SECONDARY 2 ----------------
    'Sec 2:Expansion and factorisation': d => {
      if (d === 0) { const a = ri(-7, 7) || 2, b = ri(-7, 7) || -3; const right = poly([1, a + b, a * b]);
        return mcq(`Expand (${poly([1, a])})(${poly([1, b])}).`, right, [poly([1, a * b, a + b]), poly([1, a - b, a * b]), poly([1, a + b, -a * b]), poly([1, -(a + b), a * b])],
          `x·x + x·(${b}) + ${a}·x + ${a}·(${b})<br>= <b>${right}</b>`); }
      if (d === 1) { const a = ri(2, 4), b = ri(1, 7), c = ri(1, 7); // (ax + b)(x - c)
        const right = poly([a, b - a * c, -b * c]);
        return mcq(`Expand (${a}x + ${b})(x − ${c}).`, right, [poly([a, a * c - b, -b * c]), poly([a, b - a * c, b * c]), poly([a, b + a * c, -b * c]), poly([a + 1, b - a * c, -b * c])],
          `${a}x·x − ${a * c}x + ${b}x − ${b * c}<br>= <b>${right}</b>`); }
      const p = pick([1, 2, 3]), q = ri(-6, 6) || 1, r = ri(-6, 6) || -2; // (px + q)(x + r)
      const right = `(${poly([p, q])})(${poly([1, r])})`;
      return mcq(`Factorise ${poly([p, p * r + q, q * r])} completely.`, right, [`(${poly([p, -q])})(${poly([1, -r])})`, `(${poly([p, r])})(${poly([1, q])})`, `(${poly([p, q])})(${poly([1, -r])})`, `(${poly([p, -r])})(${poly([1, q])})`],
        `Look for two factors of ${p}x² and ${q * r} that make the middle term ${p * r + q}x.<br>(${poly([p, q])})(${poly([1, r])}) = ${p}x² + ${p * r}x + ${q}x + ${q * r} ✓<br>Answer: <b>${right}</b>`);
    },
    'Sec 2:Simultaneous equations': d => {
      const x = ri(-5, 9), y = ri(-5, 9);
      if (d === 0) return num(`Solve: x + y = ${x + y} and x − y = ${x - y}. Find x.`, x, `Add the equations: 2x = ${2 * x}<br>x = <b>${x}</b>`);
      if (d === 1) { const a = ri(2, 5), b = ri(2, 5), c = ri(2, 5);
        return num(`Solve: ${a}x + ${b}y = ${a * x + b * y} and ${c}x − y = ${c * x - y}. Find x.`, x,
          `From the second: y = ${c}x${sgn(-(c * x - y))}<br>Substitute: ${a}x + ${b}(${c}x${sgn(-(c * x - y))}) = ${a * x + b * y}<br>${a + b * c}x = ${a * x + b * y + b * (c * x - y)}<br>x = <b>${x}</b>`); }
      const a = ri(2, 6), b = ri(2, 6), c = ri(2, 6), e = ri(2, 6); if (a * e - b * c === 0) return G['Sec 2:Simultaneous equations'](2);
      return num(`Solve: ${a}x + ${b}y = ${a * x + b * y} and ${c}x + ${e}y = ${c * x + e * y}. Find the value of x + y.`, x + y,
        `Eliminate one unknown (multiply and subtract).<br>x = ${x}, y = ${y}<br>x + y = <b>${x + y}</b>`);
    },
    "Sec 2:Pythagoras' theorem": d => {
      const T = pick([[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10],[9,12,15],[20,21,29]]); const k = d === 2 ? 1 : ri(1, 3);
      const [a, b, c] = T.map(v => v * k);
      if (d === 0) return num(`A right-angled triangle has shorter sides ${a} cm and ${b} cm. Find the length of the hypotenuse in cm.`, c, `c² = ${a}² + ${b}² = ${a * a + b * b}<br>c = √${a * a + b * b} = <b>${c} cm</b>`, { unit: 'cm' });
      if (d === 1) return num(`The hypotenuse of a right-angled triangle is ${c} cm and one side is ${a} cm. Find the other side in cm.`, b, `b² = ${c}² − ${a}² = ${c * c - a * a}<br>b = <b>${b} cm</b>`, { unit: 'cm' });
      const L = ri(5, 9), h = ri(3, L - 1) + 0.5 * ri(0, 1); const foot = r2(Math.sqrt(L * L - h * h));
      return num(`A ${L} m ladder leans against a wall. Its top reaches ${h} m up the wall. How far is the foot of the ladder from the wall? (Round to 2 d.p.)`, foot,
        `d² = ${L}² − ${h}² = ${r2(L * L - h * h)}<br>d = √${r2(L * L - h * h)} = <b>${foot} m</b>`, { unit: 'm', tol: 0.01 });
    },
    'Sec 2:Probability': d => {
      if (d === 0) { const r = ri(2, 9), b = ri(2, 9), g = ri(1, 6), t = r + b + g;
        return num(`A bag has ${r} red, ${b} blue and ${g} green balls. One ball is picked at random. What is the probability it is blue? (Give a fraction.)`, b / t, `P(blue) = ${b}/${t} = <b>${fr(b, t)}</b>`, { tol: 0.001 }); }
      if (d === 1) { const s = ri(3, 11); let n = 0; for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) if (i + j === s) n++;
        return num(`Two fair dice are thrown. What is the probability that the total is ${s}? (Give a fraction.)`, n / 36, `There are 36 equally likely outcomes; ${n} of them total ${s}.<br>P = ${n}/36 = <b>${fr(n, 36)}</b>`, { tol: 0.001 }); }
      const r = ri(3, 7), b = ri(2, 6), t = r + b, p = r * (r - 1) / (t * (t - 1));
      return num(`A box has ${r} red and ${b} blue pens. Two pens are taken out one after another without replacement. What is the probability both are red? (Give a fraction.)`, p,
        `P = ${r}/${t} × ${r - 1}/${t - 1} = ${r * (r - 1)}/${t * (t - 1)} = <b>${fr(r * (r - 1), t * (t - 1))}</b>`, { tol: 0.001 });
    },
    'Sec 2:Quadratic equations': d => {
      if (d === 0) { const r = ri(2, 15), k = ri(1, 4); return num(`Solve ${k === 1 ? '' : k}x² = ${k * r * r}. Give the positive solution.`, r, `x² = ${r * r}<br>x = ±${r}, so the positive solution is <b>${r}</b>`); }
      if (d === 1) { const p = ri(-8, 8), q = ri(-8, 8); if (p === q) return G['Sec 2:Quadratic equations'](1);
        const big = Math.max(p, q); return num(`Solve ${poly([1, -(p + q), p * q])} = 0. Give the larger solution.`, big,
          `Factorise: (${poly([1, -p])})(${poly([1, -q])}) = 0<br>x = ${p} or x = ${q}<br>Larger solution: <b>${big}</b>`); }
      const a = pick([2, 3]), n = ri(-5, 5) || 1, p = ri(-6, 6); // (a x - n)(x - p)
      if (gcd(n, a) !== 1 || n / a === p) return G['Sec 2:Quadratic equations'](2);
      const small = Math.min(n / a, p);
      return num(`Solve ${poly([a, -(a * p + n), n * p])} = 0. Give the smaller solution (a fraction is fine).`, small,
        `Factorise: (${poly([a, -n])})(${poly([1, -p])}) = 0<br>x = ${fr(n, a)} or x = ${p}<br>Smaller solution: <b>${small === p ? p : fr(n, a)}</b>`, { tol: 0.001 });
    },
  };
  const LEVELS = {
    'P6': ['Fractions', 'Percentage', 'Ratio', 'Speed', 'Algebra', 'Area and volume', 'Average'],
    'Sec 1': ['Integers', 'Linear equations', 'Algebraic expressions', 'Angles and polygons', 'Percentage change'],
    'Sec 2': ['Expansion and factorisation', 'Simultaneous equations', "Pythagoras' theorem", 'Probability', 'Quadratic equations'],
  };
  function make(level, topic, d) {
    const t = topic === 'Mixed' ? pick(LEVELS[level]) : topic;
    const q = G[`${level}:${t}`](d);
    return Object.assign(q, { level, topic: t, diff: d, id: Math.random().toString(36).slice(2) });
  }
  // parse a typed answer: 12, -3.5, 3/4, 1 1/2, 25%, $40
  function parse(s) {
    s = String(s).trim().replace(/[$,\s]+$/g, '').replace(/^\$/, '').replace(/−/g, '-').replace(/,/g, '');
    s = s.replace(/(cm³|cm²|cm|km\/h|km|min|m|°|ℓ)$/i, '').trim();
    let pct = false; if (s.endsWith('%')) { pct = true; s = s.slice(0, -1).trim(); }
    let v = NaN;
    let m;
    if ((m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/))) { const w = +m[1]; v = Math.abs(w) + (+m[2]) / (+m[3]); if (w < 0 || m[1].startsWith('-')) v = -v; }
    else if ((m = s.match(/^(-?\d*\.?\d+)\s*\/\s*(-?\d*\.?\d+)$/))) v = (+m[1]) / (+m[2]);
    else if (/^-?\d*\.?\d+$/.test(s)) v = +s;
    return v;
  }
  function check(q, input) {
    if (q.choices) return +input === q.answer;
    const v = parse(input); if (isNaN(v)) return false;
    const tol = q.tol != null ? q.tol : 1e-6;
    return Math.abs(v - q.answer) <= tol + 1e-9;
  }
  const answerText = q => q.choices ? q.choices[q.answer] : (Number.isInteger(q.answer) ? q.answer : r2(q.answer)) + (q.unit && q.unit !== '$' ? ' ' + q.unit : '');
  return { LEVELS, make, check, parse, answerText, G };
})();
if (typeof module !== 'undefined') module.exports = Quiz;
