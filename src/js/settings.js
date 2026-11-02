// 使用者設定（畫質、自然燃燒、鏡頭晃動、雨聲會記在這台瀏覽器；睡眠計時不記）

/** cap：解析度倍率上限（相對 devicePixelRatio）、scale：預設渲染比例、steps：火焰取樣數 */
export const QUALITY = {
  low: { cap: 1, scale: 0.55, steps: 22 },
  mid: { cap: 1.5, scale: 0.75, steps: 30 },
  high: { cap: 2, scale: 1, steps: 40 },
};

export const settings = { quality: 'mid', burn: false, sway: true, rain: false, sleep: 0 };

const STORAGE_KEY = 'fireplace-settings';

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  for (const k of ['quality', 'burn', 'sway', 'rain']) if (k in saved) settings[k] = saved[k];
  if (!QUALITY[settings.quality]) settings.quality = 'mid';
} catch (e) {
  /* 沒有 localStorage 也沒關係 */
}

export function saveSettings() {
  try {
    const { quality, burn, sway, rain } = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ quality, burn, sway, rain }));
  } catch (e) {
    /* 忽略 */
  }
}
