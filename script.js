const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Little coaster track under headings marked data-track: two rails from one
// curve (the second one shifted down) plus a glint that rides on top
const MINI_TRACK = 'M2,16 C30,16 45,5 78,5 C108,5 122,14 158,9';
document.querySelectorAll('h2[data-track]').forEach((h) => {
  h.insertAdjacentHTML('afterend',
    '<svg class="mini-track reveal d2" viewBox="0 0 160 22" aria-hidden="true">' +
    [['mt-line', ''], ['mt-line mt-line-2', ' transform="translate(0 4)"'], ['mt-glint', '']]
      .map(([cls, extra]) => `<path class="${cls}" pathLength="1" d="${MINI_TRACK}"${extra}/>`).join('') +
    '</svg>');
});

// Section titles rise word by word from behind a mask when they're revealed
if (!REDUCED) {
  document.querySelectorAll('main h2').forEach((h) => {
    h.classList.add('split-title');
    h.innerHTML = h.textContent.trim().split(/\s+/)
      .map((word, i) => `<span class="w"><span style="--i:${i}">${word}</span></span>`).join(' ');
  });
}

// Icon strokes draw themselves in: normalize every shape to length 1
document.querySelectorAll('.icon').forEach((icon) => {
  icon.querySelectorAll('svg > *').forEach((el) => el.setAttribute('pathLength', '1'));
  icon.classList.add('drawable');
});

// Reveal elements as they scroll into view; cards hand hover back to their own
// quick transitions once the entrance has played out
const reveal = (el) => {
  el.classList.add('in');
  if (el.classList.contains('card')) setTimeout(() => el.classList.add('settled'), 1300);
};
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        reveal(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));

  // Pause CSS loops in sections that are off screen
  const sections = document.querySelectorAll('main > section');
  const live = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('paused', !e.isIntersecting));
  });
  sections.forEach((el) => live.observe(el));
} else {
  items.forEach(reveal);
}

// Cards: a soft light follows the pointer and the card leans slightly toward it
if (!REDUCED && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.card').forEach((card) => {
    card.classList.add('tilt');
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${x * 100}%`);
      card.style.setProperty('--my', `${y * 100}%`);
      card.style.setProperty('--rx', `${(0.5 - y) * 5}deg`);
      card.style.setProperty('--ry', `${(x - 0.5) * 5}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

// Nav background once scrolled
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

document.getElementById('year').textContent = new Date().getFullYear();

// Logo goes back to the very top
document.querySelector('.brand').addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', location.pathname + location.search);
});

// Roller coaster train (3 cars) rides the hero track on a loop; scrolling speeds it up
(() => {
  const path = document.getElementById('trackMain');
  const rider = document.querySelector('.rider');
  const nose = rider && rider.querySelector('.cart-lead');
  const car = rider && rider.querySelector('.cart:not(.cart-lead)');
  if (!path || !nose || !car) return;
  const CARS = 3, SAMPLES = 400;
  const VB_W = 1440, VB_H = 320, CW = 84, BODY_BOTTOM = 28;
  // Bullet-train nose up front, plain cars behind it
  const carts = [nose, car];
  for (let i = 2; i < CARS; i++) {
    const c = car.cloneNode(true);
    rider.appendChild(c);
    carts.push(c);
  }
  carts.forEach((c) => { c.style.transformOrigin = `${CW / 2}px ${BODY_BOTTOM}px`; });

  // Sample the track in real pixels so spacing is measured along the curve
  let pts = [], cum = [], w = 0, h = 0;
  const measure = () => {
    w = rider.clientWidth; h = rider.clientHeight;
    pts = []; cum = [0];
    for (let k = 0; k <= SAMPLES; k++) {
      const pt = path.getPointAtLength(k / SAMPLES * total);
      pts.push({ x: pt.x / VB_W * w, y: pt.y / VB_H * h });
      if (k) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    }
  };
  // Phones get a gentler final climb (data-mobile); swap the shape when crossing the breakpoint
  const lines = document.querySelectorAll('.track-line');
  lines.forEach((l) => { l.dataset.desktop = l.getAttribute('d'); });
  const narrow = matchMedia('(max-width: 640px)');
  let total = 0;
  const applyShape = () => {
    lines.forEach((l) => l.setAttribute('d', narrow.matches ? l.dataset.mobile : l.dataset.desktop));
    total = path.getTotalLength();
    measure();
  };
  narrow.addEventListener('change', applyShape);

  // Point at distance s (px) along the track; extends in a straight line past the ends
  const at = (s) => {
    const L = cum[SAMPLES];
    if (s <= 0) return { x: pts[0].x + s, y: pts[0].y };
    if (s >= L) return { x: pts[SAMPLES].x + (s - L), y: pts[SAMPLES].y };
    let lo = 0, hi = SAMPLES;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; (cum[m] <= s ? lo = m : hi = m); }
    const f = (s - cum[lo]) / (cum[hi] - cum[lo]);
    return { x: pts[lo].x + (pts[hi].x - pts[lo].x) * f, y: pts[lo].y + (pts[hi].y - pts[lo].y) * f };
  };

  // Constant slow ride that loops; scrolling gives it a boost that eases off
  const baseSpeed = () => (REDUCED ? 0 : narrow.matches ? 200 : 275); // px/s
  const MAX_BOOST = 1690;
  let lead = 0, boost = 0, lastY = window.scrollY, lastT = 0, scale = 1, spacing = 0;

  const draw = () => {
    carts.forEach((cart, i) => {
      const s = lead - i * spacing;
      const a = at(s), b = at(s + 4), z = at(s - 4);
      const angle = Math.atan2(b.y - z.y, b.x - z.x) * 180 / Math.PI;
      cart.style.transform =
        `translate(${a.x - CW / 2}px, ${a.y - BODY_BOTTOM}px) rotate(${angle}deg) scale(${scale})`;
    });
  };

  const frame = (t) => {
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0;
    lastT = t;
    if (rider.clientWidth !== w || rider.clientHeight !== h) measure();
    scale = Math.min(Math.max(w / 1000, 0.5), 1);
    spacing = CW * scale * 1.1;
    const lap = cum[SAMPLES] + CARS * spacing + CW * scale;
    lead = (lead + (baseSpeed() + boost) * dt) % lap;
    boost *= Math.exp(-2.5 * dt);
    draw();
    requestAnimationFrame(frame);
  };

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    // Narrow screens have a shorter track and longer scrolls, so tone the boost down
    const k = Math.min(w / 1000, 1);
    boost = Math.min(boost + Math.abs(y - lastY) * 7.5 * k, MAX_BOOST * k);
    lastY = y;
  }, { passive: true });

  applyShape();
  requestAnimationFrame(frame);
})();

