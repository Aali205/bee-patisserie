import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import logo from './logo-layers.json';
import { comb, ar } from './content.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isRTL = () => document.documentElement.dir === 'rtl';
// site may live under a sub-path (e.g. GitHub Pages) — resolve every asset through the base
const BASE = import.meta.env.BASE_URL;
const asset = (p) => (/^(https?:|data:)/.test(p) ? p : BASE + p.replace(/^\//, ''));
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

let lang = 'en';
try { lang = localStorage.getItem('bee-lang') || 'en'; } catch { /* storage unavailable */ }
let products = [];

/* =========================================================
   Content protection — no selecting, copying, dragging or
   saving from the public site.
   ========================================================= */
function protectContent() {
  const block = (e) => e.preventDefault();
  ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'].forEach((ev) => document.addEventListener(ev, block));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 's', 'u', 'p'].includes(e.key.toLowerCase())) e.preventDefault();
  });
}

/* =========================================================
   i18n
   ========================================================= */
$$('[data-i18n], [data-i18n-html]').forEach((el) => (el.dataset.en = el.innerHTML));

function applyLang(l) {
  lang = l;
  const html = document.documentElement;
  html.lang = l;
  html.dir = l === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n], [data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18n || el.dataset.i18nHtml;
    el.innerHTML = l === 'ar' && ar[key] ? ar[key] : el.dataset.en;
  });
  renderCollection();
  try { localStorage.setItem('bee-lang', l); } catch { /* ignore */ }
}

/* =========================================================
   Dynamic markup: collection (from the admin API) + honeycomb
   ========================================================= */
async function loadProducts() {
  // live API first; static snapshot as fallback for static hosting
  for (const url of [asset('api/products'), asset('products.json')]) {
    try {
      const res = await fetch(url);
      if (res.ok && res.headers.get('content-type')?.includes('json')) {
        products = (await res.json()).filter((p) => p.featured && p.available);
        return;
      }
    } catch { /* try the next source */ }
  }
}

function renderCollection() {
  const pick = (v) => esc(v?.[lang] || v?.en || v?.ar || '');
  $('#colTrack').innerHTML = products
    .map((p, i) => {
      const price = p.price ? `<span class="card__price">${p.price.toLocaleString(lang === 'ar' ? 'ar-SY' : 'en-US')} ${lang === 'ar' ? 'ل.س' : 'SYP'}</span>` : '';
      return `<article class="card" data-cursor="taste">
        <div class="card__img"><img src="${esc(asset(p.image))}" alt="${pick(p.name)}" loading="lazy" draggable="false" /><span class="card__num">${String(i + 1).padStart(2, '0')}</span></div>
        <div class="card__meta"><span class="card__script">${pick(p.tagline)}</span><h3>${pick(p.name)}</h3><p>${pick(p.description)}</p>${price}</div>
      </article>`;
    })
    .join('');
}

function renderComb() {
  $('#combGrid').innerHTML = comb
    .map(
      (row) =>
        `<div class="comb__row">${row
          .map((n) => {
            if (n === '#honey') return `<div class="comb__cell comb__cell--honey"><img src="${asset('images/bee-mark.png')}" alt="" /></div>`;
            if (n === '#script') return `<div class="comb__cell comb__cell--dark"><span>Bee</span></div>`;
            return `<div class="comb__cell" data-cursor="taste"><img src="${asset(`images/${n}.webp`)}" alt="" loading="lazy" /></div>`;
          })
          .join('')}</div>`,
    )
    .join('');
}

/* =========================================================
   Text splitting
   ========================================================= */
function splitWords(el, cls = 'w') {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML =
    cls === 'w'
      ? words.map((w) => `<span class="w"><span class="wi">${w}</span></span>`).join(' ')
      : words.map((w) => `<span class="sw">${w}</span>`).join(' ');
  return $$(cls === 'w' ? '.wi' : '.sw', el);
}

/* =========================================================
   Smooth scroll
   ========================================================= */
