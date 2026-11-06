import * as THREE from "three";

/**
 * Screen-space ambient occlusion: the soft darkening in creases, under overhangs and where parts meet, which is
 * most of what makes a raster render look like a Blender render.
 *
 * Kept cheap on purpose: the scene is drawn once (into a render target that also keeps its depth), and AO is
 * worked out from that depth alone at HALF resolution with 12 taps, then a depth-aware 4 x 4 gather in the final
 * full-screen pass (that pass also applies the renderer's tone mapping and colour space, which a render target skips).
 * No second scene render, no normal buffer. If the GPU cannot do it, `renderWithAO` quietly draws the plain way.
 */

const RADIUS_FRAC = 0.05; // AO radius as a fraction of the screen height
const STRENGTH = 0.75; // how much of the occlusion reaches the picture (it also darkens lit areas, so keep it below 1)
const SAMPLES = 10;

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const AO_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDepth;
uniform mat4 uProj;
uniform mat4 uInvProj;
uniform vec2 uSize;
uniform float uRadiusPx;
varying vec2 vUv;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

vec3 viewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  return v.xyz / v.w;
}

void main() {
  float d0 = texture2D(tDepth, vUv).x;
  if (d0 >= 0.99999) {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 px = 1.0 / uSize;
  vec3 P = viewPos(vUv);
  // surface normal from the neighbouring depths, taking the nearer side on each axis so silhouettes do not smear
  vec3 Pr = viewPos(vUv + vec2(px.x, 0.0));
  vec3 Pl = viewPos(vUv - vec2(px.x, 0.0));
  vec3 Pu = viewPos(vUv + vec2(0.0, px.y));
  vec3 Pd = viewPos(vUv - vec2(0.0, px.y));
  vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy));
  if (dot(N, -P) < 0.0) N = -N;

  // radius in world units at this depth
  float pixelWorld = -P.z * 2.0 / (uProj[1][1] * uSize.y);
  float Rw = uRadiusPx * pixelWorld;

  ivec2 q = ivec2(mod(gl_FragCoord.xy, 4.0));
  float ang0 = (BAYER[q.x + q.y * 4] + 0.5) / 16.0 * 6.2831853;
  float occ = 0.0;
  for (int i = 0; i < ${SAMPLES}; i++) {
    float t = (float(i) + 0.5) / ${SAMPLES}.0;
    float a = ang0 + float(i) * 2.39996;
    vec2 off = vec2(cos(a), sin(a)) * (t * t * 0.8 + 0.2) * uRadiusPx * px;
    vec3 v = viewPos(vUv + off) - P;
    float l = max(length(v), 1e-4);
    float w = 1.0 - smoothstep(Rw * 0.9, Rw * 1.8, l);
    occ += max(0.0, dot(N, v) / l - 0.08) * w;
  }
  float ao = 1.0 - clamp(occ / ${SAMPLES}.0 * 4.5, 0.0, 1.0);
  gl_FragColor = vec4(ao, -P.z, 0.0, 1.0);
}`;

const BLUR_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tAO;
uniform vec2 uAOSize;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(tAO, vUv);
  if (c.g <= 0.0) {
    gl_FragColor = c;
    return;
  }
  vec2 t = 1.0 / uAOSize;
  float sum = 0.0;
  float wsum = 0.0;
  // the AO pass dithers its sample directions over a 4 x 4 tile; averaging the same 4 x 4 cancels it
  for (int x = 0; x < 4; x++) {
    for (int y = 0; y < 4; y++) {
      vec4 s = texture2D(tAO, vUv + (vec2(float(x), float(y)) - 1.5) * t);
      if (s.g <= 0.0) continue;
      float w = exp(-abs(s.g - c.g) / (0.015 * c.g));
      sum += s.r * w;
      wsum += w;
    }
  }
  gl_FragColor = vec4(sum / max(wsum, 1e-4), c.g, 0.0, 1.0);
}`;

