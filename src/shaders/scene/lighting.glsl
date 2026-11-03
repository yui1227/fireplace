// 打光：爐膛內（火光點光源＋軟陰影）與房間（爐口火光、反射光、月光窗影）
vec3 LP() {
  return vec3(.04 * sin(T * 1.7) + .02 * sin(T * 4.1), .27 + .025 * sin(T * 2.3), .23);
}
float LI() {
  return (1.1 + .5 * FL) * I * (.9 + .2 * noise(vec2(T * 9., 1.)));
}
float shadow(vec3 p, vec3 l) {
  vec3 d = l - p;
  float L = length(d);
  d /= L;
  float res = 1., t = .015;
  for (int i = ZERO; i < 20; i++) {
    float h = map(p + d * t).x;
    res = min(res, 9. * h / t);
    t += clamp(h, .008, .08);
    if (res < .02 || t > L) break;
  }
  return clamp(res, 0., 1.);
}
vec3 lightIn(vec3 p, vec3 n, float sh) {
  vec3 l = LP() - p;
  float d2 = dot(l, l);
  l = normalize(l);
  vec3 c = vec3(1., .42, .13) * LI() * max(dot(n, l), 0.) / (1. + 20. * d2) * sh * 1.6;
  vec3 l2 = vec3(0., .03, .23) - p;
  float e2 = dot(l2, l2);
  c += vec3(1., .3, .07) * .55 * I * max(dot(n, normalize(l2)), 0.) / (1. + 45. * e2);
  return c + vec3(1., .35, .1) * .015 * I;
}
float shadowL(vec3 p, vec3 l, float k) {
  vec3 d = l - p;
  float L = length(d);
  d /= L;
  float res = 1., t = .02;
  for (int i = ZERO; i < 18; i++) {
    float h = map(p + d * t).x;
    res = min(res, k * h / t);
    t += clamp(h, .02, .3);
    if (res < .02 || t > L - .05) break;
  }
  return clamp(res, 0., 1.);
}
vec3 lightRoom(vec3 p, vec3 n, vec3 rd, float gloss) {
  vec3 o = vec3(.02 * sin(T * 1.7), .26, -.05);
  vec3 lo = o - p;
  float d2 = dot(lo, lo);
  float dl = sqrt(d2);
  vec3 ld = lo / dl;
  float emit = clamp(-(p.z - o.z) / dl * 1.3, 0., 1.);
  float fl = LI();
  float fs = 1.;
  if (p.z < -.06 && emit > 0. && d2 < 3.) fs = shadowL(p + n * .003, o, 14.);
  vec3 c = vec3(1., .43, .15) * fl * .55 * max(dot(n, ld), 0.) * emit / (1. + 1.2 * d2) * fs;
  vec3 hv = normalize(ld - rd);
  c += vec3(1., .5, .2) * fl * gloss * pow(max(dot(n, hv), 0.), 40.) * emit / (1. + 1.2 * d2) * fs;
  vec3 bo = vec3(0., .4, -.6) - p;
  float bd = dot(bo, bo);
  c += vec3(1., .5, .25) * fl * .05 * (.55 + .45 * max(dot(n, normalize(bo)), 0.)) / (1. + .35 * bd);
  c += vec3(.013, .013, .016) * (.6 + .4 * n.y);
  // 壁燈：燈罩上下開口，光主要往上、往下打在牆上
  if (LAMP > 0.) {
    for (int k = ZERO; k < 2; k++) {
      vec3 lp = vec3(k == 0 ? -SCONCE.x : SCONCE.x, SCONCE.y, SCONCE.z);
      vec3 l = lp - p;
      float d2 = dot(l, l);
      vec3 ld = l * inversesqrt(d2);
      float cone = .3 + .7 * smoothstep(.35, .85, abs(ld.y));
      float nl = max(dot(n, ld), 0.);
      float spec = gloss * .5 * pow(max(dot(n, normalize(ld - rd)), 0.), 30.);
      c += vec3(1., .7, .42) * LAMP * .2 * cone * (nl + spec) / (.02 + 2.2 * d2);
    }
  }
  if (MOON > 0.) {
    vec3 ML = normalize(vec3(-.84, .52, -.12));
    float nm = max(dot(n, ML), 0.);
    if (nm > 0.) {
      float tw = (-2.4 - p.x) / ML.x;
      vec2 w = vec2(p.z + ML.z * tw, p.y + ML.y * tw);
      vec2 wc = w - vec2(-1.27, 1.5);
      float m = smoothstep(.04, 0., max(abs(wc.x) - .4, abs(wc.y) - .55));
      m *= smoothstep(.012, .03, abs(wc.x)) * smoothstep(.012, .03, abs(wc.y)) *
           smoothstep(.01, .025, abs(wc.y - .28)) * smoothstep(.01, .025, abs(wc.y + .28));
      if (m > 0.) m *= shadowL(p + n * .003, p + ML * 2.5, 16.);
      c += vec3(.42, .56, .95) * MOON * .16 * m *
           (nm + gloss * .8 * pow(max(dot(n, normalize(ML - rd)), 0.), 40.));
    }
    c += vec3(.006, .009, .018) * MOON * (.5 + .5 * n.y);
  }
  return c;
}
