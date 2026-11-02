// 最後合成：熱氣扭曲、光暈、ACES 色調映射、gamma、底片顆粒
in vec2 vUv;
out vec4 o;
uniform sampler2D S, B1, B2;
uniform float T, HS;
uniform vec2 R;
uniform vec4 HZ;
void main() {
  vec2 hq = (vUv - HZ.xy) / HZ.zw;
  float hm = exp(-hq.x * hq.x * 2.5) * smoothstep(-1., .0, hq.y) * smoothstep(1.4, .2, hq.y);
  vec2 off = vec2(noise(vUv * vec2(38., 20.) + vec2(0., -T * 2.2)) - .5,
                  noise(vUv * vec2(30., 16.) + vec2(7., -T * 1.8)) - .5);
  vec2 su = vUv + off * hm * HS / R * R.y * .0045;
  vec3 c = dec(texture(S, su).rgb);
  c += dec(texture(B1, vUv).rgb) * .5 + dec(texture(B2, vUv).rgb) * 1.;
  c *= 1.15 * (1. - .45 * dot(vUv - .5, vUv - .5));
  c = (c * (2.51 * c + .03)) / (c * (2.43 * c + .59) + .14);
  c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
  c += (h1(vUv * R + fract(T * 13.7) * vec2(91., 37.)) - .5) * .035 * (c + .02);
  o = vec4(c, 1.);
}
