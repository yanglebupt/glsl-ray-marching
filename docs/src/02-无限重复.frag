#ifdef GL_ES
precision mediump float;  // 设置全局的 float 精度
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

const float PI = 3.14159265359;

vec2 get_uv (vec2 coord) {
  return (2.0 * coord.xy - u_resolution) / u_resolution.y;
}

/////////////sdf//////////////////
float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdOctahedron( vec3 p, float s)
{
  p = abs(p);
  return (p.x+p.y+p.z-s)*0.57735027;
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
vec3 palette( float t )
{
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5); 
  vec3 c = vec3(1.0, 1.0, 1.0); 
  vec3 d = vec3(0.263, 0.416, 0.55);
  return a + b*cos( 6.28318*(c*t+d) );
}
//////////////////////////////

float scene (vec3 p) {
  p.z += u_time;
  // p = fract(p) - 0.5;  // 射线空间不断划分 [-0.5, 0.5]
  p.xy = fract(p.xy) - 0.5;  // fract 取小数等价于 mod(x, 1) 1 代表周期大小，需要减去周期一半，移到中心
  p.z = mod(p.z, .25) - 0.125; 
  float box = sdOctahedron(p, .1);
  return box;
}

void main(){
  vec2 uv = get_uv(gl_FragCoord.xy); 

  // vec2 ms = get_uv(u_mouse); 
  vec2 ms = 2. * vec2(cos(u_time*.25), sin(u_time*.25));  // 圆周运动模拟鼠标运动

  // 初始化射线
  vec3 ro = vec3(0.0, 0.0, -3.0); // 射线原点，也就是相机位置
  vec3 rd = normalize(vec3(uv, 1.0)); // 画布每个像素点都发射一条射线，最后的 1 可以用来调值相机的 FOV
  float t = 0.0;

  vec3 col = vec3(0.);

  // 开始步进
  for(int i = 0; i < 80; i++){
    vec3 p = ro + t * rd;

    p.y += sin(t) * 0.3 * ms.y;  // 对射线进行扭曲
    p.xy *= rotate2D(t * 0.06 * ms.x);

    float d = scene(p);
    t += d; // 累加距离，d 接近 0，代表接触表面，也就是 t 不再变化了
    if ( d < .001 || t > 100.) break;  // 避免增加一些性能消耗
  }

  col = vec3(palette(t*0.04));  // 根据深度到调色板中采样颜色
  gl_FragColor = vec4(col, 1);
}