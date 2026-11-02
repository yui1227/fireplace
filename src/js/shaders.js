// 讀取著色器原始碼。開發時從 src/shaders/ 讀檔；打包成單一檔案時改用內嵌的 INLINE_SHADERS。

const SCENE_PARTS = ['uniforms', 'noise', 'sdf', 'lighting', 'materials', 'fire', 'main'].map((n) => `scene/${n}.glsl`);
const FILES = [
  'common.glsl',
  'fullscreen.vert',
  ...SCENE_PARTS,
  'post/bright.frag',
  'post/blur.frag',
  'post/accumulate.frag',
  'post/composite.frag',
];

async function readShader(path) {
  if (typeof INLINE_SHADERS !== 'undefined') return INLINE_SHADERS[path];
  const res = await fetch(new URL(`../shaders/${path}`, import.meta.url));
  if (!res.ok) throw new Error(`讀不到著色器 ${path}`);
  return res.text();
}

/** 回傳各程式的完整原始碼：{ vert, scene, bright, blur, accumulate, composite } */
export async function loadShaders() {
  const src = Object.fromEntries(await Promise.all(FILES.map(async (f) => [f, await readShader(f)])));
  const common = src['common.glsl'];
  return {
    vert: src['fullscreen.vert'],
    scene: common + SCENE_PARTS.map((p) => src[p]).join('\n'),
    bright: common + src['post/bright.frag'],
    blur: common + src['post/blur.frag'],
    accumulate: common + src['post/accumulate.frag'],
    composite: common + src['post/composite.frag'],
  };
}
