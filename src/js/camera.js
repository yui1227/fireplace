// 鏡頭：從左前方略高處斜看壁爐，可拖曳轉動，可選擇緩慢晃動

import { view, vsub, vdot, vcross, vnorm } from './util.js';
import { settings } from './settings.js';

/** 場景單位：1 = 爐口寬。yaw/pitch 為角度 */
const CAMERA_BASE = { yaw: 34, pitch: 17, dist: 2.75, target: [0.06, 0.55, 0.0] };

export const camera = {
  pos: [0, 0, 0],
  target: CAMERA_BASE.target,
  tanHalfFov: 0.4,
  basis: null,
  headLamp: [0, 2, -3], // 頂燈：鏡頭右後上方，跟著鏡頭移動
  dragYaw: 0,
  dragPitch: 0,
};

export function updateCamera(t) {
  let yaw = CAMERA_BASE.yaw + camera.dragYaw;
  let pitch = CAMERA_BASE.pitch + camera.dragPitch;
  let dist = CAMERA_BASE.dist;
  if (settings.sway) {
    yaw += 0.7 * Math.sin(t * 0.11) + 0.3 * Math.sin(t * 0.27 + 1);
    pitch += 0.35 * Math.sin(t * 0.17 + 2);
    dist += 0.025 * Math.sin(t * 0.13);
  }
  const y = (yaw * Math.PI) / 180;
  const p = (pitch * Math.PI) / 180;
  const tg = camera.target;
  camera.pos = [
    tg[0] - dist * Math.sin(y) * Math.cos(p),
    tg[1] + dist * Math.sin(p),
    tg[2] - dist * Math.cos(y) * Math.cos(p),
  ];
  // 視角會依長寬比放寬，讓壁爐在直向螢幕上也完整入鏡
  camera.tanHalfFov = Math.max(0.4, 1.25 / (dist * (view.W / view.H)));
  const f = vnorm(vsub(tg, camera.pos));
  const r = vnorm(vcross([0, 1, 0], f));
  camera.basis = { f, r, u: vcross(f, r) };
  const c = camera.pos;
  camera.headLamp = [c[0] + r[0] * 0.9 - f[0] * 0.7, c[1] + 1.1, c[2] + r[2] * 0.9 - f[2] * 0.7];
}

/** 場景座標 → 螢幕座標 [x, y, 深度]；在鏡頭後方回傳 null */
export function project(pt) {
  const v = vsub(pt, camera.pos);
  const z = vdot(v, camera.basis.f);
  if (z <= 0.05) return null;
  const A = view.W / view.H;
  const x = vdot(v, camera.basis.r) / (z * camera.tanHalfFov * A);
  const y = vdot(v, camera.basis.u) / (z * camera.tanHalfFov);
  return [(x * 0.5 + 0.5) * view.W, (0.5 - y * 0.5) * view.H, z];
}

/** 爐膛內的點若被爐口上緣或兩側擋住就看不到 */
export function isVisibleThroughOpening(pt) {
  if (pt[2] <= 0) return true;
  const c = camera.pos;
  const v = vsub(pt, c);
  const k = (0 - c[2]) / v[2];
  const x = c[0] + v[0] * k;
  const y = c[1] + v[1] * k;
  return Math.abs(x) < 0.5 && y > 0 && y < 0.6;
}