const lenis = reduceMotion ? null : new Lenis({ lerp: 0.1 });
let velocity = 0;
if (lenis) {
  lenis.stop();
  lenis.on('scroll', (e) => {
    velocity = e.velocity;
    ScrollTrigger.update();
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* =========================================================
   INTRO — the real logo, assembled layer by layer
   ========================================================= */
const BEE_CX = 525;
const BEE_CY = 128;
const INTRO_PATH =
  'M -620 470 C -380 560 -260 120 -60 190 C 120 250 60 420 220 380 C 380 340 250 90 360 40 C 450 0 470 100 525 128';

function buildIntroLogo() {
  const box = $('#introLogo');
  const bee = document.createElement('div');
  bee.className = 'intro__bee';
  bee.style.transformOrigin = `${(BEE_CX / logo.w) * 100}% ${(BEE_CY / logo.h) * 100}%`;
  const parts = {};
  logo.layers.forEach((l) => {
    const d = document.createElement('div');
    d.className = 'L';
    Object.assign(d.style, {
      left: `${(l.x / logo.w) * 100}%`,
      top: `${(l.y / logo.h) * 100}%`,
      width: `${(l.w / logo.w) * 100}%`,
      height: `${(l.h / logo.h) * 100}%`,
    });
    d.innerHTML = `<img src="${asset(`images/logo/${l.name}.png`)}" alt="" draggable="false" />`;
    parts[l.name] = d;
    (/^(stripe|wings|antenna)/.test(l.name) ? bee : box).appendChild(d);
  });
  box.appendChild(bee);
  $('#introTrail').setAttribute('d', INTRO_PATH);
  $('#introTrailReveal').setAttribute('d', INTRO_PATH);
  return { box, bee, parts };
}

function runIntro() {
  const intro = $('#intro');
  const { box, bee, parts } = buildIntroLogo();
  const pick = (re) => Object.keys(parts).filter((k) => re.test(k)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((k) => parts[k]);
  const bees = pick(/^bee-/);
  const group = pick(/^group-/);
  const pat = pick(/^pat-/);
  const stripes = pick(/^stripe-/);

  const trail = $('#introTrail');
  const reveal = $('#introTrailReveal');
  const len = trail.getTotalLength();
  reveal.style.strokeDasharray = len;
  reveal.style.strokeDashoffset = len;

  gsap.set([...bees, ...group, ...pat], { opacity: 0 });
  gsap.set(parts.wings, { transformOrigin: '10% 95%' });
  const flutter = gsap.to(parts.wings, { scaleY: 0.4, skewX: -8, duration: 0.07, repeat: -1, yoyo: true, ease: 'sine.inOut' });

  const prog = { t: 0 };
  const place = () => {
    const s = box.clientWidth / logo.w;
    const p = trail.getPointAtLength(prog.t * len);
    const q = trail.getPointAtLength(Math.min(len, prog.t * len + 6));
    const dx = q.x - p.x;
    const flying = prog.t < 0.985;
    const facingRight = flying && dx > 0;
    const tilt = clamp((Math.atan2(q.y - p.y, Math.abs(dx) + 0.001) * 180) / Math.PI, -35, 35) * (facingRight ? 1 : -1);
    gsap.set(bee, {
      x: (p.x - BEE_CX) * s,
      y: (p.y - BEE_CY) * s,
      rotation: flying ? tilt : 0,
      scaleX: facingRight ? -1 : 1,
      scale: 0.55 + prog.t * 0.45,
    });
    reveal.style.strokeDashoffset = len * (1 - prog.t);
  };
  place();

  const tl = gsap.timeline({ onComplete: () => exitIntro(intro, box, flutter) });
  tl.from(stripes, { scale: 0, stagger: 0.07, duration: 0.45, ease: 'back.out(3)' }, 0.1)
    .from(parts.antenna, { scale: 0, transformOrigin: '100% 100%', duration: 0.4, ease: 'back.out(3)' }, 0.25)
    .to(prog, { t: 1, duration: 2.1, ease: 'power2.inOut', onUpdate: place }, 0.15)
    .add(() => flutter.timeScale(0.35), 2.05)
    .fromTo(bee, { scaleY: 0.82 }, { scaleY: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' }, 2.25)
    .fromTo(bees[0], { opacity: 0, yPercent: -180, rotation: -24 }, { opacity: 1, yPercent: 0, rotation: 0, duration: 0.8, ease: 'bounce.out' }, 1.85)
    .fromTo(bees.slice(1), { opacity: 0, yPercent: -140, scale: 0.4 }, { opacity: 1, yPercent: 0, scale: 1, duration: 0.7, stagger: 0.1, ease: 'back.out(2.4)' }, 2.05)
    .fromTo(group, { opacity: 0, x: (i) => (i - 2) * -40 }, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out', stagger: 0.03 }, 2.35)
    .fromTo(pat, { opacity: 0, yPercent: 90, rotation: 8 }, { opacity: 1, yPercent: 0, rotation: 0, duration: 0.8, stagger: 0.045, ease: 'expo.out' }, 2.4)
    .to(trail, { opacity: 0, duration: 0.6 }, 2.5)
    .fromTo('.intro__tag', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 2.8)
    .to({}, { duration: 0.55 });

  const skip = () => tl.progress() < 1 && tl.progress(1);
  intro.addEventListener('click', skip);
  addEventListener('keydown', skip, { once: true });
}

function exitIntro(intro, box, flutter) {
  const navLogo = $('#navLogo');
  const from = box.getBoundingClientRect();
  const to = navLogo.getBoundingClientRect();

  // lift the logo out of the overlay so the hex portal can't clip it
  const fly = document.createElement('div');
  Object.assign(fly.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, zIndex: 210, pointerEvents: 'none' });
  document.body.appendChild(fly);
  const holder = document.createElement('div');
  Object.assign(holder.style, { width: `${from.width}px`, height: `${from.height}px` });
  box.before(holder);
  box.style.width = '100%';
  fly.appendChild(box);

  const W = innerWidth;
  const H = innerHeight;
  const portal = { r: 0 };
  const setPortal = () => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(`${W / 2 + portal.r * Math.cos(a)}px ${H / 2 + portal.r * Math.sin(a)}px`);
    }
    intro.style.clipPath = `polygon(evenodd, 0 0, ${W}px 0, ${W}px ${H}px, 0 ${H}px, 0 0, ${pts.join(', ')}, ${pts[0]})`;
  };

  const tl = gsap.timeline({
    onComplete: () => {
      flutter.kill();
      fly.remove();
      intro.remove();
      document.body.classList.remove('is-loading');
      lenis?.start();
      startFlight();
    },
  });
  tl.to('.intro__tag, .intro__skip', { opacity: 0, y: -10, duration: 0.4 }, 0)
    .to(fly, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 1.15, ease: 'expo.inOut' }, 0.1)
    .to(portal, { r: Math.hypot(W, H) * 0.62, duration: 1.3, ease: 'expo.inOut', onUpdate: setPortal }, 0.15)
    .add(heroIn, 0.55)
    .to('#nav', { opacity: 1, duration: 0.6 }, 0.9)
    .set(navLogo, { opacity: 1 })
    .to(fly, { opacity: 0, duration: 0.2 });
}

function heroIn() {
  const words = splitWords($('.hero__title'));
  gsap.timeline()
    .from(words, { yPercent: 115, rotation: 4, duration: 1.2, stagger: 0.07, ease: 'expo.out' }, 0)
    .from('.hero .eyebrow', { opacity: 0, x: -20, duration: 0.8 }, 0.2)
    .from('.hero__script', { opacity: 0, y: 20, duration: 1 }, 0.5)
    .from('.hero__lede, .hero__ctas', { opacity: 0, y: 30, duration: 1, stagger: 0.1, ease: 'power3.out' }, 0.6)
    .from('.hero__arch', { clipPath: 'inset(100% 0 0 0 round 999px 999px 24px 24px)', duration: 1.4, ease: 'expo.inOut' }, 0)
    .from('.hero__arch img', { scale: 1.4, duration: 1.8, ease: 'expo.out' }, 0.2)
    .from('.hero__orb', { scale: 0, rotation: -30, duration: 1.2, stagger: 0.15, ease: 'back.out(1.6)' }, 0.5)
    .from('.hero__badge', { scale: 0, rotation: 180, duration: 1.2, ease: 'expo.out' }, 0.8)
    .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.2);
}

/* =========================================================
   THE BEE'S FLIGHT — signature scroll animation
   A dotted flight-path is woven through every section.
   The bee flies it as you scroll, banks into turns, does a
   barrel-roll and scatters pollen at every waypoint.
   ========================================================= */
const F = {
  el: $('#flight'),
  svg: $('#flightSvg'),
  path: $('#flightPath'),
  reveal: $('#flightReveal'),
  bee: $('#flightBee'),
  spin: $('.flight__spin'),
  wings: $('.flight__wings'),
  wingSpeed: 0,
  len: 0,
  samples: [],
  wpLens: [],
  cur: 0,
  x: 0,
  y: 0,
  facing: 1,
  lastWp: -1,
  started: false,
};

function catmullRom(points) {
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

function buildFlight() {
  const W = document.body.clientWidth;
  const H = document.body.scrollHeight;
  const vh = innerHeight;
  F.svg.setAttribute('width', W);
  F.svg.setAttribute('height', H);
  F.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const docY = (el) => el.getBoundingClientRect().top + scrollY;
  const fx = (f) => (isRTL() ? 1 - f : f) * W;
  const pts = [{ x: fx(0.6), y: vh * 0.52 }];
  const wpIdx = [];
  $$('[data-waypoint]').forEach((el) => {
    const top = docY(el);
    const h = el.offsetHeight;
    const f = parseFloat(el.dataset.waypoint);
    if (el.id === 'hero') return;
    if (el.id === 'collection') {
      // hug the edge while the gallery slides sideways
      pts.push({ x: fx(f), y: top + vh * 0.5 }, { x: fx(f), y: top + h - vh * 0.5 });
      wpIdx.push(pts.length - 2);
      return;
    }
    pts.push({ x: fx(f), y: top + h * 0.5 });
    wpIdx.push(pts.length - 1);
  });
  const land = $('#landing');
  pts.push({ x: fx(0.5) + (isRTL() ? -1 : 1) * land.offsetWidth * 0.36, y: Math.min(docY(land) - 10, H - vh * 0.48) });

  const d = catmullRom(pts);
  F.path.setAttribute('d', d);
  F.reveal.setAttribute('d', d);
  F.len = F.path.getTotalLength();
  F.reveal.style.strokeDasharray = `${F.len} ${F.len}`;

  // one pass: y-monotonic lookup table + nearest length for each waypoint
  F.samples = [];
  const best = wpIdx.map(() => ({ l: 0, d: Infinity }));
  let maxSeen = -Infinity;
  for (let l = 0; l <= F.len; l += 6) {
    const p = F.path.getPointAtLength(l);
    maxSeen = Math.max(maxSeen, p.y);
    F.samples.push({ l, y: maxSeen });
    wpIdx.forEach((i, k) => {
      const dist = (p.x - pts[i].x) ** 2 + (p.y - pts[i].y) ** 2;
      if (dist < best[k].d) best[k] = { l, d: dist };
    });
  }
  F.wpLens = best.map((b) => b.l);
  F.cur = Math.min(F.cur, F.len);
  F.lastWp = F.wpLens.filter((l) => F.cur >= l - 4).length - 1;
}

function lookupLen(y) {
  const s = F.samples;
  if (y <= s[0].y) return 0;
  let lo = 0;
  let hi = s.length - 1;
  if (y >= s[hi].y) return F.len;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid].y < y) lo = mid;
    else hi = mid;
  }
  const t = (y - s[lo].y) / (s[hi].y - s[lo].y || 1);
  return s[lo].l + (s[hi].l - s[lo].l) * t;
}

