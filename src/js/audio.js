// 即時合成音效（Web Audio）：火焰呼嘯、木柴爆裂、房間殘響、窗外雨聲
// 所有聲音都是程式即時產生的波形，沒有任何音檔。

import { rnd } from './util.js';

/** 產生一段雙聲道緩衝區，fill(data, channel) 負責填值 */
function makeBuffer(ctx, seconds, fill) {
  const buf = ctx.createBuffer(2, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) fill(buf.getChannelData(ch), ch);
  return buf;
}

function filter(ctx, type, freq, q) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  if (q !== undefined) f.Q.value = q;
  return f;
}

function gain(ctx, value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

/** 接到輸出前隨機左右定位（不支援 StereoPanner 時直接接） */
function connectPanned(ctx, node, dest, pan) {
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    node.connect(p).connect(dest);
  } else node.connect(dest);
}

export const audio = {
  ctx: null,
  on: false,
  vol: 0.7,
  fade: 1, // 睡眠計時淡出
  rain: false,

  start() {
    if (this.ctx) {
      this.ctx.resume();
      this.on = true;
      this.setVol();
      return;
    }
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const sr = ctx.sampleRate;

    // 輸出鏈：master（火） → 壓縮器 → 總音量 → 喇叭
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.out = gain(ctx, 0);
    this.comp.connect(this.out).connect(ctx.destination);
    this.master = gain(ctx, 1);
    this.master.connect(this.comp);

    // 房間殘響：即時產生的脈衝響應（越後面越悶）
    const ir = makeBuffer(ctx, 2.2, (d) => {
      let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / sr;
        lp += (rnd() * 2 - 1 - lp) * (0.5 - 0.4 * Math.min(1, t / 1.5));
        d[i] = lp * Math.exp(-t * 3.2) * (t < 0.012 ? t / 0.012 : 1);
      }
    });
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.master.connect(conv);
    conv.connect(gain(ctx, 0.32)).connect(this.comp);

    // 噪音素材
    const brown = makeBuffer(ctx, 6, (d) => {
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    });
    const white = makeBuffer(ctx, 3, (d) => {
      for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1;
    });
    const pink = makeBuffer(ctx, 4, (d) => {
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = rnd() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.95 * b2 + w * 0.048;
        d[i] = (b0 + b1 + b2 + w * 0.05) * 1.4;
      }
    });
    const loop = (buf) => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start(0, rnd() * buf.duration);
      return s;
    };

    // 火焰：呼嘯、低頻隆隆、高頻嘶嘶
    this.roarLP = filter(ctx, 'lowpass', 380, 0.6);
    this.roarG = gain(ctx, 0.2);
    loop(brown).connect(this.roarLP).connect(this.roarG).connect(this.master);
    this.rumG = gain(ctx, 0.25);
    loop(brown)
      .connect(filter(ctx, 'lowpass', 110))
      .connect(this.rumG)
      .connect(this.master);
    this.hissG = gain(ctx, 0.012);
    loop(white)
      .connect(filter(ctx, 'highpass', 2500))
      .connect(this.hissG)
      .connect(this.master);

    // 雨聲：粉紅噪音的沙沙聲＋低頻，雨滴另外即時產生
    this.rainBus = gain(ctx, 0);
    this.rainBus.connect(this.comp);
    loop(pink)
      .connect(filter(ctx, 'bandpass', 1600, 0.35))
      .connect(filter(ctx, 'lowpass', 5200))
      .connect(gain(ctx, 0.55))
      .connect(this.rainBus);
    loop(brown)
      .connect(filter(ctx, 'lowpass', 250))
      .connect(gain(ctx, 0.25))
      .connect(this.rainBus);

    this.on = true;
    this.setVol();
  },

  stop() {
    if (!this.ctx) return;
    this.on = false;
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  },

  setVol() {
    if (this.ctx && this.on) this.out.gain.setTargetAtTime(this.vol * this.fade, this.ctx.currentTime, 0.1);
  },

  /** 每格呼叫：讓聲音跟著火勢（I）與爆燃（flare）變化 */
  update(I, flare, dt) {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(this.vol * this.fade, t, 0.3);
    this.rainBus.gain.setTargetAtTime(this.rain ? 0.3 : 0, t, 0.8);
    if (this.rain && dt && rnd() < 18 * dt) this.drop();
    this.roarG.gain.setTargetAtTime(0.12 + 0.28 * I * I + 0.25 * flare, t, 0.06);
    this.roarLP.frequency.setTargetAtTime(260 + 420 * I + 600 * flare, t, 0.06);
    this.rumG.gain.setTargetAtTime(0.18 + 0.22 * I, t, 0.1);
    this.hissG.gain.setTargetAtTime(0.006 + 0.012 * I + 0.03 * flare, t, 0.08);
  },

  /** 一滴雨打在窗上（偏左邊，窗戶的方向） */
  drop() {
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * 0.03);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const f = 1800 + rnd() * 5000;
    const dec = sr * (0.002 + rnd() * 0.006);
    for (let i = 0; i < n; i++)
      d[i] = (Math.sin((i / sr) * f * 6.283) * 0.6 + (rnd() * 2 - 1) * 0.4) * Math.exp(-i / dec);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = gain(ctx, 0.04 + rnd() * 0.12);
    src.connect(filter(ctx, 'highpass', 1500)).connect(g);
    connectPanned(ctx, g, this.rainBus, -0.4 - rnd() * 0.55);
    src.start(ctx.currentTime + rnd() * 0.02);
  },

  /** 一次木柴爆裂：每次都即時產生新的波形。s = 0..1 強度 */
  crackle(s, delay = 0) {
    if (!this.on) return;
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * (0.006 + 0.06 * s));
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const clicks = 1 + Math.floor(rnd() * (1 + 7 * s));
    for (let k = 0; k < clicks; k++) {
      const st = Math.floor(rnd() * n * 0.75);
      const amp = (0.3 + rnd() * 0.7) * (k === 0 ? 1 : 0.6);
      const dec = sr * (0.0002 + rnd() * 0.002);
      const len = Math.min(n - st, Math.floor(dec * 7));
      for (let i = 0; i < len; i++) d[st + i] += (rnd() * 2 - 1) * amp * Math.exp(-i / dec);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = gain(ctx, 0.25 + 0.9 * s);
    src.connect(filter(ctx, 'bandpass', 900 + rnd() * 4800 * (1 - 0.5 * s), 0.5 + rnd() * 1.2)).connect(g);
    connectPanned(ctx, g, this.master, (rnd() * 2 - 1) * 0.6);
    src.start(ctx.currentTime + 0.004 + delay);
  },

  /** 大爆裂：低沉的「啪」加上一串小爆裂 */
  pop() {
    if (!this.on) return;
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const n = Math.floor(sr * 0.12);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const dec = sr * (0.006 + rnd() * 0.01);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.exp(-i / dec);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src
      .connect(filter(ctx, 'bandpass', 280 + rnd() * 600, 0.9))
      .connect(gain(ctx, 1.6))
      .connect(this.master);
    src.start(ctx.currentTime + 0.004);
    for (let k = 0; k < 6; k++) this.crackle(0.3 + rnd() * 0.5, 0.02 + rnd() * 0.35);
  },
};
