// WebGL2 渲染管線：場景（光線步進）→ 時間累積 → 光暈（兩層）→ 合成到畫面

import { view, showMessage } from './util.js';
import { QUALITY, settings } from './settings.js';
import { camera, project } from './camera.js';

let gl = null;
let canvas = null;
let programs = null;
let targets = {};
let useHalfFloat = false;
let frameNo = 0;
let resetHistory = true;

/** scale：目前的渲染比例（會依流暢度自動調整）；ready：著色器是否編譯完成 */
export const renderer = { scale: QUALITY[settings.quality].scale, ready: false };

const UNIFORMS = {
  scene: ['ZERO', 'R', 'JIT', 'T', 'I', 'FL', 'FT', 'CAM', 'TGT', 'FUEL', 'STEPS', 'MOON', 'SMK', 'NL'],
  accumulate: ['S', 'P', 'TX', 'AL'],
  bright: ['S', 'TX', 'TH'],
  blur: ['S', 'DIR'],
  composite: ['S', 'B1', 'B2', 'T', 'R', 'HZ', 'HS'],
};

/**
 * 建立 WebGL2 context 並在背景編譯著色器（KHR_parallel_shader_compile），
 * 編譯完成後呼叫 onReady。
 */
export function initRenderer(cv, shaders, onReady) {
  canvas = cv;
  gl = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    showMessage('這個瀏覽器不支援 WebGL2');
    return;
  }
  useHalfFloat = !!gl.getExtension('EXT_color_buffer_float');
  const parallel = gl.getExtension('KHR_parallel_shader_compile');

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  programs = {};
  for (const name of Object.keys(UNIFORMS)) {
    const p = gl.createProgram();
    const fs = compile(gl.FRAGMENT_SHADER, shaders[name]);
    gl.attachShader(p, compile(gl.VERTEX_SHADER, shaders.vert));
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    programs[name] = { p, fs, u: {} };
  }

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  showMessage('正在準備爐火…');
  const finish = () => {
    for (const [name, prog] of Object.entries(programs)) {
      if (!gl.getProgramParameter(prog.p, gl.LINK_STATUS)) {
        console.error(name, gl.getShaderInfoLog(prog.fs) || gl.getProgramInfoLog(prog.p));
        showMessage('著色器編譯失敗');
        return;
      }
      for (const u of UNIFORMS[name]) prog.u[u] = gl.getUniformLocation(prog.p, u);
    }
    renderer.ready = true;
    showMessage('');
    onReady();
  };
  const poll = () => {
    const done = Object.values(programs).every((prog) =>
      gl.getProgramParameter(prog.p, parallel.COMPLETION_STATUS_KHR),
    );
    if (done) finish();
    else setTimeout(poll, 50);
  };
  if (parallel) poll();
  else setTimeout(finish, 0);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    renderer.ready = false;
    showMessage('顯示卡被重置了，請重新整理頁面');
  });
}

/** 建立渲染目標；可以的話用 RGBA16F，否則退回 RGBA8 */
function makeTarget(w, h) {
  const create = (half) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    return { t, f, w, h, ok };
  };
  let rt = useHalfFloat ? create(true) : null;
  if (!rt || !rt.ok) {
    if (rt) freeTarget(rt);
    useHalfFloat = false;
    rt = create(false);
  }
  return rt;
}

function freeTarget(rt) {
  if (!rt) return;
  gl.deleteTexture(rt.t);
  gl.deleteFramebuffer(rt.f);
}

/** 依視窗大小、畫質與目前渲染比例重建畫布和所有渲染目標 */
export function resizeRenderer() {
  if (!gl || !renderer.ready) return;
  const s = Math.min(view.dpr, QUALITY[settings.quality].cap) * renderer.scale;
  canvas.width = Math.max(4, Math.round(view.W * s));
  canvas.height = Math.max(4, Math.round(view.H * s));
  for (const rt of Object.values(targets)) freeTarget(rt);
  const w = canvas.width;
  const h = canvas.height;
  const w4 = Math.max(2, w >> 2);
  const h4 = Math.max(2, h >> 2);
  const w8 = Math.max(2, w4 >> 1);
  const h8 = Math.max(2, h4 >> 1);
  targets = {
    scene: makeTarget(w, h),
    history: makeTarget(w, h),
    historyNext: makeTarget(w, h),
    bloom1: makeTarget(w4, h4),
    bloom1Tmp: makeTarget(w4, h4),
    bloom2: makeTarget(w8, h8),
    bloom2Tmp: makeTarget(w8, h8),
  };
  resetHistory = true;
}