function pollen(x, y) {
  for (let i = 0; i < 9; i++) {
    const p = document.createElement('i');
    Object.assign(p.style, {
      position: 'absolute', left: `${x}px`, top: `${y}px`, width: '10px', height: '11px', margin: '-5px 0 0 -5px',
      background: i % 3 ? '#f19425' : '#22150d', clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)',
    });
    F.el.appendChild(p);
    const a = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
    const r = 40 + Math.random() * 60;
    gsap.fromTo(p, { scale: 0 }, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 1 + Math.random(), rotation: Math.random() * 360, opacity: 0, duration: 1.2, ease: 'expo.out', onComplete: () => p.remove() });
  }
}

function tickFlight() {
  const target = lookupLen(scrollY + innerHeight * 0.52);
  const delta = target - F.cur;
  if (Math.abs(delta) < 0.05) return; // idle: nothing to draw
  F.cur += delta * 0.1;
  const p = F.path.getPointAtLength(F.cur);
  const dx = p.x - F.x;
  const dy = p.y - F.y;
  if (Math.abs(dx) > 0.4) F.facing = dx > 0 ? -1 : 1; // artwork faces left
  const bank = clamp((Math.atan2(dy, Math.abs(dx) + 0.5) * 180) / Math.PI, -32, 32) * -F.facing * clamp(Math.hypot(dx, dy) / 6, 0, 1);
  F.x = p.x;
  F.y = p.y;
  F.bee.style.transform = `translate3d(${p.x}px,${p.y}px,0) rotate(${bank}deg) scaleX(${F.facing})`;
  F.reveal.style.strokeDashoffset = F.len - F.cur;

  // waypoint crossings → barrel roll + pollen burst
  const passed = F.wpLens.filter((l) => F.cur >= l - 4).length - 1;
  if (passed > F.lastWp) {
    gsap.fromTo(F.spin, { rotation: 0 }, { rotation: 360 * -F.facing, duration: 0.9, ease: 'power3.inOut' });
    pollen(p.x, p.y);
  }
  F.lastWp = passed;

  const wingSpeed = Math.abs(velocity) > 8 ? 0.04 : 0.09;
  if (wingSpeed !== F.wingSpeed) F.wings.style.animationDuration = `${(F.wingSpeed = wingSpeed)}s`;
}

