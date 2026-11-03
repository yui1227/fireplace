// 介面：控制列、設定面板、拖曳轉視角、點擊添柴、閒置自動隱藏

import { QUALITY, settings, saveSettings } from './settings.js';
import { audio } from './audio.js';
import { camera, project } from './camera.js';
import { fire, addLog, setSleepTimer } from './fire.js';
import { renderer } from './renderer.js';

const $ = (id) => document.getElementById(id);
let panelOpen = false;

const ensureAudio = () => {
  if (!audio.ctx) {
    audio.start();
    syncSoundButton();
  }
};
const syncSoundButton = () => {
  $('snd').textContent = audio.on ? '🔊' : '🔇';
};

/** 面板開著時每格更新柴火量與睡眠倒數 */
export function updatePanel(now) {
  if (!panelOpen) return;
  $('fuelRow').hidden = !settings.burn;
  $('fuelBar').style.width = Math.round(fire.fuel * 100) + '%';
  let text = '';
  if (fire.sleepEnd) {
    const r = Math.max(0, (fire.sleepEnd - now) / 1000);
    text = r > 0 ? `剩 ${Math.floor(r / 60)}:${String(Math.floor(r % 60)).padStart(2, '0')}` : '已熄滅';
  }
  $('sleepLeft').textContent = text;
}

function syncPanel() {
  document.querySelectorAll('[data-q]').forEach((b) => b.classList.toggle('on', b.dataset.q === settings.quality));
  $('optBurn').checked = settings.burn;
  $('optSway').checked = settings.sway;
  $('optRain').checked = settings.rain;
  $('optLamp').checked = settings.lamp;
  $('optSleep').value = String(settings.sleep);
  updatePanel(performance.now());
}

function setPanel(open) {
  panelOpen = open;
  $('panel').hidden = !open;
  if (open) syncPanel();
}

/** onQualityChange：畫質改變時要重建渲染目標 */
export function initUI(canvas, { onQualityChange }) {
  $('gear').onclick = (e) => {
    e.stopPropagation();
    setPanel(!panelOpen);
  };
  document.querySelectorAll('[data-q]').forEach((b) => {
    b.onclick = () => {
      settings.quality = b.dataset.q;
      renderer.scale = QUALITY[settings.quality].scale;
      saveSettings();
      syncPanel();
      onQualityChange();
    };
  });
  $('optBurn').onchange = (e) => {
    settings.burn = e.target.checked;
    if (settings.burn) fire.fuel = 1;
    saveSettings();
    syncPanel();
  };
  $('optSway').onchange = (e) => {
    settings.sway = e.target.checked;
    saveSettings();
  };
  $('optLamp').onchange = (e) => {
    settings.lamp = e.target.checked;
    saveSettings();
  };
  $('optRain').onchange = (e) => {
    settings.rain = e.target.checked;
    if (settings.rain) ensureAudio();
    saveSettings();
  };
  $('optSleep').onchange = (e) => {
    setSleepTimer(+e.target.value, performance.now());
    syncPanel();
  };
  $('addLog').onclick = () => {
    ensureAudio();
    addLog();
  };
  const resetView = () => {
    camera.dragYaw = 0;
    camera.dragPitch = 0;
  };
  $('resetView').onclick = resetView;
  $('snd').onclick = () => {
    audio.on ? audio.stop() : audio.start();
    syncSoundButton();
  };
  $('vol').oninput = (e) => {
    audio.vol = +e.target.value;
    audio.setVol();
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  $('fs').onclick = toggleFullscreen;
  addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  // 拖曳轉視角；沒有拖曳的點擊若點在爐火附近就添柴
  let down = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, yaw: camera.dragYaw, pitch: camera.dragPitch, drag: false };
    canvas.setPointerCapture(e.pointerId);
    if (panelOpen) setPanel(false);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.drag && Math.hypot(dx, dy) > 6) down.drag = true;
    if (down.drag) {
      camera.dragYaw = Math.max(-22, Math.min(22, down.yaw - dx * 0.12));
      camera.dragPitch = Math.max(-10, Math.min(14, down.pitch + dy * 0.08));
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (down && !down.drag) {
      ensureAudio();
      const c = project([0, 0.25, 0.15]);
      const edge = project([0.5, 0.25, 0.0]);
      if (c && edge && Math.hypot(e.clientX - c[0], e.clientY - c[1]) < Math.abs(edge[0] - c[0]) * 1.1) addLog();
    }
    down = null;
  });
  canvas.addEventListener('dblclick', resetView);

  // 3 秒沒動就隱藏控制列（設定面板開著時不隱藏）
  let idleTimer;
  const wake = () => {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!panelOpen) document.body.classList.add('idle');
    }, 3000);
  };
  addEventListener('pointermove', wake);
  addEventListener('pointerdown', wake);
  wake();
  syncPanel();
}
