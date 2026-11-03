import * as THREE from "three";

const VERT = /* glsl */ `
attribute float aFade;
varying vec2 vUv;
varying float vFade;
void main() {
  vUv = uv;
  vFade = aFade;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

// two soft rings, the outer one stronger, like a ripple spreading on still water
const FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
varying float vFade;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float outer = smoothstep(0.80, 0.93, d) * (1.0 - smoothstep(0.93, 1.0, d));
  float inner = smoothstep(0.52, 0.60, d) * (1.0 - smoothstep(0.60, 0.68, d)) * 0.45;
  float a = (outer + inner) * vFade * 0.6;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

const M = new THREE.Matrix4();
const S = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * A pool of ripple rings lying on the (tilted) water plane: where leaves land and in the wake of a
 * moving robot. Spawned in real time and recycled oldest-first.
 */
export class Ripples {
  readonly mesh: THREE.InstancedMesh;
  private readonly fade: THREE.InstancedBufferAttribute;
  private readonly born: Float32Array;
  private readonly life: Float32Array;
  private readonly r0: Float32Array;
  private readonly r1: Float32Array;
  private readonly strength: Float32Array;
  private readonly pos: Float32Array;
  private next = 0;
  private live = 0;
  /** orientation of a ring lying flat on the water */
  private readonly flat: THREE.Quaternion;

  constructor(count: number, tilt: number) {
    const geo = new THREE.PlaneGeometry(2, 2);
    this.fade = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aFade", this.fade);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uColor: { value: new THREE.Color(0.3, 0.5, 0.43) } },
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < count; i++) this.mesh.setMatrixAt(i, ZERO);
    this.born = new Float32Array(count).fill(-1e9);
    this.life = new Float32Array(count).fill(1);
    this.r0 = new Float32Array(count);
    this.r1 = new Float32Array(count);
    this.strength = new Float32Array(count);
    this.pos = new Float32Array(count * 3);
    this.flat = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
  }

  /** A ring centred on world point (x, y, z), growing from radius r0 to r1 over `life` seconds. */
  spawn(time: number, x: number, y: number, z: number, r0: number, r1: number, life: number, strength = 1) {
    const i = this.next;
    this.next = (this.next + 1) % this.born.length;
    this.born[i] = time;
    this.life[i] = life;
    this.r0[i] = r0;
    this.r1[i] = r1;
    this.strength[i] = strength;
    this.pos.set([x, y, z], i * 3);
    this.live = this.born.length;
  }

  update(time: number) {
    if (!this.live) return;
    let any = 0;
    const p = new THREE.Vector3();
    for (let i = 0; i < this.born.length; i++) {
      const a = (time - this.born[i]) / this.life[i];
      if (a < 0 || a >= 1) {
        if (this.fade.getX(i) !== 0) {
          this.fade.setX(i, 0);
          this.mesh.setMatrixAt(i, ZERO);
        }
        continue;
      }
      any++;
      const grow = 1 - Math.pow(1 - a, 3);
      const r = this.r0[i] + (this.r1[i] - this.r0[i]) * grow;
      this.fade.setX(i, this.strength[i] * Math.pow(1 - a, 1.6) * Math.min(1, a * 12));
      p.fromArray(this.pos, i * 3);
      M.compose(p, this.flat, S.set(r, r, r));
      this.mesh.setMatrixAt(i, M);
    }
    this.fade.needsUpdate = true;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (!any) this.live = 0;
  }
}
