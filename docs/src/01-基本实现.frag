#ifdef GL_ES
precision mediump float;  // 设置全局的 float 精度
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

const float PI = 3.14159265359;

// 归一化 [-1, 1]，原点在中心，同时保持宽高比
vec2 get_uv (vec2 coord) {
  return (2.0 * coord.xy - u_resolution) / u_resolution.y;
}

/////////////sdf//////////////////
float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}
float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float opSmoothUnion( float d1, float d2, float k )
{
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h);
}
//////////////Transform/////////////////
mat2 rotate2D(float angle){
  float s = sin(angle);
  float c = cos(angle);
  return mat2(
    c,s,
    -s,c
  );
}
//////////////////////////////


// 点到场景的距离，点在表面 =0，点在外 >0，点在内 <0
float scene (vec3 p) {
  vec3 center = vec3(sin(u_time)*3., 0., 0.);

  float sphere = sdSphere(p - center, 1.0);

  vec3 q = p;
  q.xy *= rotate2D(PI/10.0);
  
  float box = sdBox(q, vec3(.75));

  float groud = p.y + .75;
  
  return opSmoothUnion(groud, opSmoothUnion(sphere, box, 2.), .3); 
}

void main(){
  vec2 uv = get_uv(gl_FragCoord.xy); 
  vec2 ms = get_uv(u_mouse); 


  // 初始化射线
  vec3 ro = vec3(0.0, 0.0, -4.0); // 射线原点，也就是相机位置
  vec3 rd = normalize(vec3(uv, 1.0)); // 画布每个像素点都发射一条射线，最后的 1 可以用来调值相机的 FOV
  float t = 0.0;

  // 旋转相机
  // 先绕 x 轴旋转
  ro.yz *= rotate2D(ms.y * step(0.0, -ms.y) * PI);
  rd.yz *= rotate2D(ms.y * step(0.0, -ms.y) * PI);
  // 再绕 y 轴旋转
  ro.xz *= rotate2D(ms.x * PI * 2.);
  rd.xz *= rotate2D(ms.x * PI * 2.);

  vec3 col = vec3(0.);

  // 开始步进
  for(int i = 0; i < 80; i++){
    vec3 p = ro + t * rd;
    float d = scene(p);
    t += d; // 累加距离，d 接近 0，代表接触表面，也就是 t 不再变化了
    if ( d < .001 || t > 100.) break;  // 避免增加一些性能消耗
  }

  col = vec3(t * .1);  // depth buffer，乘以缩放因子，越小显示更远的地方
  gl_FragColor = vec4(col, 1);
}