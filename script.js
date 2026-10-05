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

// Roller coaster train (3 cars) rides the hero track as you scroll
(() => {
  const path = document.getElementById('trackMain');
  const rider = document.querySelector('.rider');
  const first = rider && rider.querySelector('.cart');
  const hero = document.querySelector('.hero');
  if (!path || !first) return;
  const CARS = 3, SAMPLES = 400;
  const VB_W = 1440, VB_H = 320, CW = 84, WHEEL_BOTTOM = 39;
  const total = path.getTotalLength();
  const carts = [first];
  for (let i = 1; i < CARS; i++) {
    const c = first.cloneNode(true);
    rider.appendChild(c);
    carts.push(c);
  }
  carts.forEach((c) => { c.style.transformOrigin = `${CW / 2}px ${WHEEL_BOTTOM}px`; });

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

  const update = () => {
    if (rider.clientWidth !== w || rider.clientHeight !== h) measure();
    const scale = Math.min(Math.max(w / 1000, 0.5), 1);
    const spacing = CW * scale * 1.1;
    const L = cum[SAMPLES];
    const p = Math.min(Math.max(window.scrollY / (hero.offsetHeight * 0.85), 0), 1);
    const lead = p * (L + (CARS - 1) * spacing);
    carts.forEach((cart, i) => {
      const s = lead - i * spacing;
      const a = at(s), b = at(s + 4), z = at(s - 4);
      const angle = Math.atan2(b.y - z.y, b.x - z.x) * 180 / Math.PI;
      cart.style.transform =
        `translate(${a.x - CW / 2}px, ${a.y - WHEEL_BOTTOM}px) rotate(${angle}deg) scale(${scale})`;
    });
  };
  measure();
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
})();