// Process: a track links the three steps and fills in as you scroll through
// the section; a little train rides its tip and each number pops as it passes
(() => {
  const wrap = document.querySelector('.steps-wrap');
  const svg = wrap && wrap.querySelector('.steps-track');
  const cart = wrap && wrap.querySelector('.steps-cart');
  if (!svg || !cart) return;
  const base = svg.querySelector('.st-base');
  const fill = svg.querySelector('.st-fill');
  const nums = [...wrap.querySelectorAll('.num')];
  const CW = 84, BODY_BOTTOM = 26, SCALE = 0.6;
  cart.style.transformOrigin = `${CW / 2}px ${BODY_BOTTOM}px`;
  let total = 0, stations = [], shown = REDUCED ? 1 : 0, visible = false, running = false, lastT = 0;

  // Centers measured with offsets so the reveal's translate doesn't skew them
  const build = () => {
    const pts = nums.map((n) => ({
      x: n.parentElement.offsetLeft + n.offsetLeft + n.offsetWidth / 2,
      y: n.parentElement.offsetTop + n.offsetTop + n.offsetHeight / 2,
    }));
    let d = `M${pts[0].x},${pts[0].y}`;
    const prefixes = [d];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y;
      // Same row: a little hill between stations; otherwise drop down smoothly
      d += Math.abs(dy) < 10
        ? ` C${a.x + dx * 0.35},${a.y - 38} ${b.x - dx * 0.35},${b.y - 38} ${b.x},${b.y}`
        : ` C${a.x},${a.y + dy * 0.6} ${b.x},${b.y - dy * 0.6} ${b.x},${b.y}`;
      prefixes.push(d);
    }
    base.setAttribute('d', d);
    fill.setAttribute('d', d);
    total = fill.getTotalLength();
    stations = prefixes.map((p, i) => {
      if (!i) return 0;
      base.setAttribute('d', p);
      return base.getTotalLength();
    });
    base.setAttribute('d', d);
    fill.style.strokeDasharray = `${total} ${total}`;
    draw();
  };

  const draw = () => {
    const s = shown * total;
    fill.style.strokeDashoffset = `${total - s}`;
    nums.forEach((n, i) => n.classList.toggle('hit', s >= stations[i] - 2 && (shown > 0.001 || REDUCED)));
    if (REDUCED) return;
    const p = fill.getPointAtLength(s);
    const a = fill.getPointAtLength(Math.min(s + 3, total)), b = fill.getPointAtLength(Math.max(s - 3, 0));
    const angle = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
    cart.style.transform =
      `translate(${p.x - CW / 2}px, ${p.y - BODY_BOTTOM}px) rotate(${angle}deg) scale(${SCALE})`;
    cart.classList.toggle('on', shown > 0.01 && shown < 0.995);
  };

  // 0 when the steps enter the lower part of the screen, 1 when they've
  // risen past the middle; the train eases toward that target
  const target = () => {
    const r = wrap.getBoundingClientRect(), vh = innerHeight;
    const start = vh * 0.85, end = vh * 0.4 - r.height;
    return Math.min(Math.max((start - r.top) / (start - end), 0), 1);
  };

  const frame = (t) => {
    if (!visible) { running = false; lastT = 0; return; }
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0;
    lastT = t;
    const goal = target();
    if (Math.abs(goal - shown) > 0.0005) {
      shown += (goal - shown) * Math.min(1, dt * 5);
      draw();
    }
    requestAnimationFrame(frame);
  };

  new ResizeObserver(build).observe(wrap);
  if (REDUCED) return;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
  }, { rootMargin: '100px 0px' }).observe(wrap);
})();
