// 火星粒子：在 3D 場景座標裡模擬，再投影到上層的 2D 畫布

import { rnd, view } from './util.js';
import { camera, project, isVisibleThroughOpening } from './camera.js';

const MAX_SPARKS = 500;
const sparks = [];

// 弧形柵欄（和著色器裡的 sdf 一致）：圓心 (0, FENCE_Z)，半徑 FENCE_R，半張角 FENCE_HALF
const FENCE_R = 1.131;
const FENCE_Z = 0.871;
const FENCE_HALF = 0.54;
const FENCE_TOP = 0.28;

/**
 * 產生 n 顆火星。
 * escape：飛出爐口的機率（會受重力落到爐床/地板）；at：起點（預設在火堆上）
 */
export function spawnSparks(n, power = 1, escape = 0, at) {
  for (let i = 0; i < n; i++) {
    const esc = rnd() < escape;
    const p = at
      ? [at[0] + (rnd() - 0.5) * 0.5, at[1] + rnd() * 0.05, at[2] + (rnd() - 0.5) * 0.1]
      : [(rnd() - 0.5) * 0.5, 0.2 + rnd() * 0.12, 0.15 + rnd() * 0.15];
    const v = esc
      ? [(rnd() - 0.5) * 0.8, 0.5 + rnd() * 0.9, -(0.7 + rnd() * 0.9)]
      : [(rnd() - 0.5) * 0.15 * power, (0.25 + rnd() * 0.6) * power, (rnd() - 0.5) * 0.1];
    sparks.push({
      p,
      v,
      life: 0,
      max: esc ? 2 + rnd() * 2.5 : 0.7 + rnd() * 1.6,
      size: 0.6 + rnd() * 1.4,
      phase: rnd() * 6.28,
      escape: esc,
      resting: false,
    });
  }
  if (sparks.length > MAX_SPARKS) sparks.splice(0, sparks.length - MAX_SPARKS);
}

function stepEscaping(s, dt) {
  const { p, v } = s;
  if (s.resting) return;
  v[1] -= 2.6 * dt;
  for (let k = 0; k < 3; k++) p[k] += v[k] * dt;

  // 撞到弧形柵欄就彈回
  const r = Math.hypot(p[0], p[2] - FENCE_Z);
  const r0 = Math.hypot(p[0] - v[0] * dt, p[2] - v[2] * dt - FENCE_Z);
  if (r > FENCE_R && r0 <= FENCE_R && p[1] < FENCE_TOP && Math.abs(Math.atan2(p[0], FENCE_Z - p[2])) < FENCE_HALF) {
    const k = (FENCE_R - 0.002) / r;
    p[0] *= k;
    p[2] = FENCE_Z + (p[2] - FENCE_Z) * k;
    v[0] *= -0.25;
    v[2] *= -0.25;
  }

  // 落地：爐膛內底、爐床石板、木地板
  const onHearth = Math.abs(p[0]) < 0.82 && p[2] > -0.28 && p[2] < 0.04;
  const groundY = onHearth ? -0.01 : p[2] < 0.04 ? -0.09 : 0;
  if (p[2] > 0 && p[1] < 0) {
    p[1] = 0;
    v[1] *= -0.3;
  } else if (p[1] < groundY && v[1] < 0) {
    p[1] = groundY;
    v[1] *= -0.28;
    v[0] *= 0.5;
    v[2] *= 0.5;
    if (Math.abs(v[1]) < 0.12) s.resting = true;
  }
}

/** 往上飄的火星；回傳 false 表示已經飄進煙道 */
function stepRising(s, t, dt) {
  const { p, v } = s;
  v[1] += 0.5 * dt;
  v[0] += Math.sin(t * 5 + s.phase) * 0.5 * dt;
  v[0] *= 0.985;
  for (let k = 0; k < 3; k++) p[k] += v[k] * dt;
  return p[1] <= 0.62 + 0.25 * Math.max(p[2], 0);
}

const glowSprite = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,200,110,1)');
  g.addColorStop(0.3, 'rgba(255,110,30,.5)');
  g.addColorStop(1, 'rgba(255,60,10,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return c;
})();

export function updateAndDrawSparks(ctx, t, dt) {
  const { W, H, dpr } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life += dt;
    if (s.life > s.max) {
      sparks.splice(i, 1);
      continue;
    }
    if (s.escape) stepEscaping(s, dt);
    else if (!stepRising(s, t, dt)) {
      sparks.splice(i, 1);
      continue;
    }
    const { p, v } = s;
    if (!isVisibleThroughOpening(p)) continue;
    const a = project(p);
    if (!a) continue;
    const b = project([p[0] - v[0] * 0.025, p[1] - v[1] * 0.025, p[2] - v[2] * 0.025]);
    const heat = 1 - s.life / s.max;
    const size = Math.max(0.6, ((s.size * 0.006) / (a[2] * camera.tanHalfFov)) * H * 0.5);
    ctx.strokeStyle = `rgba(255,${(110 + 140 * heat) | 0},${(30 + 120 * heat * heat) | 0},${Math.min(1, heat * 1.5)})`;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    if (b) ctx.lineTo(b[0], b[1]);
    else ctx.lineTo(a[0], a[1] + 0.1);
    ctx.stroke();
    ctx.globalAlpha = heat * 0.45;
    const g = size * 5;
    ctx.drawImage(glowSprite, a[0] - g, a[1] - g, g * 2, g * 2);
    ctx.globalAlpha = 1;
  }
}
