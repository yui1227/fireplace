// 體積火焰：五個火源，fbm 擾動決定密度與溫度
vec4 src(int i) {
  if (i == 0) return vec4(-.22, .2, .8, 0.);
  if (i == 1) return vec4(-.08, .25, 1., 1.7);
  if (i == 2) return vec4(.07, .2, 1.1, 3.1);
  if (i == 3) return vec4(.22, .24, .85, 4.4);
  return vec4(0., .3, .95, 5.9);
}
vec2 fireAt(vec3 p) {
  float hh = p.y - .1;
  if (hh < -.06) return vec2(0.);
  hh = max(hh, 0.);
  vec3 wp = p * vec3(3.5, 1.8, 3.5) + vec3(0., -T * 1.5, 0.);
  vec2 w = vec2(n3(wp), n3(wp + vec3(7.3, 1.1, 3.7))) - .5;
  vec2 xz = p.xz + w * (.05 + .4 * hh);
  float s = 0., reach = .1;
  for (int i = ZERO; i < 5; i++) {
    vec4 sr = src(i);
    float fl = .7 + .5 * noise(vec2(T * .8 + sr.w * 3., sr.w));
    float hm = sr.z * fl * (.62 * I + .38 * FL + .14);
    float wd = .12 * max(.04, 1. - hh / (hm + .01)) + .008;
    vec2 dd = (xz - sr.xy) * vec2(1., 1.4);
    float e = exp(-dot(dd, dd) / (wd * wd));
    if (e > s) {
      s = e;
      reach = hm;
    }
  }
  if (s < .03 || hh > reach * 1.3) return vec2(0.);
  float n = fbm3(p * vec3(10., 4.2, 10.) + vec3(w.x, 0., w.y) * 2.5 + vec3(0., -T * 3.3, 0.));
  float d = s * (n * 2. - .4) - hh / max(reach, .04) * .65 - smoothstep(reach * .85, reach * 1.3, hh) * .5;
  if (d <= 0.) return vec2(0.);
  return vec2(smoothstep(0., .12, d), clamp(d * 1.5 + .05, 0., 1.) * (1.2 - min(hh * 1.7, .9)));
}
