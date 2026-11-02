// 雜訊與共用小工具：3D 值雜訊、fbm、Voronoi、炭火色
float h13(vec3 p) {
  p = fract(p * .3183099 + .1);
  p *= 17.;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float n3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3. - 2. * f);
  return mix(mix(mix(h13(i), h13(i + vec3(1, 0, 0)), f.x),
                 mix(h13(i + vec3(0, 1, 0)), h13(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h13(i + vec3(0, 0, 1)), h13(i + vec3(1, 0, 1)), f.x),
                 mix(h13(i + vec3(0, 1, 1)), h13(i + vec3(1, 1, 1)), f.x), f.y),
             f.z);
}
float fbm3(vec3 p) {
  float v = 0., a = .5;
  for (int i = ZERO; i < 4; i++) {
    v += a * n3(p);
    p = p * 2.03 + vec3(1.3, 7.1, 4.7);
    a *= .5;
  }
  return v;
}
vec3 voro(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  float d1 = 8., d2 = 8.;
  vec2 id = vec2(0);
  for (int j = -1 + ZERO; j <= 1; j++)
    for (int i = -1 + ZERO; i <= 1; i++) {
      vec2 g = vec2(i, j);
      vec2 o = h2(n + g) * .8 + .1;
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = n + g;
      } else if (d < d2)
        d2 = d;
    }
  return vec3(sqrt(d2) - sqrt(d1), h1(id), h1(id + 7.7));
}
vec3 ember(float t) {
  t = clamp(t, 0., 2.);
  return vec3(1., .15 + .42 * t, .02 + .16 * t * t) * t;
}
