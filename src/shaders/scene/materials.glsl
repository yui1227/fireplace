// 材質：只決定反照率 A、自發光 E、光澤 G，打光統一在 main 做一次
// （避免陰影迴圈在程式碼裡被複製多份，ANGLE/D3D 編譯會爆量）
vec3 bricks(vec2 uv, float s) {
  vec2 bp = uv * vec2(1. / .21, 1. / .068);
  float row = floor(bp.y);
  bp.x += mod(row, 2.) * .5;
  vec2 f = fract(bp);
  float ex = max(.035, 1.2 * gFP / .21), ey = max(.1, 1.2 * gFP / .068);
  float g = smoothstep(0., ex, f.x) * smoothstep(1., 1. - ex, f.x) * smoothstep(0., ey, f.y) *
            smoothstep(1., 1. - ey, f.y);
  g = mix(g, .85, smoothstep(.4, 1., gFP / .068 * 4.));
  vec3 b = vec3(.36, .12, .065) * (.6 + .55 * h1(floor(bp))) * s;
  return mix(vec3(.05, .042, .036), b, g) * (1. + (.2 * noise(uv * 70.) - .1) * df(70.)) *
         (1. + (.24 * noise(uv * 300.) - .12) * df(300.));
}
void matLog(vec3 p, float fid, vec3 n, out vec3 A, out vec3 E) {
  vec3 a, b;
  float r;
  int id = int(fid + .5);
  logDef(id, a, b, r);
  float ch = id == 5 ? NL.z : 1.;
  vec3 ba = b - a;
  float len = length(ba);
  vec3 dir = ba / len;
  float al = dot(p - a, dir);
  vec3 rel = p - a - dir * al;
  vec3 u = normalize(cross(dir, vec3(0, 1, 0)));
  vec3 v = cross(u, dir);
  float ang = atan(dot(rel, v), dot(rel, u));
  float rad = length(rel) / r;
  vec3 hp = (p - vec3(0., .15, .22)) * vec3(2.6, 3.6, 4.);
  float hf = exp(-dot(hp, hp));
  float down = clamp(.5 - .6 * n.y, 0., 1.);
  A = vec3(0.);
  E = vec3(0.);
  if (al < .008 || al > len - .008) {
    vec3 vr = voro(vec2(rad * 6., ang * 2.5 + fid * 5.));
    float rings = .5 + .5 * sin(rad * 38. + noise(vec2(ang * 3., rad * 8.)) * 4.);
    vec3 alb = mix(vec3(.05, .03, .018), vec3(.11, .065, .035), rings) * (1. - .6 * smoothstep(.55, 1., rad));
    if (ch < .6) alb = mix(vec3(.33, .24, .14) * (.8 + .2 * rings), alb, ch / .6);
    A = alb;
    float rim = smoothstep(.75, 1., rad) * hf * ch;
    E = ember(rim * (.6 + .6 * noise(vec2(ang * 4., T * .5)))) * (1. - smoothstep(0., .06, vr.x)) * 1.4 +
        ember(rim * .35) * .4;
  } else {
    vec2 sc = vec2(al * .75, ang * r) / (r * .55) + fid * 7.;
    sc += (vec2(noise(sc * .7), noise(sc * .7 + 9.)) - .5) * .9;
    vec3 vr = voro(sc);
    float edge = vr.x;
    float bump = smoothstep(.02, .3, edge);
    float tn = noise(vec2(vr.y * 50. + T * (.25 + .5 * vr.z), vr.z * 30.));
    float heat =
        hf * (.25 + .95 * down) * (.3 + .9 * tn) * (.65 + .35 * I + .35 * FL) * ch * mix(.55, 1., FUEL);
    float crack = 1. - smoothstep(0., .03 + .12 * heat * heat, edge);
    vec3 alb = vec3(.03, .025, .022) * (.35 + .9 * bump) * (.75 + .5 * noise(sc * vec2(5., 1.3)));
    alb +=
        vec3(.16, .15, .14) * smoothstep(.82 - .35 * (1. - FUEL), .97, vr.z) * smoothstep(.1, .6, n.y) * bump;
    vec3 bark = vec3(.16, .1, .06) * (.55 + .6 * noise(vec2(al * 30., ang * 6.))) *
                (.7 + .5 * noise(vec2(al * 4., ang * 20.)));
    alb = mix(bark, alb, smoothstep(0., .6, ch));
    A = alb * (.5 + .5 * bump);
    E = ember(heat * 1.3) * crack * 1.6 +
        ember(heat * .45) * smoothstep(.6, .95, tn) * down * (1. - bump * .6) * .6;
  }
}
void matInterior(vec3 p, vec3 n, out vec3 A, out vec3 E) {
  E = vec3(0.);
  if (n.y > .7) {
    vec2 uv = p.xz;
    vec3 alb = vec3(.085, .08, .075) * (.55 + .7 * noise(uv * 35.)) *
               (.7 + .3 * mix(.5, noise(uv * 180.), df(180.)));
    vec2 ep = uv * 17.;
    ep += (vec2(noise(ep * .5), noise(ep * .5 + 5.)) - .5) * 1.3;
    vec3 v = voro(ep);
    float lump = smoothstep(0., .22, v.x);
    vec2 dq = vec2(p.x / .3, (p.z - .23) / .15);
    float hx = exp(-dot(dq, dq));
    float ht = hx * (.35 + .8 * noise(vec2(v.y * 40., T * .35 + v.z * 9.))) * (.65 + .35 * I + .3 * FL);
    float coal = step(.25, hx * (.4 + v.z));
    A = mix(alb, vec3(.02, .017, .015) * (.5 + lump), coal);
    E = coal * (ember(ht * 1.2) * (1. - lump) * 1.3 + ember(ht * .4) * lump * .3);
    return;
  }
  vec2 uv = abs(n.z) > .6 ? p.xy : vec2(p.z * sign(p.x), p.y);
  vec3 alb = bricks(uv, .7);
  float soot = smoothstep(.0, .42, p.y) * (.7 + .3 * smoothstep(.5, .0, abs(p.x)));
  alb *= mix(1., .1, soot);
  if (n.y < -.4) alb *= .1;
  A = alb;
}
void matExt(vec3 p, vec3 n, float m, out vec3 A, out vec3 E, out float G) {
  E = vec3(0.);
  if (m > 15.5) { // 掛畫
    vec2 q = (p.xy - vec2(0., MY + .36)) / vec2(.34, .21);
    float fr = step(.86, max(abs(q.x), abs(q.y) * 1.08));
    if (fr > .5 || n.z > -.5) {
      vec3 alb = vec3(.22, .14, .06) * (.7 + .4 * noise(q * vec2(40., 3.)));
      {
        A = alb;
        G = .5;
        return;
      }
    }
    vec2 u = q * .5 + .5;
    vec3 sky = mix(vec3(.55, .35, .25), vec3(.12, .16, .28), u.y);
    float hill = .45 + .12 * sin(u.x * 5. + 1.) + .05 * sin(u.x * 13.);
    float hill2 = .3 + .08 * sin(u.x * 4. + 3.);
    vec3 alb = sky;
    alb = mix(alb, vec3(.15, .2, .14), step(u.y, hill));
    alb = mix(alb, vec3(.08, .12, .08), step(u.y, hill2));
    alb += vec3(.6, .45, .2) * exp(-dot(u - vec2(.7, .62), u - vec2(.7, .62)) * 400.);
    alb *= .8 + .25 * mix(.5, noise(u * vec2(120., 60.)), df(180.));
    {
      A = alb;
      G = .1;
      return;
    }
  }
  if (m > 14.5) { // 備用柴
    if (abs(n.z) > .75) {
      float rr = fract(length(p.xy - vec2(floor((p.x - .93) / .135) * .135 + 1., 0.)) * 90.);
      vec3 alb = vec3(.4, .28, .16) * (.75 + .25 * rr);
      {
        A = alb;
        G = 0.;
        return;
      }
    }
    vec3 alb = vec3(.14, .07, .032) * (.55 + .6 * noise(vec2(p.z * 6., atan(p.y, p.x) * 40. + p.x * 30.))) *
               (.7 + .4 * mix(.5, noise(p.xy * 90.), df(90.)));
    {
      A = alb;
      G = .05;
      return;
    }
  }
  if (m > 13.5) {
    A = vec3(.04, .12, .13) * (.9 + .1 * noise(p.xy * 50.));
    G = 1.5;
    return;
  }
  if (m > 11.5) { // 地毯
    vec2 q = vec2(p.x / .9, (p.z + .98) / .46);
    float b = max(abs(q.x), abs(q.y));
    vec3 alb = vec3(.32, .06, .05);
    if (b > .9)
      alb = vec3(.1, .08, .12);
    else if (b > .82)
      alb = vec3(.55, .45, .3);
    else {
      vec2 g = fract(q * vec2(4., 2.)) - .5;
      float dm = abs(g.x) + abs(g.y);
      alb = mix(alb, vec3(.55, .45, .3), smoothstep(.36, .33, dm) * smoothstep(.27, .3, dm));
      alb = mix(alb, vec3(.08, .1, .18), smoothstep(.15, .12, dm));
    }
    alb *= .75 + .35 * mix(.5, noise(p.xz * 400.), df(400.));
    {
      A = alb;
      G = 0.;
      return;
    }
  }
  if (m > 10.5) {
    vec3 alb = vec3(.025, .024, .023);
    {
      A = alb;
      G = 2.5;
      return;
    }
  }              // 鐵柵欄
  if (m > 9.5) { // 木壁爐台
    vec3 alb = vec3(.2, .1, .05) *
               (.65 + .45 * mix(.5, noise(vec2(p.x * 3., (p.y + p.z) * 160.)), df(160.))) *
               (.85 + .2 * noise(p.xz * 50.));
    {
      A = alb;
      G = .4;
      return;
    }
  }
  if (m > 8.5) { // 磚牆
    vec3 alb = bricks(p.xy + vec2(.07, 0.), .85);
    {
      A = alb;
      G = .03;
      return;
    }
  }
  if (m > 7.5) { // 木地板
    vec2 uv = vec2(p.x, p.z);
    float pl = floor(uv.y / .13);
    float off = h1(vec2(pl, 3.)) * 3.;
    float seamZ =
        smoothstep(0., .006, fract(uv.y / .13) * .13) * smoothstep(.13, .124, fract(uv.y / .13) * .13);
    float seg = floor((uv.x + off) / 1.1);
    float seamX = smoothstep(0., .004, fract((uv.x + off) / 1.1) * 1.1);
    float grain = noise(vec2(uv.x * 3. + off, uv.y * 80.)) * .5 * df(80.) + .25 * (1. - df(80.)) +
                  mix(.25, noise(vec2(uv.x * 20., uv.y * 300.)) * .5, df(300.));
    vec3 alb = vec3(.26, .14, .07) * (.6 + .6 * h1(vec2(pl, seg))) * (.75 + .45 * grain) * seamZ * seamX;
    {
      A = alb;
      G = .35;
      return;
    }
  }
  if (m > 6.5) { // 石板爐床
    float sl = floor((p.x + 1.) / .4);
    float seam = smoothstep(0., .005, fract((p.x + 1.) / .4) * .4);
    vec3 alb = vec3(.27, .25, .23) * (.75 + .35 * h1(vec2(sl, 1.))) * (.8 + .3 * noise(p.xz * 40.)) *
               mix(1., seam, step(.5, n.y));
    {
      A = alb;
      G = .15;
      return;
    }
  }
  if (m > 5.5) { // 金屬爐框
    vec3 alb = vec3(.16, .155, .15) * (.85 + .15 * mix(.5, noise(p.xy * vec2(200., 8.)), df(200.)));
    float inner = smoothstep(.06, 0., max(abs(p.x) - .5, max(p.y - HP, 0.)));
    A = alb;
    G = 1.2;
    E = vec3(1., .4, .12) * inner * .08 * I;
    return;
  }
  vec2 uv = abs(n.z) > .6 ? p.xy : (abs(n.x) > .6 ? vec2(p.z, p.y) : p.xz);
  vec3 alb = bricks(uv + vec2(.3, .0), 1.);
  vec2 sq = vec2(p.x / .45, (p.y - HP - .12) / .15);
  alb *= 1. - .55 * exp(-dot(sq, sq)) * step(.6, abs(n.z));
  {
    A = alb;
    G = .05;
    return;
  }
}
