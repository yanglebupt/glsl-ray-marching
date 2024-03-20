# Ray-Marching

这是一种在二维平面渲染 3D 场景的一种方式，我们使用的 vscode 插件是 `glsl-canvas`

## 设置 uv 

首先我们先设置好画布 `uv` 坐标

```glsl
vec2 uv = 2.0 * gl_FragCoord.xy / u_resolution - 1.0; // 归一化 [-1, 1]，原点在中心
uv.x *= u_resolution.x / u_resolution.y;  // 保持宽高比
```

上面的代码可以整合成一行代码

```glsl
vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
```

## 射线

下面我们为画布的每一点都设置一条射线，射线的坐标是在世界坐标系下的

```glsl
vec3 ro = vec3(0.0, 0.0, -3.0); // 射线原点，也就是相机位置
vec3 rd = normalize(vec3(uv, 1.0)); // 画布每个像素点都对应一条射线的方向
```

<mark>Tip：</mark> 注意上面声明的射线 `ro + t * rd` 其实并不会经过 `(uv, 0)` 这个坐标点，因此我们可以进行一些校正
假设射线为 `ro = (0, z); rd = (xy, l)`，画布上坐标点是 `(uv, 0)`，射线要经过画布坐标点，必须要有下式成立

$$
ro + t * rd = (uv, 0) \\
(0, z) + t * (xy, l) = (uv, 0) \\ 
$$

那么解就是

$$
t = \frac{-z}{l} \\
xy = \frac{-l}{z} * (uv) \\
rd = (xy, l) = (\frac{-l}{z} * (uv), l)
$$

`rd` 是归一化后的方向，因此等价于 `rd = normalize((uv, -z))`，这样你就明白了为什么上面的代码为什么这样定义射线方向，而且最后一位相当于在调整相机的远近来实现 FOV 的调整（实际上相机位置没变）

```glsl
vec3 rd = normalize(vec3(uv, 1.0));
```

## 步进

采用 <a href="https://iquilezles.org/articles/distfunctions/">SDF</a> 来表示射线终点到场景表面的距离

```glsl
float scene (vec3 p) {
  float sphere = length(p) - 1.0;
  return sphere;
}
```

步进过程中，不断累加距离，当 d 接近 0，代表射线接近表面，也就是 t 不再变化了，射线也不再前进了

```glsl
for(int i = 0; i < 80; i++){
  vec3 p = ro + t * rd;
  float d = scene(p);
  t += d; 
}
```

## 着色

这里先输出深度图

```glsl
vec3 col = vec3(t * .2);  // depth buffer
gl_FragColor = vec4(col, 1);
```

针对步进优化，在 `for` 循环中对最远和最近进行一些限制，防止进行过多的性能消耗

```glsl
for(){
  // ...
  if ( d < .001 || t > 100.) break;  // 避免增加一些性能消耗
}
```

## 变换

由于我们只能对射线终点进行变换，因此对于世界来说，变换是反转的

```glsl
mat2 rotate2D(float angle){
  float s = sin(angle);
  float c = cos(angle);
  return mat2(
    c,-s,
    s,c
  );
}

// q 是射线终点
q.xy *= rotate2D(PI/10.0);

float box = sdBox(q, vec3(.75));
```

上面这段代码你能看出物体到底是顺还是逆时针旋转？glsl 中矩阵是列主序的，向量默认也是列向量，真正的逆时针旋转如下

$$
\left [ \begin{matrix}
x' \\
y' \\
\end{matrix} \right ] = \left [ \begin{matrix}
c& -s \\
s& c \\
\end{matrix} \right ] * \left [ \begin{matrix}
x \\
y \\
\end{matrix} \right ] 
$$

而列主序导致 `rotate2D` 返回的矩阵 `mat2` 是

$$
\left [ \begin{matrix}
c& s \\
-s& c \\
\end{matrix} \right ] 
$$

所以 `mat2.T` 才是逆时针旋转，而 `q.xy *= mat2` 等价于 `q.xy = q.xy * mat2 = (mat2.T * q.xy.T).T = mat2.T * q.xy`，所以是逆时针旋转？注意我们是对射线终点进行变换，世界变换是反变换，因此看到的物体是顺时针变换！

## 总结

因此变换矩阵不变，该是什么就是什么，通过 `vec * mat` 来进行转置恰好抵消反变换（前提是正交变换）

还有一点需要注意，变换的顺序，在 RayMarch 中也是相反的

- 先平移，后旋转是相对于自身轴旋转（局部坐标系）
- 先旋转，后平移是相对于世界轴旋转（世界坐标系） 

缩放操作后需要将基元的距离补偿回来，否则会出现伪影

```glsl
vec3 p;
vec3 scale = vec3(2., 3., 4.);
p *= scale;

float d = primitive(p) / max(scale);
```

# 最终效果

<canvas class="glslCanvas" data-fragment-url="./src/01-基本实现.frag" width="500" height="500"></canvas>