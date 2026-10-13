// Reveal elements as they scroll into view
const items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => io.observe(el));
} else {
  items.forEach((el) => el.classList.add('in'));
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
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
