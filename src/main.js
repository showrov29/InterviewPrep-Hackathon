import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

let thisVisemeIndex = 0;
let lastVisemeIndex = 0;
let dictionary;
let mixer;

// Create the scene
scene = new THREE.Scene();

// Create a camera
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Create a renderer
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // Enable VR
document.body.appendChild(VRButton.createButton(renderer)); // Add VR button
document.body.appendChild(renderer.domElement);


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
// Add stats
const stats = Stats();
document.body.appendChild(stats.dom);

// Add an ambient light
const ambientLight = new THREE.AmbientLight(0x404040, 5);
scene.add(ambientLight);

// Add a light
light = new THREE.DirectionalLight(0xffffff, 5 );
light.position.set(0, -1, 2);
scene.add(light);

// Add microphone indicator
micIndicator = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
micIndicator.position.set(1.55, 1, -2);
scene.add(micIndicator);
micIndicator.visible = false;

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
loader.load('sittingHR.glb', function (gltf) {
  avatar = gltf.scene;
  // Play the first animation clip
  mixer = new THREE.AnimationMixer(avatar);
  const clips = gltf.animations;
  let seat = mixer.clipAction(clips[0]);
  seat.play();
  dictionary = avatar.children[0].getObjectByName('Wolf3D_Avatar').morphTargetDictionary;
  scene.add(avatar);
  avatar.position.set(0, -1.65, -0.5);
  scene.position.set(0, 0.4, -0.9)
});
const clock = new THREE.Clock();
// Animation loop
function animate() {
  renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    renderer.render(scene, camera);
    stats.update();
    mixer && mixer.update(delta);
  });
}
animate();

changeMorphTargetByName = (targetName) => {
  if (!avatar) {
    console.error("Model not loaded yet.");
    return;
  }

  avatar.children[0].getObjectByName('Wolf3D_Avatar').morphTargetInfluences[lastVisemeIndex] = 0;
  thisVisemeIndex = dictionary[targetName] || 0;
  avatar.children[0].getObjectByName('Wolf3D_Avatar').morphTargetInfluences[thisVisemeIndex] = 1;
  lastVisemeIndex = thisVisemeIndex;
};

// Show micIndicator only in VR
renderer.xr.addEventListener('sessionstart', () => {
  insideVR = true
});

renderer.xr.addEventListener('sessionend', () => {
  insideVR = false;
});

