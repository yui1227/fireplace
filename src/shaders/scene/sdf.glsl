// 場景幾何（距離場）
// 材質編號：0-4 火堆木柴, 5 爐體, 6 金屬框, 7 爐床, 8 地板, 9 磚牆,
//           10 壁爐台, 11 柵欄, 12 地毯, 14 花瓶, 15 備用柴, 16 掛畫, 17 新添的木柴,
//           18 壁燈燈座, 19 壁燈燈罩
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.);
}
void logDef(int i, out vec3 a, out vec3 b, out float r) {
  if (i == 0) {
    a = vec3(-.4, .085, .35);
    b = vec3(.41, .095, .32);
    r = .08;
  } else if (i == 1) {
    a = vec3(-.37, .072, .1);
    b = vec3(.35, .068, .13);
    r = .07;
  } else if (i == 2) {
    a = vec3(-.3, .075, .04);
    b = vec3(.12, .22, .36);
    r = .058;
  } else if (i == 3) {
    a = vec3(.31, .072, .05);
    b = vec3(-.1, .23, .35);
    r = .056;
  } else if (i == 4) {
    a = vec3(-.17, .215, .2);
    b = vec3(.21, .19, .25);
    r = .046;
  } else {
    a = vec3(-.3, .3 + NL.y, .16);
    b = vec3(.31, .285 + NL.y, .22);
    r = .058 * mix(.65, 1., NL.w);
    return;
  }
  float sh = mix(.6, 1., FUEL);
  float dy = (1. - FUEL) * r * .45;
  r *= sh;
  a.y -= dy;
  b.y -= dy;
}
float sdCyl(vec3 p, vec3 a, vec3 b, float r) {
  vec3 ba = b - a, pa = p - a;
  float baba = dot(ba, ba), paba = dot(pa, ba);
  float x = length(pa * baba - ba * paba) - r * baba, y = abs(paba - baba * .5) - baba * .5;
  float x2 = x * x, y2 = y * y * baba;
  float d = (max(x, y) < 0.) ? -min(x2, y2) : (((x > 0.) ? x2 : 0.) + ((y > 0.) ? y2 : 0.));
  return sign(d) * sqrt(abs(d)) / baba;
}
float cavity(vec3 p) {
  float zc = max(p.z, 0.);
  return max(max(-p.y, p.y - (HP + .25 * zc)), max(abs(p.x) - (.5 - .3 * zc), max(-(p.z + .4), p.z - .46)));
}
#define MY .93
float sdVC(vec3 p, float r, float h) {
  vec2 d = vec2(length(p.xz) - r, abs(p.y - h * .5) - h * .5);
  return min(max(d.x, d.y), 0.) + length(max(d, 0.));
}
vec2 map(vec3 p) {
  vec2 res = vec2(p.y + .09, 8.);
  float w = SD - .02 - p.z;
  if (w < res.x) res = vec2(w, 9.);
  float mass = sdBox(p - vec3(0., 1.45, SD * .5 - .02), vec3(SW, 1.54, SD * .5)) - .006;
  float cav = cavity(p);
  float sur = max(mass, -cav);
  if (sur < res.x) res = vec2(sur, 5.);
  float fr = max(sdBox(p - vec3(0., HP * .5, -.03), vec3(.56, HP * .5 + .05, .018)) - .004, -cav);
  if (fr < res.x) res = vec2(fr, 6.);
  float hr = sdBox(p - vec3(0., -.05, -.12), vec3(SW + .08, .04, .16)) - .004;
  if (hr < res.x) res = vec2(hr, 7.);
  float mt = sdBox(p - vec3(0., MY, .04), vec3(SW + .1, .03, .14)) - .008;
  if (mt < res.x) res = vec2(mt, 10.);
  float db = sdBox(p - vec3(0., MY + .3, -.04), vec3(SW, .3, .1));
  if (db < res.x) {
    vec3 q = p - vec3(.5, MY + .038, .0);
    float body = (length((q - vec3(0., .085, 0.)) / vec3(.068, .09, .068)) - 1.) * .06;
    float neck = sdVC(q - vec3(0., .14, 0.), .026, .09);
    float vs = min(body, neck) - .002;
    vs = max(vs, -sdVC(q - vec3(0., .17, 0.), .02, .1));
    if (vs < res.x) res = vec2(vs, 14.);
    float pic = sdBox(p - vec3(0., MY + .36, -.034), vec3(.34, .21, .012)) - .003;
    if (pic < res.x) res = vec2(pic, 16.);
  }
  float sb = sdBox(p - vec3(0., .14, -.18), vec3(.63, .17, .1));
  if (sb < res.x) {
    // 弧形柵欄：圓心在爐內，半徑 FR
    const float FR = 1.131, FZ = .871, HA = .54;
    vec2 dd = p.xz - vec2(0., FZ);
    float rr = length(dd);
    float an = atan(dd.x, -dd.y);
    float sa = an * FR, dr = rr - FR, y = p.y;
    float lim = abs(an) - HA;
    float bx = sa - .045 * clamp(floor(sa / .045 + .5), -13., 13.);
    float bars = max(length(vec2(bx, dr)) - .0055, abs(y - .125) - .135);
    float r1 = max(length(vec2(y - .235, dr)) - .01, lim * FR);
    float r2 = max(length(vec2(y - .045, dr)) - .008, lim * FR);
    float ft = max(max(abs(dr) - .03, abs(y + .004) - .006), lim * FR - .01);
    float fin = max(length(vec3(bx, y - .27, dr)) - .012, lim * FR);
    float scr = min(min(bars, min(r1, r2)), min(ft, fin)) * .9;
    if (scr < res.x) res = vec2(scr, 11.);
  }
  // 壁爐兩側的壁燈（左右對稱）：牆上的底座、伸出的燈臂、圓筒燈罩
  float lb = sdBox(p - vec3(0., SCONCE.y, SCONCE.z), vec3(SCONCE.x + .2, .2, .16));
  if (lb < res.x) {
    vec3 q = vec3(abs(p.x) - SCONCE.x, p.y - SCONCE.y, p.z);
    float plate = sdBox(q - vec3(0., -.02, SD - .03), vec3(.035, .07, .01)) - .004;
    float arm =
        sdBox(q - vec3(0., -.075, (SCONCE.z + SD - .02) * .5), vec3(.008, .008, (SD - .02 - SCONCE.z) * .5));
    float bracket = min(plate, arm - .002);
    if (bracket < res.x) res = vec2(bracket, 18.);
    vec3 sq = q - vec3(0., 0., SCONCE.z);
    float rr = .075 - .02 * clamp((sq.y + .07) / .14, 0., 1.); // 上窄下寬
    float rho = length(sq.xz);
    float shade = max(max(rho - rr, abs(sq.y) - .07), -(rho - rr + .008)) - .002;
    if (shade < res.x) res = vec2(shade, 19.);
  }
  float rg = sdBox(p - vec3(0., -.087, -.98), vec3(.9, .004, .46)) - .002;
  if (rg < res.x) res = vec2(rg, 12.);
  float wb = sdBox(p - vec3(1.16, .12, -.12), vec3(.25, .24, .25));
  if (wb < res.x) {
    for (int i = ZERO; i < 6; i++) {
      float fi = float(i);
      vec2 c = i < 3 ? vec2(1.0 + fi * .135, -.025)
                     : (i < 5 ? vec2(1.07 + (fi - 3.) * .135, .095) : vec2(1.135, .21));
      float rr = .062 + .006 * sin(fi * 3.7);
      float d = sdCyl(p, vec3(c.x, c.y, -.32 + .03 * sin(fi * 2.1)),
                      vec3(c.x, c.y, .06 - .03 * cos(fi * 1.3)), rr - .006) -
                .006;
      if (d < res.x) res = vec2(d, 15.);
    }
  }
  float fb = sdBox(p - vec3(0., .17 + max(NL.y, 0.) * .5, .22), vec3(.5, .22 + max(NL.y, 0.) * .5, .28));
  if (fb < res.x) {
    for (int i = ZERO; i < 5; i++) {
      vec3 a, b;
      float r;
      logDef(i, a, b, r);
      float d = sdCyl(p, a, b, r - .01) - .01;
      d -= .003 * sin(p.x * 70. + p.z * 55.) * sin(p.y * 60. + p.x * 20.);
      if (d < res.x) res = vec2(d, float(i));
    }
    if (NL.x > .5) {
      vec3 a, b;
      float r;
      logDef(5, a, b, r);
      float d = sdCyl(p, a, b, r - .01) - .01;
      if (d < res.x) res = vec2(d, 17.);
    }
  }
  return res;
}
vec3 calcN(vec3 p) {
  vec3 n = vec3(0.);
  for (int i = ZERO; i < 4; i++) {
    vec3 e = .5773 * (2. * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.);
    n += e * map(p + .0012 * e).x;
  }
  return normalize(n);
}
