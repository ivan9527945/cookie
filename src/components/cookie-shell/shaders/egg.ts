/**
 * Egg shaders. 留作後續從 MeshTransmissionMaterial 升級成完全自訂 shaderMaterial 時使用。
 * 第一版用 drei 的 MeshTransmissionMaterial，這份檔案先存著 GLSL 程式碼。
 */

export const eggVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulse;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  // Simplex noise 請於整合時引入（npm: glsl-noise 或 webgl-noise）
  // float snoise(vec3 v) { ... }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    float breath = sin(uTime * 0.8) * 0.5 + 0.5;
    // float noise = snoise(position * 2.0 + uTime * 0.3) * 0.05;
    float noise = 0.0;
    float displacement = breath * 0.02 * uIntensity + noise * uIntensity;
    displacement += uPulse * 0.04;

    vDisplacement = displacement;
    vec3 displaced = position + normal * displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

export const eggFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uGlitch;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);

    vec3 base = vec3(0.96, 0.95, 0.92);
    float glitchOffset = uGlitch * 0.1 * sin(uTime * 60.0 + vPosition.y * 30.0);
    vec3 color = base + vec3(glitchOffset, 0.0, -glitchOffset);

    color = mix(color, vec3(1.0), fresnel * 0.4);

    gl_FragColor = vec4(color, 0.85 + fresnel * 0.15);
  }
`;
