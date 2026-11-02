// 共用小工具：亂數、1D 值雜訊、向量運算、視窗尺寸、畫面訊息

export const rnd = Math.random;

const NOISE_TABLE = new Float32Array(512);
for (let i = 0; i < 512; i++) NOISE_TABLE[i] = rnd();

/** 平滑的 1D 值雜訊，回傳 0..1 */
export function vnoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = NOISE_TABLE[i & 511];
  const b = NOISE_TABLE[(i + 1) & 511];
  return a + (b - a) * u;
}

export const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vnorm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** 目前視窗的 CSS 尺寸與裝置像素比 */
export const view = { W: 0, H: 0, dpr: 1 };

/** 在畫面中央顯示一行訊息；傳空字串則隱藏 */
export function showMessage(text) {
  let el = document.getElementById('msg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'msg';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.hidden = !text;
}
