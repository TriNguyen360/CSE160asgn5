import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function makeBillboard(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 216;
  canvas.height = 30;
  const context = canvas.getContext('2d');
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "Bold 20px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  const scaleFactor = 0.01;
  sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
  return sprite;
}

function makeBillboardFurina(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 90;
  canvas.height = 30;
  const context = canvas.getContext('2d');
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "Bold 20px Arial";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  const scaleFactor = 0.008; 
  sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1);
  return sprite;
}


function main() {
  const shapes = [];

  const canvas = document.querySelector('#c');
  const renderer = new THREE.WebGLRenderer({ canvas });

  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(5, 5, 20);
  camera.lookAt(0, 0, 0);

  const scene = new THREE.Scene();

  {
    const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 2);
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
  }

  {
    const cubeLoader = new THREE.CubeTextureLoader();
    const skyboxTexture = cubeLoader.load([
      'resources/images/wall.png',   // +X
      'resources/images/wall.png',   // -X
      'resources/images/grass.png',  // +Y (sky)
      'resources/images/ground.png', // -Y (ground)
      'resources/images/wall.png',   // +Z
      'resources/images/wall.png',   // -Z
    ]);
    scene.background = skyboxTexture;
  }

  const controls = new OrbitControls(camera, renderer.domElement);

  // ─────────────────────────────────────────────────────────────
  // Picking: Track the mouse's normalized position (range: -1 to +1)
  // ─────────────────────────────────────────────────────────────
  const pickPosition = { x: -100000, y: -100000 };
  function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top)  * canvas.height / rect.height,
    };
  }
  function setPickPosition(event) {
    const pos = getCanvasRelativePosition(event);
    pickPosition.x = (pos.x / canvas.width) * 2 - 1;
    pickPosition.y = (pos.y / canvas.height) * -2 + 1; 
  }
  function clearPickPosition() {
    pickPosition.x = -100000;
    pickPosition.y = -100000;
  }
  window.addEventListener('mousemove', setPickPosition);
  window.addEventListener('mouseout', clearPickPosition);
  window.addEventListener('mouseleave', clearPickPosition);
  window.addEventListener('touchstart', (event) => {
    event.preventDefault();
    setPickPosition(event.touches[0]);
  }, { passive: false });
  window.addEventListener('touchmove', (event) => {
    setPickPosition(event.touches[0]);
  });
  window.addEventListener('touchend', clearPickPosition);

  // ─────────────────────────────────────────────────────────────
  // PickHelper class: Uses a Raycaster to detect object under the mouse.
  // ─────────────────────────────────────────────────────────────
  class PickHelper {
    constructor() {
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = null;
      this.pickedObjectSavedColor = 0;
    }
    pick(normalizedPosition, objects, camera, time) {
      if (this.pickedObject) {
        this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
        this.pickedObject = null;
      }
      this.raycaster.setFromCamera(normalizedPosition, camera);
      const intersects = this.raycaster.intersectObjects(objects, true);
      if (intersects.length) {
        this.pickedObject = intersects[0].object;
        this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
        this.pickedObject.material.emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
      }
    }
  }
  const pickHelper = new PickHelper();

  // ─────────────────────────────────────────────────────────────
  // Helper function: loadModel (MTL+OBJ), center it, and apply offsets.
  // ─────────────────────────────────────────────────────────────
  function loadModel(mtlPath, objPath, scale, offsetX, offsetY, offsetZ, onLoadCallback) {
    const mtlLoader = new MTLLoader();
    mtlLoader.load(mtlPath, (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load(objPath, (root) => {
        root.scale.set(scale, scale, scale);
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.x += (root.position.x - center.x);
        root.position.y += (root.position.y - center.y);
        root.position.z += (root.position.z - center.z);
        root.position.x += offsetX;
        root.position.y += offsetY;
        root.position.z += offsetZ;
        if (onLoadCallback) {
          onLoadCallback(root);
        }
        scene.add(root);
        console.log(`Loaded and positioned model: ${objPath}`);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Load models:
  // Model 1: Furina
  loadModel('resources/models/furina.mtl', 'resources/models/furina.obj', 5, 0, 0, 0, (model) => {
    const billboard = makeBillboardFurina("Furina :(");
    const box = new THREE.Box3().setFromObject(model);
    const topY = box.max.y;
    billboard.position.set(0, 2.2, 0);
    model.add(billboard);
  });
  // Model 2: Skirk 
  loadModel('resources/models/skirk.mtl', 'resources/models/skirk.obj', 5, 0, 0, -10, (model) => {
    const billboard = makeBillboard("Skirk Attacking Furina");
    const box = new THREE.Box3().setFromObject(model);
    const topY = box.max.y;
    billboard.position.set(0, 2.5, 0);
    model.add(billboard);
  });
  // Model 3: mistsplitter 
  loadModel('resources/models/mistsplitter.mtl', 'resources/models/mistsplitter.obj', 0.3, 2.4, 3.8, -9);
  // Model 4: raiden 
  loadModel('resources/models/raiden.mtl', 'resources/models/raiden.obj', 0.5, 3, 3.8, -9.4, (model) => {
    model.rotation.y = Math.PI;
  });

  // ─────────────────────────────────────────────────────────────
  // Create 3 primary shapes 
  // ─────────────────────────────────────────────────────────────
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.SphereGeometry(0.5, 32, 16);
  const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);

  const texLoader = new THREE.TextureLoader();
  const bloodTexture = texLoader.load('resources/images/blood.png');
  bloodTexture.colorSpace = THREE.SRGBColorSpace;

  const mat1 = new THREE.MeshPhongMaterial({ color: 0xff0000 });
  const bloodMat = new THREE.MeshPhongMaterial({ map: bloodTexture });
  const mat3 = new THREE.MeshPhongMaterial({ color: 0x0000ff });

  const shapeDefs = [
    { geo: cubeGeo,   mat: mat1 },
    { geo: sphereGeo, mat: bloodMat },
    { geo: cylGeo,    mat: mat3 },
  ];

  {
    let count = 0;
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < shapeDefs.length; j++) {
        const def = shapeDefs[j];
        const mesh = new THREE.Mesh(def.geo, def.mat.clone());
        mesh.position.set(
          (i - 3) * 2 + Math.random() * 0.5,
          (j - 1) * 2 + Math.random() * 0.5,
          -5 + Math.random() * 10
        );
        scene.add(mesh);
        shapes.push(mesh);
        count++;
        if (count >= 20) break;
      }
      if (count >= 20) break;
    }
    console.log(`Created ${count} shapes (cube, sphere, cylinder).`);
  }

  // ─────────────────────────────────────────────────────────────
  // Resize function
  // ─────────────────────────────────────────────────────────────
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = canvas.clientWidth * pixelRatio | 0;
    const height = canvas.clientHeight * pixelRatio | 0;
    const needResize = (canvas.width !== width) || (canvas.height !== height);
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  // ─────────────────────────────────────────────────────────────
  // Animation + Render loop
  // ─────────────────────────────────────────────────────────────
  let rotationSpeed = 0.5;
  let lastPickTime = 0;
  function render(time) {
    time *= 0.001; 

    shapes.forEach((mesh, ndx) => {
      const rot = time * rotationSpeed * (1 + ndx * 0.01);
      mesh.rotation.x = rot;
      mesh.rotation.y = rot;
    });

    controls.update();

    if (time - lastPickTime > 0.1) {
      pickHelper.pick(pickPosition, shapes, camera, time);
      lastPickTime = time;
    }

    if (resizeRendererToDisplaySize(renderer)) {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();

class PickHelper {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.pickedObject = null;
    this.pickedObjectSavedColor = 0;
  }
  pick(normalizedPosition, objects, camera, time) {
    if (this.pickedObject) {
      this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
      this.pickedObject = null;
    }
    this.raycaster.setFromCamera(normalizedPosition, camera);
    const intersects = this.raycaster.intersectObjects(objects, true);
    if (intersects.length) {
      this.pickedObject = intersects[0].object;
      this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
      this.pickedObject.material.emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
    }
  }
}

const pickHelper = new PickHelper();
