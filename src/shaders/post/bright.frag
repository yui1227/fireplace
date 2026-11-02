// 光暈第一步：降取樣並取出亮部
in vec2 vUv;
out vec4 o;
uniform sampler2D S;
uniform vec2 TX;
uniform float TH;
void main() {
  vec3 c = vec3(0.);
  c += dec(texture(S, vUv + TX * vec2(-1, -1)).rgb);
  c += dec(texture(S, vUv + TX * vec2(1, -1)).rgb);
  c += dec(texture(S, vUv + TX * vec2(-1, 1)).rgb);
  c += dec(texture(S, vUv + TX * vec2(1, 1)).rgb);
  c *= .25;
  c = max(c - TH, 0.);
  o = vec4(enc(c), 1.);
}
