import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';


let thisVisemeX = 0;
let thisVisemeV = 0;
let visemeDamp = 4;
let visemeK = 8;
let lastVisemX = 0;
let lastVisemV = 0;
let thisTarget = 1;
let thisVisemeIndex = 0;
let lastVisemeIndex = 0;
let dictionanry
let springs = [];
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
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
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
  console.log("🚀 ~ avatar:", avatar.children[0].getObjectByName('Wolf3D_Head'))
dictionanry=avatar.children[0].getObjectByName('Wolf3D_Head').morphTargetDictionary
  scene.add(avatar);
  avatar.position.set(0, -1.65, -0.5);
  // avatar.scale.set(2,2,2)
});

let prevTime = performance.now();
// Animation loop
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  stats.update();

//   const currTime = performance.now();
// 	// const delta = (currTime - prevTime) / 1000
// 	const delta = 0.01;
// 	// console.log(delta)
//   if (!avatar) {
//     return
//   }
// 	thisVisemeX += thisVisemeV * delta;
// 	let acceleration = visemeK * (thisTarget - thisVisemeX);
// 	let resistance = visemeDamp * thisVisemeV;
// 	thisVisemeV += (acceleration - resistance) * delta;

// 	avatar.children[0].getObjectByName('Wolf3D_Head').morphTargetInfluences[lastVisemeIndex] =1 - thisVisemeX;
//     avatar.children[0].getObjectByName('Wolf3D_Head').morphTargetInfluences[thisVisemeIndex] =thisVisemeX;
// console.log(avatar.children[0].getObjectByName('Wolf3D_Head').morphTargetInfluences);

// 	// console.log(thisVisemeX)
// 	let spring = {
// 		x: thisVisemeX,
// 		a: acceleration,
// 		r: resistance,
// 		v: thisVisemeV,
// 	};
// 	springs = [...springs, spring];
// 	if (springs.length == 1000) {
// 		console.log(spring);
// 		// console.table(springs);
// 	}
// 	prevTime = currTime;
}
animate();

  changeMorphTargetByName=(targetName)=> {
  console.log("🚀 ~ targetName:", targetName)
	if (!avatar) {
		console.error("Model not loaded yet.");
		return;
	}
  
  
// 	lastVisemeIndex = thisVisemeIndex;
//  console.log("🚀 ~ lastVisemeIndex:", lastVisemeIndex)
 
  console.log("🚀 ~ dictionanry:", dictionanry);
  
 avatar.children[0].getObjectByName('Wolf3D_Head').morphTargetInfluences[lastVisemeIndex] =0
	thisVisemeIndex = dictionanry[targetName]||0;
	console.log("🚀 ~ thisVisemeIndex:", thisVisemeIndex)
  avatar.children[0].getObjectByName('Wolf3D_Head').morphTargetInfluences[thisVisemeIndex] =1;
  lastVisemeIndex = thisVisemeIndex;
  console.log("🚀 ~ lastVisemeIndex:", lastVisemeIndex)
}


// function mapVisemesToModel(visemes){
//   visemes.map((viseme) => {
//     changeMorphTargetByName(viseme);
//   })
// }