const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tAO;
uniform mat4 uInvProj;
uniform vec2 uAOSize;
uniform float uStrength;
uniform float uDebug;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(tColor, vUv);
  float d = texture2D(tDepth, vUv).x;
  float ao = 1.0;
  if (d < 0.99999) {
    vec4 vp = uInvProj * vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
    float z = -(vp.z / vp.w);
    // bilateral upsample: the four nearest half-resolution texels, weighted by distance and by how close their depth is
    vec2 f = vUv * uAOSize - 0.5;
    vec2 i0 = floor(f);
    vec2 fr = f - i0;
    float sum = 0.0;
    float wsum = 0.0;
    for (int x = 0; x < 2; x++) {
      for (int y = 0; y < 2; y++) {
        vec4 s = texture2D(tAO, (i0 + vec2(float(x), float(y)) + 0.5) / uAOSize);
        if (s.g <= 0.0) continue;
        float w = (x == 0 ? 1.0 - fr.x : fr.x) * (y == 0 ? 1.0 - fr.y : fr.y) * exp(-abs(s.g - z) / (0.015 * z));
        sum += s.r * w;
        wsum += w;
      }
    }
    if (wsum > 1e-4) ao = mix(1.0, sum / wsum, uStrength);
  }
  if (uDebug > 0.5) {
    gl_FragColor = vec4(vec3(ao), 1.0);
    return;
  }
  // undo the premultiplied alpha, darken, then do what the renderer would have done on its own: tone map and encode
  vec3 rgb = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
  gl_FragColor = vec4(rgb * ao, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor = vec4(gl_FragColor.rgb * c.a, c.a);
}`;

// read once at load: the showroom rewrites the query string as you open a robot
const MODE = typeof location !== "undefined" ? new URLSearchParams(location.search).get("ao") : null;
const disabled = MODE === "0";


const triangle = new THREE.BufferGeometry();
triangle.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
triangle.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));

class AOPipeline {
  private sceneRT: THREE.WebGLRenderTarget;
  private aoRT: THREE.WebGLRenderTarget;
  private blurRT: THREE.WebGLRenderTarget;
  private blurMat: THREE.ShaderMaterial;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private aoMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private size = new THREE.Vector2();

  constructor() {
    this.sceneRT = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(4, 4),
    });
    this.aoRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.blurRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLUR_FRAG,
      uniforms: { tAO: { value: this.aoRT.texture }, uAOSize: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.aoMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: AO_FRAG,
      uniforms: {
        tDepth: { value: this.sceneRT.depthTexture },
        uProj: { value: new THREE.Matrix4() },
        uInvProj: { value: new THREE.Matrix4() },
        uSize: { value: new THREE.Vector2() },
        uRadiusPx: { value: 10 },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.compMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tColor: { value: this.sceneRT.texture },
        tDepth: { value: this.sceneRT.depthTexture },
        tAO: { value: this.blurRT.texture },
        uInvProj: { value: new THREE.Matrix4() },
        uAOSize: { value: new THREE.Vector2() },
        uStrength: { value: STRENGTH },
        uDebug: { value: MODE === "debug" ? 1 : 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(triangle, this.aoMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /** the target the scene is drawn into: shaders are compiled for it, so warming up must use it too */
  get target() {
    return this.sceneRT;
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    gl.getDrawingBufferSize(this.size);
    const w = Math.max(2, Math.floor(this.size.x));
    const h = Math.max(2, Math.floor(this.size.y));
    if (this.sceneRT.width !== w || this.sceneRT.height !== h) {
      this.sceneRT.setSize(w, h);
      this.aoRT.setSize(Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(h / 2)));
      this.blurRT.setSize(Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(h / 2)));
    }
    const aw = this.aoRT.width;
    const ah = this.aoRT.height;
    const ao = this.aoMat.uniforms;
    ao.uProj.value.copy(camera.projectionMatrix);
    ao.uInvProj.value.copy(camera.projectionMatrixInverse);
    ao.uSize.value.set(aw, ah);
    ao.uRadiusPx.value = Math.min(30, Math.max(8, RADIUS_FRAC * ah));
    const co = this.compMat.uniforms;
    co.uInvProj.value.copy(camera.projectionMatrixInverse);
    co.uAOSize.value.set(aw, ah);
    this.blurMat.uniforms.uAOSize.value.set(aw, ah);

    const prev = gl.getRenderTarget();
    gl.setRenderTarget(this.sceneRT);
    gl.render(scene, camera);

    this.quad.material = this.aoMat;
    gl.setRenderTarget(this.aoRT);
    gl.render(this.quadScene, this.quadCam);

    this.quad.material = this.blurMat;
    gl.setRenderTarget(this.blurRT);
    gl.render(this.quadScene, this.quadCam);

    this.quad.material = this.compMat;
    gl.setRenderTarget(null);
    gl.render(this.quadScene, this.quadCam);
    gl.setRenderTarget(prev);
  }
}

const pipelines = new WeakMap<THREE.WebGLRenderer, AOPipeline | null>();
function pipelineFor(gl: THREE.WebGLRenderer) {
  if (disabled) return null;
  let p = pipelines.get(gl);
  if (p === undefined) {
    try {
      const ok = gl.capabilities.isWebGL2 && (gl.extensions.has("EXT_color_buffer_float") || gl.extensions.has("EXT_color_buffer_half_float"));
      p = ok ? new AOPipeline() : null;
      if (!ok) console.warn("AO off: needs WebGL2 with float render targets");
    } catch (e) {
      console.warn("AO off:", e);
      p = null;
    }
    pipelines.set(gl, p);
  }
  return p;
}

/** Draws the scene with ambient occlusion, or plainly if this GPU cannot do it. */
export function renderWithAO(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const p = pipelineFor(gl);
  if (!p) return gl.render(scene, camera);
  try {
    p.render(gl, scene, camera as THREE.PerspectiveCamera);
  } catch (e) {
    console.warn("AO off:", e);
    gl.setRenderTarget(null);
    pipelines.set(gl, null); // never try again on this renderer
    gl.render(scene, camera);
  }
}

/** compileAsync for the AO path: programs depend on the render target (tone mapping and colour space), so compile against it. */
export function compileAsyncAO(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const p = pipelineFor(gl);
  if (!p) return gl.compileAsync(scene, camera);
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(p.target);
  const done = gl.compileAsync(scene, camera);
  gl.setRenderTarget(prev);
  return done;
}
