// 主程式：光線步進 → 材質 → 打光 → 體積火焰與煙 → 輸出
void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = ((fc + JIT) / R) * 2. - 1.;
  vec3 f = normalize(TGT - CAM);
  vec3 rr = normalize(cross(vec3(0, 1, 0), f));
  vec3 uu = cross(f, rr);
  vec3 ro = CAM, rd = normalize(f + uv.x * FT * (R.x / R.y) * rr + uv.y * FT * uu);
  float t = .05, tl = -1.;
  vec2 hm = vec2(0.);
  for (int i = ZERO; i < 128; i++) {
    vec3 p = ro + rd * t;
    hm = map(p);
    if (abs(hm.x) < .0005 * t) {
      tl = t;
      break;
    }
    t += hm.x * .85;
    if (t > 14.) break;
  }
  vec3 col = vec3(0.);
  float tEnd = 14.;
  if (tl > 0.) {
    tEnd = tl;
    vec3 p = ro + rd * tl;
    vec3 n = calcN(p);
    gFP = tl * FT * 2. / R.y / max(abs(dot(n, rd)), .25);
    vec3 A, E;
    float G = 0.;
    bool inside = false;
    if (hm.y < 4.5) {
      matLog(p, hm.y, n, A, E);
      inside = true;
    } else if (hm.y > 16.5 && hm.y < 17.5) {
      matLog(p, 5., n, A, E);
      inside = true;
    } else if (hm.y < 5.5 && p.z > .004 && abs(p.x) < .505 && p.y < HP + .14) {
      matInterior(p, n, A, E);
      inside = true;
    } else
      matExt(p, n, hm.y, A, E, G);
    if (inside)
      col = A * lightIn(p, n, shadow(p + n * .004, LP())) + E;
    else
      col = A * lightRoom(p, n, rd, G) + E;
  }
  vec3 bmin = vec3(-.48, .03, .0), bmax = vec3(.48, HP + .3, .46);
  vec3 i0 = (bmin - ro) / rd, i1 = (bmax - ro) / rd;
  vec3 mn = min(i0, i1), mx = max(i0, i1);
  float tn = max(max(mn.x, mn.y), mn.z), tf = min(min(min(mx.x, mx.y), mx.z), tEnd);
  vec3 e = vec3(0.);
  float tr = 1.;
  if (tf > tn && tf > 0.) {
    tn = max(tn, 0.);
    float dt = (tf - tn) / STEPS;
    float s = tn + dt * h1(fc * .731 + fract(T * 7.31) * vec2(13., 7.));
    int NS = int(STEPS);
    for (int i = ZERO; i < NS; i++) {
      vec3 pp = ro + rd * s;
      vec2 q = fireAt(pp);
      if (q.x > 0.) {
        float k = q.y;
        vec3 c = vec3(1., .1 + .62 * k, .02 + .32 * k * k) * (.18 + 3.6 * k * k * k);
        e += c * q.x * dt * tr * 19.;
        tr *= exp(-q.x * dt * .8);
      } else if (SMK > 0. && pp.y > .22 && pp.z > .04) {
        vec3 sp = pp * vec3(6., 2.6, 6.) + vec3(0., -T * .55, T * .05);
        float sw = n3(sp * .5 + vec3(0., 0., T * .1));
        float sd = n3(sp + vec3(sw * 2., 0., 0.)) * .65 + n3(sp * 2.3) * .35;
        float env = exp(-pp.x * pp.x / (.04 + .25 * (pp.y - .22))) * smoothstep(.22, .38, pp.y);
        float dn = max(sd - .5, 0.) * env * SMK * (.4 + .6 * I) * 2.2;
        if (dn > 0.) {
          vec3 sc = vec3(.32, .17, .09) * I * exp(-(pp.y - .25) * 4.) + vec3(.012, .011, .011);
          e += sc * dn * dt * tr * 18.;
          tr *= exp(-dn * dt * 16.);
        }
      }
      s += dt;
      if (s > tf) break;
    }
  }
  col = col * tr + e;
  col = max(col, 0.);
  if (any(isnan(col)) || any(isinf(col))) col = vec3(0.);
  o = vec4(enc(col), 1.);
}
