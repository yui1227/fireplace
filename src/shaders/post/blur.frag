// 光暈：可分離高斯模糊
in vec2 vUv;
out vec4 o;
uniform sampler2D S;
uniform vec2 DIR;
void main() {
  vec3 c = dec(texture(S, vUv).rgb) * .227027;
  c += (dec(texture(S, vUv + DIR * 1.3846).rgb) + dec(texture(S, vUv - DIR * 1.3846).rgb)) * .3162162;
  c += (dec(texture(S, vUv + DIR * 3.2308).rgb) + dec(texture(S, vUv - DIR * 3.2308).rgb)) * .0702703;
  o = vec4(enc(c), 1.);
}
