#version 300 es
precision highp float;
precision highp int;
// 所有著色器共用：雜湊、2D 值雜訊、HDR 編碼（中間畫面以 gamma 編碼＋抖動儲存）
float h1(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 h2(vec2 p) {
  float n = h1(p);
  return vec2(n, h1(p + n * 17.13 + 3.1));
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), u.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), u.x), u.y);
}
vec3 enc(vec3 c) {
  c = clamp(c, 0., 6e4);
  return max(pow(c / (1. + c), vec3(1. / 2.2)) + (h1(gl_FragCoord.xy * .913 + fract(c.r * 91.7)) - .5) / 255.,
             0.);
}
vec3 dec(vec3 c) {
  c = pow(clamp(c, 0., .998), vec3(2.2));
  return c / (1. - c);
}