function startFlight() {
  if (reduceMotion) return;
  buildFlight();
  F.cur = lookupLen(scrollY + innerHeight * 0.52);
  const p = F.path.getPointAtLength(F.cur);
  F.x = p.x;
  F.y = p.y;
  F.bee.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
  gsap.fromTo(F.spin, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2)' });
  F.lastWp = F.wpLens.filter((l) => F.cur >= l - 4).length - 1;
  F.started = true;
  gsap.ticker.add(tickFlight);
}

/* =========================================================
   Honey drips that stretch with scroll speed
   ========================================================= */
const drips = [];
function buildDrips() {
  $$('[data-drip]').forEach((svg, k) => {
    let seed = 7 + k * 13;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    let html = `<path d="M0 0 H1440 V22 ${Array.from({ length: 12 }, (_, i) => `Q ${i * 120 + 60} ${18 + rnd() * 16} ${(i + 1) * 120} 22`).join(' ')} V0 Z" />`;
    for (let i = 0; i < 26; i++) {
      const w = 6 + rnd() * 22;
      const x = rnd() * 1420;
      const h = 20 + rnd() * 80;
      html += `<path class="d" d="M${x} 10 h${w} v${h} a${w / 2} ${w / 2} 0 0 1 -${w} 0 Z" />`;
    }
    svg.innerHTML = html;
    drips.push(...$$('.d', svg).map((el) => ({ el, k: 0.6 + rnd() * 0.9, s: 1 })));
  });
}
function tickDrips() {
  const target = 1 + clamp(Math.abs(velocity) * 0.05, 0, 1.3);
  drips.forEach((d) => {
    const next = d.s + (1 + (target - 1) * d.k - d.s) * 0.08;
    if (Math.abs(next - d.s) < 0.001) return;
    d.s = next;
    d.el.style.transform = `scaleY(${next})`;
  });
}