function pass(prog, target, setUniforms) {
  gl.useProgram(prog.p);
  if (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.f);
    gl.viewport(0, 0, target.w, target.h);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  setUniforms(prog.u);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function bindTex(loc, unit, rt) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, rt.t);
  gl.uniform1i(loc, unit);
}

function halton(i, base) {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

/**
 * 畫一格。
 * @param {object} f time, intensity, flare, fuel, newLog[4], heat（熱氣扭曲強度）, camMoved（本格鏡頭位移）
 */
export function renderFrame(f) {
  if (!gl || !renderer.ready || !targets.scene) return;
  const P = programs;
  const T = targets;
  const t = f.time % 500;
  frameNo++;
  // 每格做次像素抖動，交給時間累積平均掉（抗鋸齒）
  const jx = halton((frameNo % 8) + 1, 2) - 0.5;
  const jy = halton((frameNo % 8) + 1, 3) - 0.5;

  pass(P.scene, T.scene, (u) => {
    gl.uniform1i(u.ZERO, 0);
    gl.uniform2f(u.R, canvas.width, canvas.height);
    gl.uniform2f(u.JIT, jx, jy);
    gl.uniform1f(u.T, t);
    gl.uniform1f(u.I, f.intensity);
    gl.uniform1f(u.FL, f.flare);
    gl.uniform1f(u.FT, camera.tanHalfFov);
    gl.uniform3fv(u.CAM, camera.pos);
    gl.uniform3fv(u.TGT, camera.target);
    gl.uniform1f(u.FUEL, f.fuel);
    gl.uniform1f(u.STEPS, QUALITY[settings.quality].steps);
    gl.uniform1f(u.MOON, 1);
    gl.uniform1f(u.SMK, 1);
    gl.uniform4fv(u.NL, f.newLog);
  });

  // 鏡頭在動時減少歷史權重，避免殘影
  const alpha = resetHistory ? 1 : Math.min(1, 0.14 + f.camMoved * 6);
  resetHistory = false;
  pass(P.accumulate, T.historyNext, (u) => {
    bindTex(u.S, 0, T.scene);
    bindTex(u.P, 1, T.history);
    gl.uniform2f(u.TX, 1 / T.scene.w, 1 / T.scene.h);
    gl.uniform1f(u.AL, alpha);
  });
  [T.history, T.historyNext] = [T.historyNext, T.history];
  const cur = T.history;

  pass(P.bright, T.bloom1, (u) => {
    bindTex(u.S, 0, cur);
    gl.uniform2f(u.TX, 1 / cur.w, 1 / cur.h);
    gl.uniform1f(u.TH, 0.35);
  });
  pass(P.blur, T.bloom1Tmp, (u) => {
    bindTex(u.S, 0, T.bloom1);
    gl.uniform2f(u.DIR, 1.4 / T.bloom1.w, 0);
  });
  pass(P.blur, T.bloom1, (u) => {
    bindTex(u.S, 0, T.bloom1Tmp);
    gl.uniform2f(u.DIR, 0, 1.4 / T.bloom1.h);
  });
  pass(P.bright, T.bloom2, (u) => {
    bindTex(u.S, 0, T.bloom1);
    gl.uniform2f(u.TX, 0.5 / T.bloom1.w, 0.5 / T.bloom1.h);
    gl.uniform1f(u.TH, 0);
  });
  pass(P.blur, T.bloom2Tmp, (u) => {
    bindTex(u.S, 0, T.bloom2);
    gl.uniform2f(u.DIR, 2 / T.bloom2.w, 0);
  });
  pass(P.blur, T.bloom2, (u) => {
    bindTex(u.S, 0, T.bloom2Tmp);
    gl.uniform2f(u.DIR, 0, 2 / T.bloom2.h);
  });

  // 熱氣扭曲區域：把火堆上方投影到畫面上
  const c0 = project([0, 0.36, 0.2]);
  const c1 = project([0.32, 0.36, 0.2]);
  const c2 = project([0, 0.62, 0.18]);
  let hz = [0.5, 0.5, 0.1, 0.1];
  if (c0 && c1 && c2) {
    hz = [
      c0[0] / view.W,
      1 - c0[1] / view.H,
      Math.max(0.01, Math.abs(c1[0] - c0[0]) / view.W),
      Math.max(0.01, Math.abs(c0[1] - c2[1]) / view.H),
    ];
  }
  pass(P.composite, null, (u) => {
    bindTex(u.S, 0, cur);
    bindTex(u.B1, 1, T.bloom1);
    bindTex(u.B2, 2, T.bloom2);
    gl.uniform1f(u.T, t);
    gl.uniform2f(u.R, canvas.width, canvas.height);
    gl.uniform4fv(u.HZ, hz);
    gl.uniform1f(u.HS, f.heat);
  });
}
