// 場景著色器：輸出、uniform 與全域常數
// HP 爐口高度、SW 爐體半寬、SH 爐體高、SD 爐體深度（單位：爐口寬）
out vec4 o;
uniform int ZERO;
uniform vec2 R, JIT;
uniform float T, I, FL, FT, FUEL, STEPS, MOON, SMK, LAMP;
uniform vec3 CAM, TGT;
uniform vec4 NL;
float gFP = .001;
float df(float fr) {
  return smoothstep(.45, .12, fr * gFP);
}
#define HP .6
#define SW .74
#define SH 1.12
#define SD .34
// 壁燈位置（x 取正負兩盞）
const vec3 SCONCE = vec3(1.12, 1.16, .2);
