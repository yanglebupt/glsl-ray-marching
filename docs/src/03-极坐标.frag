#ifdef GL_ES
precision mediump float;  // 设置全局的 float 精度
#endif

#define PI 3.14159265359

uniform vec2 u_resolution;
uniform float u_time;


vec2 get_uv (vec2 coord) {
  return (2.0 * coord.xy - u_resolution) / u_resolution.y;
}

float atan2_0_1_(vec2 pos){
  return atan(pos.y, pos.x) / (2.0*PI) + 0.5;
}

vec2 polar(vec2 uv){
  return vec2(atan2_0_1_(uv), length(uv));
}

void main(){
  // vec2 uv = get_uv(gl_FragCoord.xy);  
  vec2 uv = polar(get_uv(gl_FragCoord.xy));  // 极坐标

  // uv.x += u_time*.1;  // 让极坐标的角度不停旋转
  uv.x += u_time*.1 + uv.y*.5;  // 角度和长度有关，实现扭曲

  float x = uv.x*8.;
  float d = min(fract(x), fract(1.-x));  // 三角波
  float m = smoothstep(0., 0.05, d*.6+.3-uv.y);  // d*m+n-uv.y 是为了把三角波曲线显示出来
  // 调整 m 可以让三角波更长 --》到极坐标就是，花瓣更长
  // 调整 n 可以让更高的 y 也对应显白，就是把平面提高了 --》到极坐标就是中心的白色圆范围更大，花芯更大

  vec3 col = m * vec3(2., .9, .1) * smoothstep(1., 0., uv.y);  // 着色，边缘暗，中心亮

  gl_FragColor = vec4(col, 1.0);
}