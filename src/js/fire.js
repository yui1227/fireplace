// 火的狀態：爆燃、自然燃燒（柴火量）、新添的木柴、睡眠計時，以及隨機的爆裂事件

import { rnd, vnoise } from './util.js';
import { settings } from './settings.js';
import { audio } from './audio.js';
import { spawnSparks } from './sparks.js';

/** 一次添滿大約燒 12 分鐘 */
const BURN_SECONDS = 12 * 60;
/** 睡眠計時最後幾秒開始淡出 */
const SLEEP_FADE_SECONDS = 150;

export const fire = {
  flare: 0, // 爆燃（添柴、大爆裂時瞬間變旺，會慢慢衰退）
  fuel: 1, // 柴火剩餘量 0..1（只有自然燃燒開啟時會減少）
  newLog: { on: false, y: 0, vy: 0, landed: true, age: 1 }, // 新添木柴：掉落高度、速度、炭化程度
  sleepEnd: 0, // 睡眠計時結束的時間（performance.now），0 = 關閉
};

/** 添柴：自然燃燒關閉時只是讓火變旺 */
export function addLog() {
  if (!settings.burn) {
    fire.flare = Math.min(1.3, fire.flare + 0.6);
    audio.pop();
    spawnSparks(40, 1.5, 0.3);
    return;
  }
  fire.fuel = Math.min(1, fire.fuel + 0.5);
  const log = fire.newLog;
  if (!log.on || (log.landed && log.age > 0.6)) {
    fire.newLog = { on: true, y: 0.5, vy: 0, landed: false, age: 0 };
  } else {
    fire.flare = Math.min(1.3, fire.flare + 0.4);
    audio.pop();
    spawnSparks(25, 1.3, 0.2);
  }
}

function updateBurn(dt) {
  if (!settings.burn) {
    fire.fuel = 1;
    fire.newLog.on = false;
    return;
  }
  fire.fuel = Math.max(0, fire.fuel - dt / BURN_SECONDS);
  const log = fire.newLog;
  if (!log.on) return;
  if (!log.landed) {
    log.vy -= 3.2 * dt;
    log.y += log.vy * dt;
    if (log.y <= 0) {
      log.y = 0;
      if (log.vy < -0.6) {
        // 砸進火堆：爆裂聲＋一陣火星＋火變旺，然後小彈一下
        audio.pop();
        audio.crackle(0.9);
        spawnSparks(35, 1.4, 0.35, [0.0, 0.3, 0.19]);
        fire.flare = Math.min(1.3, fire.flare + 0.7);
        log.vy *= -0.22;
      } else {
        log.vy = 0;
        log.landed = true;
      }
    }
  }
  log.age = Math.min(1, log.age + dt / 90); // 大約一分半鐘燒黑
  if (fire.fuel < 0.12) log.on = false;
}

/** 睡眠計時的淡出係數 1 → 0 */
export function sleepFade(now) {
  if (!fire.sleepEnd) return 1;
  return Math.max(0, Math.min(1, (fire.sleepEnd - now) / 1000 / SLEEP_FADE_SECONDS));
}

export function setSleepTimer(minutes, now) {
  settings.sleep = minutes;
  fire.sleepEnd = minutes ? now + minutes * 60000 : 0;
}

/**
 * 每格更新火的狀態並觸發隨機事件。
 * 回傳這一格要給畫面和聲音用的數值。
 */
export function updateFire(t, dt, now) {
  updateBurn(dt);
  const fade = sleepFade(now);
  const fuelFactor = settings.burn ? 0.08 + 0.92 * Math.pow(fire.fuel, 0.55) : 1;
  fire.flare *= Math.exp(-dt * 1.3);

  const base = 0.72 + 0.17 * vnoise(t * 0.5) + 0.11 * vnoise(t * 2.2 + 40);
  const intensity = (base * fuelFactor + 0.15 * fire.flare) * (0.06 + 0.94 * fade);
  const activity = fuelFactor * fade;

  // 小爆裂：聲音和火星同一個事件
  if (rnd() < (6 + 6 * intensity) * dt * activity) {
    const s = rnd() ** 2.2;
    audio.crackle(s * Math.max(0.3, activity));
    if (s > 0.25 || rnd() < 0.3) spawnSparks(1 + Math.floor(s * 8 * activity), 0.8 + s, s > 0.6 ? 0.2 : 0);
  }
  // 偶爾的大爆裂
  if (rnd() < 0.09 * dt * activity) {
    audio.pop();
    spawnSparks(20 + Math.floor(rnd() * 14), 1.3, 0.35);
    fire.flare = Math.min(1.2, fire.flare + 0.35);
  }
  if (rnd() < 2 * dt * activity) spawnSparks(1, 0.7);

  const log = fire.newLog;
  return {
    intensity,
    fade,
    fuel: settings.burn ? fire.fuel : 1,
    newLog: [log.on ? 1 : 0, log.y, log.age, Math.min(1, 0.35 + fire.fuel)],
    heat: (0.4 + 0.6 * intensity) * fade,
  };
}
