// 進入點：載入著色器、初始化渲染與介面，跑主迴圈

import { view, rnd, showMessage } from './util.js';
import { QUALITY, settings } from './settings.js';
import { camera, updateCamera } from './camera.js';
import { loadShaders } from './shaders.js';
import { renderer, initRenderer, resizeRenderer, renderFrame } from './renderer.js';
import { audio } from './audio.js';
import { fire, updateFire } from './fire.js';
import { updateAndDrawSparks } from './sparks.js';
import { initUI, updatePanel } from './ui.js';

const glCanvas = document.getElementById('gl');
const fxCanvas = document.getElementById('fx');
const fxCtx = fxCanvas.getContext('2d');

function layout() {
  view.W = innerWidth;
  view.H = innerHeight;
  view.dpr = Math.min(devicePixelRatio || 1, 2);
  fxCanvas.width = Math.round(view.W * view.dpr);
  fxCanvas.height = Math.round(view.H * view.dpr);
  updateCamera(performance.now() / 1000);
  resizeRenderer();
}

// 依實際流暢度自動調整渲染比例（下限為該畫質預設值的 60%）
let slowFrames = 0;
let fastFrames = 0;
function adaptResolution(dt) {
  if (dt > 0.03) {
    slowFrames++;
    fastFrames = 0;
  } else if (dt < 0.018) {
    fastFrames++;
    slowFrames = 0;
  }
  const base = QUALITY[settings.quality].scale;
  if (slowFrames > 40 && renderer.scale > base * 0.6) {
    renderer.scale = Math.max(base * 0.6, renderer.scale - 0.06);
    slowFrames = 0;
    resizeRenderer();
  }
  if (fastFrames > 240 && renderer.scale < base) {
    renderer.scale = Math.min(base, renderer.scale + 0.06);
    fastFrames = 0;
    resizeRenderer();
  }
}

const timeOffset = rnd() * 100;
const HEAD_LAMP_BRIGHTNESS = 0.34;
// 開關燈時亮度漸變
let sconceLevel = settings.sconce ? 1 : 0;
let headLevel = settings.headLamp ? 1 : 0;
let last = performance.now() / 1000;
let prevCamPos = null;

function frame(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, t - last);
  last = t;
  adaptResolution(dt);

  updateCamera(t);
  const p = camera.pos;
  const camMoved = prevCamPos ? Math.hypot(p[0] - prevCamPos[0], p[1] - prevCamPos[1], p[2] - prevCamPos[2]) : 1;
  prevCamPos = p.slice();

  const f = updateFire(t, dt, now);
  audio.fade = f.fade;
  audio.rain = settings.rain;
  audio.update(f.intensity, fire.flare, dt);

  const ease = Math.min(1, dt * 5);
  sconceLevel += ((settings.sconce ? 1 : 0) - sconceLevel) * ease;
  headLevel += ((settings.headLamp ? 1 : 0) - headLevel) * ease;
  const dim = 0.15 + 0.85 * f.fade; // 睡眠計時淡出時燈也跟著調暗

  renderFrame({
    time: t + timeOffset,
    intensity: f.intensity,
    flare: fire.flare,
    fuel: f.fuel,
    newLog: f.newLog,
    heat: f.heat,
    lamp: sconceLevel * dim,
    headLamp: headLevel * HEAD_LAMP_BRIGHTNESS * dim,
    camMoved,
  });
  updateAndDrawSparks(fxCtx, t, dt);
  updatePanel(now);
  requestAnimationFrame(frame);
}

let resizeRaf;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(layout);
});

initUI(glCanvas, { onQualityChange: resizeRenderer });
layout();
requestAnimationFrame(frame);
loadShaders()
  .then((shaders) => initRenderer(glCanvas, shaders, layout))
  .catch((e) => {
    console.error(e);
    showMessage('載入著色器失敗（開發時請用本機伺服器開啟，不要直接點兩下 index.html）');
  });