/* =========================================================
   Scroll-driven sections
   ========================================================= */
let dynamicTriggers = [];

function buildScrollEffects(animate) {
  dynamicTriggers.forEach((t) => t.kill());
  dynamicTriggers = [];

  // headings (hero title is revealed by the intro)
  $$('.split').forEach((el) => {
    const words = splitWords(el);
    if (!animate || el.classList.contains('hero__title')) return;
    dynamicTriggers.push(gsap.from(words, { yPercent: 115, rotation: 3, duration: 1.1, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%' } }).scrollTrigger);
  });

  // story: words ignite as you read
  dynamicTriggers.push(gsap.to(splitWords($('#storyBig'), 'sw'), { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '#storyBig', start: 'top 78%', end: 'bottom 45%', scrub: true } }).scrollTrigger);

  // collection: sticky horizontal gallery
  const col = $('#collection');
  const track = $('#colTrack');
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const size = () => (col.style.height = `${dist() + innerHeight}px`);
  size();
  const bar = $('#colProgress');
  dynamicTriggers.push(
    gsap.to(track, {
      x: () => (isRTL() ? dist() : -dist()),
      ease: 'none',
      scrollTrigger: { trigger: col, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true, onUpdate: (s) => (bar.style.transform = `scaleX(${s.progress})`), onRefresh: size },
    }).scrollTrigger,
    gsap.fromTo('.card img', { scale: 1.35 }, { scale: 1.1, ease: 'none', scrollTrigger: { trigger: col, start: 'top bottom', end: 'bottom bottom', scrub: true } }).scrollTrigger,
  );
}

function buildStaticEffects() {
  $$('.hero [data-speed]').forEach((el) => {
    gsap.to(el, { yPercent: parseFloat(el.dataset.speed) * 100, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  $$('.morning [data-speed]').forEach((el) => {
    const s = parseFloat(el.dataset.speed) * 100;
    gsap.fromTo(el, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  $$('.eyebrow__line').forEach((l) => gsap.from(l, { scaleX: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: l, start: 'top 90%' } }));

  $$('.pillar').forEach((p, i) => {
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 85%' } })
      .from(p.querySelector('.hex'), { scale: 0, rotation: -120, duration: 1.2, ease: 'expo.out', delay: i * 0.12 })
      .from(p.querySelectorAll('h3, p, .pillar__num'), { opacity: 0, y: 24, stagger: 0.08, duration: 0.8 }, '-=0.8');
  });

  $$('.morning__img').forEach((m) => gsap.from(m, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: m, start: 'top 85%' } }));

  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const suf = el.dataset.suffix || '';
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => (el.textContent = o.v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf),
    });
  });

  gsap.from('.occ-list li', { opacity: 0, y: 40, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.occ-list', start: 'top 85%' } });

  // honeycomb assembles from a scattered swarm
  gsap.fromTo(
    '.comb__cell',
    { x: () => gsap.utils.random(-innerWidth * 0.5, innerWidth * 0.5), y: () => gsap.utils.random(200, 600), rotation: () => gsap.utils.random(-180, 180), scale: 0.3, opacity: 0 },
    { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, ease: 'power3.out', scrollTrigger: { trigger: '#combGrid', start: 'top 95%', end: 'center 60%', scrub: 0.8 } },
  );

  gsap.from('.branch', { opacity: 0, y: 60, stagger: 0.12, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.branches', start: 'top 85%' } });
  gsap.from('.footer__mark', { scale: 0.85, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
}

/* =========================================================
   Marquee — direction and speed follow the scroll,
   paused while off screen
   ========================================================= */
function buildMarquee() {
  const track = $('.marquee__track');
  track.innerHTML += track.innerHTML;
  let x = 0;
  let dir = -1;
  let half = track.scrollWidth / 2;
  const tick = () => {
    if (velocity) dir = velocity > 0 ? -1 : 1;
    x += dir * (0.6 + Math.abs(velocity) * 0.35);
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0) skewX(${clamp(-velocity * 0.4, -12, 12)}deg)`;
  };
  new IntersectionObserver(([e]) => {
    half = track.scrollWidth / 2;
    gsap.ticker[e.isIntersecting ? 'add' : 'remove'](tick);
  }).observe(track);
}

/* =========================================================
   Cursor — the dot is pinned to the pointer (zero lag);
   only the ring eases, and the loop sleeps when settled.
   ========================================================= */
function buildPointer() {
  if (!finePointer) return;
  const cursor = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const float = $('#occFloat');
  const floatImg = float.querySelector('img');
  let mx = -100;
  let my = -100;
  let rx = mx;
  let ry = my;
  let fx = mx;
  let fy = my;
  let floatOn = false;
  let running = false;

  const follow = () => {
    rx += (mx - rx) * 0.35;
    ry += (my - ry) * 0.35;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
    if (floatOn) {
      fx += (mx - fx) * 0.2;
      fy += (my - fy) * 0.2;
      float.style.transform = `translate3d(${fx - 130}px,${fy - 116}px,0) rotate(${clamp((mx - fx) * 0.1, -14, 14)}deg)`;
    }
    if (Math.abs(mx - rx) + Math.abs(my - ry) < 0.2 && (!floatOn || Math.abs(mx - fx) + Math.abs(my - fy) < 0.2)) {
      gsap.ticker.remove(follow);
      running = false;
    }
  };
  const wake = () => {
    if (!running) {
      running = true;
      gsap.ticker.add(follow);
    }
  };

  addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
    wake();
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const taste = !!e.target.closest('[data-cursor="taste"]');
    cursor.classList.toggle('is-taste', taste);
    cursor.classList.toggle('is-link', !taste && !!e.target.closest('a, button, .occ-list li'));
  });

  const showFloat = (src) => {
    floatImg.src = src;
    if (!floatOn) { fx = mx; fy = my; }
    floatOn = true;
    float.classList.add('is-on');
    wake();
  };
  const hideFloat = () => {
    floatOn = false;
    float.classList.remove('is-on');
  };
  $$('#occList li').forEach((li) => {
    li.addEventListener('pointerenter', () => showFloat(asset(li.dataset.img)));
    li.addEventListener('pointerleave', hideFloat);
  });
  // scrolling moves the list under a still pointer — re-check what's under it
  addEventListener('scroll', () => {
    if (!floatOn) return;
    const li = document.elementFromPoint(mx, my)?.closest('#occList li');
    if (li) showFloat(asset(li.dataset.img));
    else hideFloat();
  }, { passive: true });

  $$('.magnetic').forEach((b) => {
    const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* =========================================================
   Nav, menu, anchors, language
   ========================================================= */
function buildNav() {
  const nav = $('#nav');
  let last = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > last && y > 400 && !document.body.classList.contains('menu-open'));
    last = y;
  }, { passive: true });

  $('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      document.body.classList.remove('menu-open');
      if (lenis) lenis.scrollTo(target, { duration: 1.8 });
      else if (target === 0) scrollTo(0, 0);
      else target.scrollIntoView();
    }),
  );

  $('#langToggle').addEventListener('click', () => {
    gsap.to('main, .footer, .nav__links', {
      opacity: 0, duration: 0.35,
      onComplete: () => {
        applyLang(lang === 'en' ? 'ar' : 'en');
        buildScrollEffects(false);
        ScrollTrigger.refresh();
        gsap.to('main, .footer, .nav__links', { opacity: 1, duration: 0.5 });
      },
    });
  });
}

let rebuildTimer;
function refreshLayout() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    ScrollTrigger.refresh();
    if (F.started) buildFlight();
  }, 150);
}

/* =========================================================
   Boot
   ========================================================= */
async function boot() {
  protectContent();
  $('#year').textContent = new Date().getFullYear();
  await loadProducts();
  applyLang(lang);
  renderComb();
  buildDrips();
  gsap.ticker.add(tickDrips);
  buildMarquee();
  buildScrollEffects(true);
  buildStaticEffects();
  buildPointer();
  buildNav();

  new ResizeObserver(refreshLayout).observe($('main'));
  addEventListener('load', refreshLayout);

  if (reduceMotion) {
    $('#intro').remove();
    document.body.classList.remove('is-loading');
    return;
  }
  gsap.set('#nav, #navLogo', { opacity: 0 });
  const layers = logo.layers.map((l) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = asset(`images/logo/${l.name}.png`); }));
  await Promise.all([document.fonts.ready, ...layers]);
  runIntro();
}
boot();
