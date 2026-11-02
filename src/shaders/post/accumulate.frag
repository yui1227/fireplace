// 時間累積抗鋸齒：鄰域夾值避免殘影
in vec2 vUv;
out vec4 o;
uniform sampler2D S, P;
uniform vec2 TX;
uniform float AL;
void main() {
  vec3 c = dec(texture(S, vUv).rgb);
  vec3 mn = c, mx = c;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec3 q = dec(texture(S, vUv + TX * vec2(i, j)).rgb);
      mn = min(mn, q);
      mx = max(mx, q);
    }
  vec3 p = clamp(dec(texture(P, vUv).rgb), mn, mx);
  o = vec4(enc(mix(p, c, AL)), 1.);
}
