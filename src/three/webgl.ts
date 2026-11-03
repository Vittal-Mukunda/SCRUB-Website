/**
 * True when the device can draw the 3D scenes smoothly. A browser without a usable GPU falls back
 * to software WebGL (SwiftShader, llvmpipe, Microsoft Basic Render Driver), where the scene would
 * run at a few frames per second and freeze the page, so those get photos instead.
 */
export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = (c.getContext("webgl2", opts) || c.getContext("webgl", opts)) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext(); // free this probe context right away
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}
