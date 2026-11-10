// field.js - the home-01 hex column field (Basalt port, src/scripts/hero-fields.js columns()) in plain JS:
// requestAnimationFrame, transforms only, no library. Same constants and maths: idle wave, intro rise, cursor lift.
// Reduced motion = one still frame. Hidden tab = no frames. Only the columns in view move.
// Touch: idle wave only. The reference's wandering "cursor" is dropped on purpose: its bright column would pass under
// the text, and a phone has no room to scrim it away without hiding the field.
const LIFT = 90, RADIUS = 170, R2 = 2 * RADIUS * RADIUS, W = 1440, H = 760, INTRO = -140, OFF = -9999;
const field = document.querySelector('.hero_columns');

if (field) {
  const grays = Array.from({ length: 256 }, (_, i) => `rgb(${i},${i},${Math.min(255, i + 2)})`);
  const hexes = [...field.querySelectorAll('[data-hex]')].map((el) => ({ el, x: +el.getAttribute('x'), y: +el.getAttribute('y'), seed: Math.random(), g: -1 }));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const mouse = { x: OFF, y: OFF }, target = { x: OFF, y: OFF };
  let live = hexes, raf = 0, t0 = 0, pausedAt = 0;

  // field drawn "xMidYMax slice" in a 1440 x 760 box: s = scale, client point -> SVG units
  const scale = (r) => Math.max(r.width / W, r.height / H);
  const toSvg = (cx, cy) => { const r = field.getBoundingClientRect(), s = scale(r); return { x: (cx - r.left - (r.width - W * s) / 2) / s, y: (cy - r.top - (r.height - H * s)) / s }; };
  // only the columns inside the visible slice move (a phone sees about a third of the field)
  const cull = () => { const r = field.getBoundingClientRect(), half = r.width / scale(r) / 2 + 40; live = hexes.filter((h) => Math.abs(h.x - W / 2) < half); };

  const draw = (t, intro) => {
    mouse.x += (target.x - mouse.x) * 0.08; mouse.y += (target.y - mouse.y) * 0.08;
    for (const h of live) {
      const dx = h.x - mouse.x, dy = h.y - mouse.y, bump = Math.exp(-(dx * dx + dy * dy) / R2);
      const lift = 14 * (Math.sin(h.x * 0.009 + t * 0.5) + Math.cos(h.y * 0.016 - t * 0.35) + Math.sin((h.x + h.y) * 0.005 + t * 0.25)) + h.seed * 8 + bump * LIFT + intro;
      h.el.style.transform = `translateY(${(-lift).toFixed(1)}px)`;
      const g = Math.max(10, Math.min(220, (20 + (lift + 40) * 0.32 + bump * 110) | 0));
      if (g !== h.g) { h.g = g; h.el.style.color = grays[g]; }
    }
  };

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!t0) t0 = now;
    const t = (now - t0) / 1000, p = Math.min(1, Math.max(0, (t - 0.15) / 2.2));
    draw(t, p >= 1 ? 0 : INTRO * Math.pow(2, -10 * p)); // expo.out over 2.2 s after 0.15 s
  };

  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const start = () => {
    if (raf || reduce.matches || document.hidden) return;
    if (pausedAt && t0) { const d = performance.now() - pausedAt; t0 += d; } // resume where the wave stopped
    pausedAt = 0; cull(); raf = requestAnimationFrame(frame);
  };
  const still = () => { stop(); t0 = 0; mouse.x = mouse.y = target.x = target.y = OFF; live = hexes; draw(0, 0); };

  addEventListener('pointermove', (e) => { if (raf && fine.matches) { const p = toSvg(e.clientX, e.clientY); target.x = p.x; target.y = p.y; } }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (fine.matches) target.x = target.y = OFF; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (raf) { stop(); pausedAt = performance.now(); } } else start(); });
  reduce.addEventListener('change', () => (reduce.matches ? still() : start()));
  addEventListener('resize', () => { if (raf) cull(); });

  if (reduce.matches) still();
  else { cull(); draw(0, INTRO); start(); }
  field.classList.add('on'); // the first frame is drawn: show the field (site.css hides it under .js until now)
}
