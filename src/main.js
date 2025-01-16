import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Create the scene
scene = new THREE.Scene();

// Create a camera
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.set(0.33,5,10.5)
camera.position.set(0,0,1)
// Create a renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Add stats
const stats = Stats();
document.body.appendChild(stats.dom);

// Add an ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 10); 
scene.add(ambientLight);

// Add a light
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(1, 1, 1).normalize();
scene.add(light);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;
// Load the GLB model
const loader = new GLTFLoader();
loader.load(
  'modern_office.glb',
  function (gltf) {
    let room = gltf.scene;
    room.rotateY(-Math.PI/2);
    scene.add(room);
  }
);
loader.load('avatar2.glb', function (gltf) {
  avatar = gltf.scene;

  scene.add(avatar);
  avatar.position.set(0, -1.65, -0.5);
  // avatar.scale.set(2,2,2)
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();
}
animate();