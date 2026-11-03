// 使用者設定（睡眠計時以外都會記在這台瀏覽器）

/** cap：解析度倍率上限（相對 devicePixelRatio）、scale：預設渲染比例、steps：火焰取樣數 */
export const QUALITY = {
  low: { cap: 1, scale: 0.55, steps: 22 },
  mid: { cap: 1.5, scale: 0.75, steps: 30 },
  high: { cap: 2, scale: 1, steps: 40 },
};

export const settings = { quality: 'mid', burn: false, sway: true, rain: false, headLamp: true, sconce: false, sleep: 0 };
const SAVED_KEYS = ['quality', 'burn', 'sway', 'rain', 'headLamp', 'sconce'];

const STORAGE_KEY = 'fireplace-settings';

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  for (const k of SAVED_KEYS) if (k in saved) settings[k] = saved[k];
  if (!QUALITY[settings.quality]) settings.quality = 'mid';
} catch (e) {
  /* 沒有 localStorage 也沒關係 */
}

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(SAVED_KEYS.map((k) => [k, settings[k]]))));
  } catch (e) {
    /* 忽略 */
  }
}
