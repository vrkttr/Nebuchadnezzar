const uniforms = { uWindTime: { value: 0 }, uWindStrength: { value: 1 } };

export const WIND = { time: 0, strength: 1, x: 0.86, z: 0.5 };

export function updateWind(delta, vegetation = true) {
  WIND.time += delta;
  WIND.strength = Math.max(0.25, 0.85 + 0.45 * Math.sin(WIND.time * 0.17) + 0.25 * Math.sin(WIND.time * 0.43 + 2.1));
  uniforms.uWindTime.value = WIND.time;
  uniforms.uWindStrength.value = vegetation ? WIND.strength : 0;
}

const CROWN_WEIGHT = 'float windWeight = 0.3 + 0.7 * smoothstep(1.0, 7.0, position.y); float windAmp = 0.17;';
const GRASS_WEIGHT = 'float windWeight = uv.y <= 0.51 ? uv.y * 2.0 : 0.0; float windAmp = 0.16;';

export function applyWind(material, kind) {
  const weight = kind === 'grass' ? GRASS_WEIGHT : CROWN_WEIGHT;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 windWorld = modelMatrix * vec4( position, 1.0 );
        float windPhase = windWorld.x * 0.31 + windWorld.z * 0.23;
        ${weight}
        vec3 windSway = vec3(
          sin( uWindTime * 1.6 + windPhase ) + 0.5 * sin( uWindTime * 3.1 + windPhase * 2.3 ),
          0.25 * sin( uWindTime * 2.2 + windPhase * 1.7 ),
          0.7 * cos( uWindTime * 1.3 + windPhase * 1.1 ) + 0.35 * sin( uWindTime * 2.7 + windPhase * 1.9 )
        );
        float windFlutter = 0.035 * sin( uWindTime * 7.0 + position.x * 5.0 + position.z * 4.0 + position.y * 3.0 );
        transformed += ( windSway * windAmp + windFlutter ) * windWeight * uWindStrength;`
      );
  };
  material.customProgramCacheKey = () => `wind-${kind}`;
}
