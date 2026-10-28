// The season's weather behind the home page hero (src/components/HeroSeason.tsx),
// drawn on a canvas at the screen's full sharpness (up to 2× pixel density).
//
// Every particle has a depth: far ones are small, faint and slow and
// drift less in the wind; near ones are big, fast and move more, and
// the very nearest are softly out of focus, so the weather has depth
// instead of sitting flat on the page. A light breeze comes and goes,
// with a gust now and then that pushes everything sideways.
//
// - Winter: soft snow, with real snow-crystal photos as the nearer flakes,
//   turning slowly.
// - Spring: blossom petals and a few whole blossoms, fluttering.
// - Summer: rain streaks slanted by the wind, splashing at the bottom.
// - Autumn: leaves swinging side to side like a pendulum as they fall.
//
// Petals, leaves and crystals tumble in 3D: each turns about an axis in
// its own plane, so it narrows to an edge and shows its slightly darker
// back. The photos are in public/seasons/ (160 px, a few KB each), and
// only the current season's are loaded. The animation pauses while the
// hero is scrolled out of view or the tab is hidden.

import { asset } from "./asset";

export type Season = "winter" | "spring" | "summer" | "autumn";

type Range = [number, number];

type Look = {
  sprites: string[]; // photos in public/seasons/
  density: number; // particles per million px² of hero
  size: Range; // CSS px, far → near
  fall: Range; // px/s, far → near
  sway: Range; // px side to side, far → near
  swayHz: Range;
  spin: Range; // rad/s, either direction
  flip: Range; // 3D tumble, rad/s
  wind: number; // how much the breeze moves it
  breeze: number; // steady breeze for the season, px/s
  back: number; // brightness of the back when it tumbles over (1 = same as the front)
};

const numbered = (name: string, n: number) => Array.from({ length: n }, (_, i) => `/seasons/${name}-${i + 1}.webp`);

const LOOKS: Record<Season, Look> = {
  winter: { sprites: numbered("flake", 6), density: 240, size: [2.2, 9], fall: [18, 60], sway: [6, 22], swayHz: [0.25, 0.6], spin: [0.15, 0.5], flip: [0.3, 0.9], wind: 1, breeze: 6, back: 1 },
  spring: { sprites: numbered("petal", 10), density: 60, size: [16, 38], fall: [22, 55], sway: [12, 40], swayHz: [0.2, 0.5], spin: [0.4, 1.2], flip: [1.5, 4], wind: 1.3, breeze: 8, back: 0.85 },
  summer: { sprites: [], density: 340, size: [12, 38], fall: [520, 1100], sway: [0, 0], swayHz: [0, 0], spin: [0, 0], flip: [0, 0], wind: 3, breeze: 25, back: 1 },
  autumn: { sprites: numbered("leaf", 6), density: 50, size: [26, 62], fall: [30, 85], sway: [18, 60], swayHz: [0.15, 0.35], spin: [0.3, 1], flip: [1, 3], wind: 1.1, breeze: 10, back: 0.72 },
};

// Share of winter's flakes drawn as crystal photos (the rest are soft dots).
const CRYSTAL_SHARE = 0.16;
const CRYSTAL_SIZE: Range = [20, 48];
// Sizes grow with depth a little faster than linearly, so there are
// more small, far particles than big, near ones.
const SIZE_CURVE = 1.4;
// Nearest particles at or above this depth are drawn out of focus.
const BLUR_DEPTH = 0.9;
const WHOLE_BLOSSOMS = new Set(["/seasons/petal-8.webp", "/seasons/petal-10.webp"]);

