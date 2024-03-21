#ifdef GL_ES
precision mediump float;  // 设置全局的 float 精度
#endif

#define MAX_ITERS 80
#define MIN_DIS .001
#define MAX_DIS 100.
#define PI 3.14159265359

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;


vec2 get_uv (vec2 coord) {
  return (2.0 * coord.xy - u_resolution) / u_resolution.y;
}

vec3 LookAt(vec3 uv, vec3 ori, vec3 target, vec3 up) {
  vec3 z = normalize(target - ori),
      x = normalize(cross(up, z)),
      y = cross(z, x);
  // 上面三行就是在求相机坐标系的基
  vec3 d = normalize(uv.x*x + uv.y*y + uv.z*z); // 转到世界坐标系
  return d;
}

mat2 rotate2D(float angle){
  float s = sin(angle);
  float c = cos(angle);
  return mat2(
    c,s,
    -s,c
  );
}

float sdBox(vec3 p, vec3 r){
  vec3 d = abs(p) - r;
  return length(max(d, 0.)) + min(max(max(d.x, d.y), d.z), 0.);
}

float sdSphere(vec3 p, float r){
  return length(p) - r;
}

float GetDis(vec3 p){
  vec3 bp = p - vec3(0., 1., 6.);

  bp.xz = abs(bp.xz) - 1.5;

  float scale = mix(1., 3., smoothstep(0., 1., bp.y));
  bp.xz *= scale;
  
  float box = sdBox(bp, vec3(1.)) / scale; 
  box -= sin(bp.x*7.5+u_time*5.)*.02/scale;

  float ground = dot(p, normalize(vec3(0., 1., 0.)));

  return min(box, ground);
}

float RayMarch(vec3 ro, vec3 rd){
  float t = 0.;
  for(int i = 0; i < MAX_ITERS; i++){
    vec3 p = ro + rd * t;
    float d = GetDis(p);
    t+=d;
    if(abs(d) < MIN_DIS || t > MAX_DIS) break;
  }
  return t;
}

// 通过对场景进行差分求解梯度，作为法线
vec3 GetNormal(vec3 p){
  vec2 e = vec2(.001, 0.);
  float d = GetDis(p);
  return normalize(
    d - vec3(
      GetDis(p - e.xyy),
      GetDis(p - e.yxy),
      GetDis(p - e.yyx)
    )
  );
}

// 计算漫反射光照
float GetDifLight(vec3 p){
  vec3 lightPos = vec3(0., 5., 9.);  // 后上方

  vec3 n = GetNormal(p);
  vec3 l = normalize(lightPos - p);

  float dif = clamp(dot(l, n)*.5+.5, 0., 1.); // 给场景一个默认环境光强 0.5，而不是全黑

  // 计算阴影
  float d = RayMarch(p + n * MIN_DIS * 95., l);
  if(p.y<.01 && d < length(lightPos-p)) dif*=.1;
  return dif;
}

vec3 RotateAround(vec3 center, vec3 offset, vec2 ms){
  float maxYAngle = PI * .49 - (PI - atan(offset.y, offset.z)); // 防止溢出 PI/2，出现反向
  offset.yz *= rotate2D(-ms.y * maxYAngle);
  offset.xz *= rotate2D(ms.x * 2. * PI);
  return center + offset;
}

void main(){
  vec2 uv = get_uv(gl_FragCoord.xy);
  vec2 ms = u_mouse / u_resolution;

  vec3 ro = RotateAround(vec3(0., 1., 6.), vec3(0., 1., -8.), ms);
  vec3 rd = LookAt(vec3(uv, .7), ro, vec3(0., 1., 6.), vec3(0., 1., 0.));

  vec3 cols = vec3(0); // 远处直接置黑
  float t = RayMarch(ro, rd);

  if (t < MAX_DIS){  // 远处直接置黑
    vec3 p = ro + rd * t;
    float dif = GetDifLight(p);
    cols = vec3(dif);
  }

  cols = pow(cols, vec3(.4545));	// gamma correction
  
  gl_FragColor = vec4(cols, 1.);
}