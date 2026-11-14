import * as THREE from 'three';

// المواد المشتركة. الصباغة تمشي كمسحة فرشاة (uWipe) من الفوق للتحت، ماشي تبديل لون مباشر.
export function createMaterials() {
  const loader = new THREE.TextureLoader();
  const tex = (url, rx = 1, ry = 1) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    return t;
  };

  const pineMap = tex('/textures/pine.jpg', 1, 1);
  const mdfMap = tex('/textures/mdf.jpg', 2, 2);

  const wipe = { value: 2.0 }; // y العالمي: كل ما فوقو مصبوغ

  const stained = (map, rough) => {
    const m = new THREE.MeshStandardMaterial({ map, roughness: rough });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uWipe = wipe;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWp;\nuniform float uWipe;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          float edge = uWipe + sin(vWp.x * 23.0) * 0.012 + sin(vWp.z * 17.0) * 0.01;
          float s = smoothstep(edge - 0.015, edge + 0.015, vWp.y);
          vec3 walnut = diffuseColor.rgb * vec3(0.33, 0.19, 0.10);
          diffuseColor.rgb = mix(diffuseColor.rgb, walnut, s);`);
    };
    return m;
  };

  const pine = new THREE.MeshStandardMaterial({ map: pineMap, roughness: 0.72 });
  const mdf = new THREE.MeshStandardMaterial({ map: mdfMap, roughness: 0.9 });
  const stainPine = stained(pineMap, 0.5);
  const stainMdf = stained(mdfMap, 0.6);
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa1a6, metalness: 0.85, roughness: 0.3 });

  // صنوبر خام بعلامات طباشير (للألواح قبل القص)
  const chalkCanvas = document.createElement('canvas');
  chalkCanvas.width = 1024; chalkCanvas.height = 512;
  const chalkTex = new THREE.CanvasTexture(chalkCanvas);
  chalkTex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const c = chalkCanvas.getContext('2d');
    c.drawImage(img, 0, 0, 1024, 512);
    c.strokeStyle = 'rgba(250,248,240,.85)';
    c.lineCap = 'round';
    c.lineWidth = 9;
    c.beginPath(); c.moveTo(120, 140); c.lineTo(230, 360); c.moveTo(230, 140); c.lineTo(120, 360); c.stroke();
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(760, 100); c.lineTo(760, 420); c.stroke();
    c.font = '700 110px serif'; c.fillStyle = 'rgba(250,248,240,.8)';
    c.fillText('190', 430, 300);
    chalkTex.needsUpdate = true;
  };
  img.src = '/textures/pine.jpg';
  const chalk = new THREE.MeshStandardMaterial({ map: chalkTex, roughness: 0.75 });

  return { pine, mdf, stainPine, stainMdf, metal, chalk, wipe };
}