const lerp = ([a, b]: Range, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Particle = {
  x: number;
  y: number;
  z: number; // depth: 0 far … 1 near
  size: number;
  fall: number;
  sway: number;
  swayHz: number;
  phase: number;
  rot: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  tilt: number; // direction of the 3D tumble axis
  look: number; // which picture (index into variants), -1 = soft snow dot
  alpha: number;
  blur: boolean;
};

type Splash = { x: number; y: number; vx: number; vy: number; age: number; life: number; ring: boolean; size: number };

// Each photo pre-drawn four ways: front, back (darker by `back`; ice
// stays as bright), and both out of focus.
function variants(img: HTMLImageElement, backShade: number): HTMLCanvasElement[] {
  const make = (back: boolean, blur: number) => {
    const pad = blur * 3;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth + pad * 2;
    c.height = img.naturalHeight + pad * 2;
    const g = c.getContext("2d")!;
    const filter = [blur ? `blur(${blur}px)` : "", back && backShade < 1 ? `brightness(${backShade}) saturate(0.9)` : ""].filter(Boolean).join(" ");
    if (filter) g.filter = filter; // ignored by browsers without canvas filters: still drawn, just sharp
    g.drawImage(img, pad, pad);
    return c;
  };
  return [make(false, 0), make(true, 0), make(false, 6), make(true, 6)];
}

function softDot(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.75)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

// A rain streak: clear at the tail, brightest at the head.
function streak(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(255,255,255,0.9)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = asset(src);
  return img.decode().then(() => img);
}

// Starts the weather on `canvas`; returns a function that stops it.
export function startWeather(canvas: HTMLCanvasElement, season: Season): () => void {
  const look = LOOKS[season];
  const ctx = canvas.getContext("2d");
  let stopped = false;
  let raf = 0;
  let cleanup = () => {};
  if (!ctx) return () => {};

  Promise.all(look.sprites.map(loadImage))
    .then((images) => {
      if (stopped) return;
      cleanup = run(ctx, images.map((img) => variants(img, look.back)));
      canvas.style.opacity = "1";
    })
    .catch(() => {}); // a photo that won't load just means no weather

  function run(ctx: CanvasRenderingContext2D, pictures: HTMLCanvasElement[][]) {
    const dot = softDot();
    const rainStreak = streak();
    const isRain = season === "summer";
    const parts: Particle[] = [];
    const splashes: Splash[] = [];
    let W = 0;
    let H = 0;
    let dpr = 1;
    let t = 0;
    let last = performance.now();
    let gust = 0;
    let gustTarget = 0;
    let gustEnd = 0;
    let nextGust = rand(4, 9);
    let visible = true;

    function make(): Particle {
      const crystal = season === "winter" && Math.random() < CRYSTAL_SHARE;
      // Crystals are only ever mid-to-near, where their detail can be seen.
      const z = crystal ? rand(0.5, 1) : Math.random();
      const pick = pictures.length ? Math.floor(Math.random() * pictures.length) : -1;
      const p: Particle = {
        x: 0,
        y: 0,
        z,
        size: lerp(crystal ? CRYSTAL_SIZE : look.size, z ** SIZE_CURVE),
        fall: lerp(look.fall, z) * rand(0.85, 1.15),
        sway: lerp(look.sway, z) * rand(0.7, 1.2),
        swayHz: rand(look.swayHz[0], look.swayHz[1]),
        phase: rand(0, Math.PI * 2),
        rot: rand(0, Math.PI * 2),
        spin: rand(look.spin[0], look.spin[1]) * (Math.random() < 0.5 ? -1 : 1),
        flip: rand(0, Math.PI * 2),
        flipSpeed: rand(look.flip[0], look.flip[1]),
        tilt: rand(0, Math.PI),
        look: season === "winter" ? (crystal ? pick : -1) : pick,
        alpha: isRain ? lerp([0.16, 0.5], z) : lerp([0.55, 1], z),
        blur: z >= BLUR_DEPTH,
      };
      // Whole blossoms are a little bigger than single petals.
      if (season === "spring" && WHOLE_BLOSSOMS.has(look.sprites[p.look])) p.size *= 1.25;
      // Out-of-focus near snow dots are bigger and softer, like bokeh.
      if (season === "winter" && p.look === -1 && p.blur) {
        p.size *= 1.6;
        p.alpha *= 0.6;
      }
      return p;
    }

    function place(p: Particle, anywhere: boolean) {
      const margin = p.size + 80;
      p.x = rand(-margin, W + margin);
      p.y = anywhere ? rand(-H * 0.1, H) : -p.size - (isRain ? rand(0, H * 0.5) : rand(0, 40));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const want = Math.round((look.density * W * H) / 1e6);
      while (parts.length < want) {
        const p = make();
        place(p, true);
        parts.push(p);
      }
      // Fewer needed (the hero got smaller): drop random ones, not just the nearest.
      while (parts.length > want) parts.splice(Math.floor(Math.random() * parts.length), 1);
      parts.sort((a, b) => a.z - b.z); // far ones drawn first
    }

    function windNow(dt: number) {
      if (t > nextGust) {
        // Gusts mostly blow the same way as the season's breeze.
        gustTarget = rand(25, 70) * (Math.random() < 0.8 ? 1 : -1);
        gustEnd = t + rand(2, 4);
        nextGust = t + rand(7, 15);
      }
      if (t > gustEnd) gustTarget = 0;
      gust += (gustTarget - gust) * Math.min(1, dt * 0.8);
      return look.breeze + 10 * Math.sin(t * 0.11) + 6 * Math.sin(t * 0.29 + 1.7) + gust;
    }

    function drawPicture(p: Particle, x: number) {
      const face = Math.cos(p.flip); // 1 face on, 0 edge on, below 0 the back
      const picture = pictures[p.look][(face < 0 ? 1 : 0) + (p.blur ? 2 : 0)];
      const base = pictures[p.look][0];
      const scale = p.size / Math.max(base.width, base.height);
      // Swinging like a pendulum: the sway also rocks it.
      const rock = Math.sin(t * p.swayHz * Math.PI * 2 + p.phase) * 0.5;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(x, p.y);
      ctx.rotate(p.tilt);
      ctx.scale(Math.max(Math.abs(face), 0.08) * Math.sign(face || 1), 1);
      ctx.rotate(p.rot + rock - p.tilt);
      ctx.scale(scale, scale);
      ctx.globalAlpha = p.alpha;
      ctx.drawImage(picture, -picture.width / 2, -picture.height / 2);
    }

    function drawDrop(p: Particle, vx: number) {
      const vy = p.fall;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(-vx, vy));
      ctx.globalAlpha = p.alpha;
      const width = lerp([0.7, 1.7], p.z);
      ctx.drawImage(rainStreak, -width / 2, -p.size, width, p.size);
    }

    function splash(x: number, y: number, z: number) {
      if (splashes.length > 160) return;
      splashes.push({ x, y, vx: 0, vy: 0, age: 0, life: 0.32, ring: true, size: lerp([4, 11], z) });
      const drops = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < drops; i++) {
        splashes.push({ x, y, vx: rand(-70, 70), vy: rand(-230, -120) * lerp([0.6, 1], z), age: 0, life: rand(0.28, 0.4), ring: false, size: lerp([0.7, 1.4], z) });
      }
    }

    function drawSplashes(dt: number) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#ffffff";
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.age += dt;
        if (s.age >= s.life) {
          splashes.splice(i, 1);
          continue;
        }
        const k = s.age / s.life;
        ctx.globalAlpha = 0.45 * (1 - k);
        ctx.beginPath();
        if (s.ring) {
          ctx.lineWidth = 0.8;
          ctx.ellipse(s.x, s.y, s.size * k, s.size * k * 0.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          s.vy += 900 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function frame(now: number) {
      // A frame's timestamp can be a little before the moment play()
      // noted, so never let time step backwards.
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      t += dt;
      const wind = windNow(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of parts) {
        const drift = wind * look.wind * lerp([0.35, 1], p.z);
        p.x += drift * dt;
        p.y += p.fall * dt;
        p.rot += p.spin * dt;
        p.flip += p.flipSpeed * dt;
        const margin = p.size + 80;
        if (p.x < -margin) p.x += W + margin * 2;
        else if (p.x > W + margin) p.x -= W + margin * 2;

        if (isRain) {
          // Near drops land on the hero's bottom edge (nearer ones lower).
          const ground = H - 3 - (1 - p.z) * 40;
          if (p.z > 0.55 && p.y >= ground) {
            splash(p.x, ground, p.z);
            place(p, false);
            continue;
          }
          if (p.y - p.size > H) {
            place(p, false);
            continue;
          }
          drawDrop(p, drift);
          continue;
        }

        if (p.y - p.size > H) {
          place(p, false);
          continue;
        }
        const x = p.x + Math.sin(t * p.swayHz * Math.PI * 2 + p.phase) * p.sway;
        if (p.look === -1) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.globalAlpha = p.alpha;
          ctx.drawImage(dot, x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          drawPicture(p, x);
        }
      }
      if (isRain) drawSplashes(dt);
      raf = requestAnimationFrame(frame);
    }

    function play() {
      if (raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function pause() {
      cancelAnimationFrame(raf);
      raf = 0;
    }

    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else pause();
    });
    seen.observe(canvas);
    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);
    play();

    return () => {
      pause();
      resizer.disconnect();
      seen.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }

  return () => {
    stopped = true;
    cleanup();
  };
}
