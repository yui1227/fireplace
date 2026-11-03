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
// 房間打光。三個會投影的光源（爐口火光、月光、跟著鏡頭的頂燈）的陰影
// 放在同一個迴圈裡算，讓 shadowL() 在程式碼裡只出現一次（見 CLAUDE.md）。
vec3 lightRoom(vec3 p, vec3 n, vec3 rd, float gloss) {
  float fl = LI();

  // 0：爐口火光
  vec3 o = vec3(.02 * sin(T * 1.7), .26, -.05);
  vec3 lo = o - p;
  float d2 = dot(lo, lo);
  float dl = sqrt(d2);
  vec3 ld = lo / dl;
  float emit = clamp(-(p.z - o.z) / dl * 1.3, 0., 1.);
  float fireDiff = max(dot(n, ld), 0.) * emit;

  // 1：月光窗格（窗戶在畫面左外側，用投影到窗面的座標決定窗格遮罩）
  vec3 ML = normalize(vec3(-.84, .52, -.12));
  float nm = max(dot(n, ML), 0.);
  float moonMask = 0.;
  if (MOON > 0. && nm > 0.) {
    float tw = (-2.4 - p.x) / ML.x;
    vec2 wc = vec2(p.z + ML.z * tw, p.y + ML.y * tw) - vec2(-1.27, 1.5);
    moonMask = smoothstep(.04, 0., max(abs(wc.x) - .4, abs(wc.y) - .55));
    moonMask *= smoothstep(.012, .03, abs(wc.x)) * smoothstep(.012, .03, abs(wc.y)) *
                smoothstep(.01, .025, abs(wc.y - .28)) * smoothstep(.01, .025, abs(wc.y + .28));
  }

  // 2：頂燈（鏡頭右後上方，跟著鏡頭移動）
  vec3 hl = HEAD - p;
  float h2 = dot(hl, hl);
  vec3 hd = hl * inversesqrt(h2);
  float headDiff = max(dot(n, hd), 0.);

  // 陰影：每個光源各算一次，但呼叫點只有一個
  float sh[3];
  for (int k = ZERO; k < 3; k++) {
    vec3 target = k == 0 ? o : (k == 1 ? p + ML * 2.5 : HEAD);
    bool need = k == 0   ? (p.z < -.06 && fireDiff > 0. && d2 < 3.)
                : k == 1 ? moonMask > 0.
                         : (HEADI > 0. && headDiff > 0.);
    sh[k] = need ? shadowL(p + n * .003, target, k == 0 ? 14. : (k == 1 ? 16. : 10.)) : 1.;
  }

  float fireFall = fl / (1. + 1.2 * d2) * sh[0];
  vec3 c = vec3(1., .43, .15) * .55 * fireDiff * fireFall;
  c += vec3(1., .5, .2) * gloss * pow(max(dot(n, normalize(ld - rd)), 0.), 40.) * emit * fireFall;

  // 房間裡的反射光與環境光
  vec3 bo = vec3(0., .4, -.6) - p;
  c += vec3(1., .5, .25) * fl * .05 * (.55 + .45 * max(dot(n, normalize(bo)), 0.)) / (1. + .35 * dot(bo, bo));
  c += vec3(.013, .013, .016) * (.6 + .4 * n.y);

  // 月光
  if (MOON > 0.) {
    c += vec3(.42, .56, .95) * MOON * .16 * moonMask * sh[1] *
         (nm + gloss * .8 * pow(max(dot(n, normalize(ML - rd)), 0.), 40.));
    c += vec3(.006, .009, .018) * MOON * (.5 + .5 * n.y);
  }

  // 頂燈：暖白色，帶光澤反光（鏡頭移動時反光位置會跟著變）
  if (HEADI > 0.) {
    float spec = gloss * pow(max(dot(n, normalize(hd - rd)), 0.), 24.);
    c += vec3(1., .84, .66) * HEADI * (headDiff + spec) / (1. + .12 * h2) * sh[2];
  }

  // 壁燈（不投影）：燈罩上下開口，光主要往上、往下打在牆上
  if (LAMP > 0.) {
    for (int k = ZERO; k < 2; k++) {
      vec3 l = vec3(k == 0 ? -SCONCE.x : SCONCE.x, SCONCE.y, SCONCE.z) - p;
      float s2 = dot(l, l);
      vec3 sd = l * inversesqrt(s2);
      float cone = .3 + .7 * smoothstep(.35, .85, abs(sd.y));
      float spec = gloss * .5 * pow(max(dot(n, normalize(sd - rd)), 0.), 30.);
      c += vec3(1., .7, .42) * LAMP * .2 * cone * (max(dot(n, sd), 0.) + spec) / (.02 + 2.2 * s2);
    }
  }
  return c;
}
