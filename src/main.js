import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { extractTopThreeEmotions,appendMessage } from '../helper/storeEmotions';
// Hume ai code
import {
	Hume,
	HumeClient,
	convertBase64ToBlob,
	convertBlobToBase64,
	getAudioStream,
	getBrowserSupportedMimeType,
	MimeType,
} from "hume";
let client, socket, recorder, audioStream, chatGroupId, isPlaying, currentAudio;
let connected;
let audioQueue = [];
let isActive=true
let isSpeaking = false
// hume ai code ends

let thisVisemeIndex = 0;
let lastVisemeIndex = 0;
let dictionary;
let mixer;
let blinkLeftIndex

let blinkRightIndex


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
  blinkLeftIndex = dictionary["eyeBlinkLeft"];

  blinkRightIndex = dictionary["eyeBlinkRight"];
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
    makeBlink(delta);
  });
}
let blinkDir = 1
function getRandomInterval() {
  return Math.random() * 3000 + 1000; // Random interval between 1 and 4 seconds
}

function triggerBlink() {
  blinkFlag = true;
  setTimeout(triggerBlink, getRandomInterval());
}

setTimeout(triggerBlink, getRandomInterval());
function makeBlink(delta) {
  
  if(avatar && blinkFlag){
    if(left_eye > 1 ){
      blinkDir = -1
    }
    if(left_eye < 0){
      blinkDir = 1
      console.log('done')
      blinkFlag = false;
    }
    left_eye += blinkDir * delta*4
    right_eye += blinkDir * delta*4
    avatar.children[0].getObjectByName('Wolf3D_Avatar').morphTargetInfluences[blinkLeftIndex] = left_eye
    avatar.children[0].getObjectByName('Wolf3D_Avatar').morphTargetInfluences[blinkRightIndex] = right_eye
  }
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




const connect = async (prompt) => {
  if (!client) {
    client = new HumeClient({
      apiKey: "6ADRq4ypcI2IV6WlMnIEC31bK6WnYAgmPBLQQHZAgRGmDCAr",
      secretKey:
        "2VCOgvyCoBDJHXg7PqjZWjelQPT3ONNtx72p52eLFFZbHaYtvw7ev769O2VUEtDL",
    });
  }

  socket = await client.empathicVoice.chat.connect({
    configId: import.meta.env.VITE_HUME_WEATHER_ASSISTANT_CONFIG_ID || null,
    resumedChatGroupId: chatGroupId,
    
  });

  socket.on("open", () => {
    handleWebSocketOpenEvent();
    let hr_prompt = `You are Steve, a professional interviewer who is evaluating HR part for the job of Junior Software Engineer. He has done his technical round already. Your job is to ask thoughtful and relevant questions to the interviewer that demonstrate the candidate's curiosity, interest in the company, and alignment with its culture. Ensure the questions are polite, engaging, and reflective of the candidate's desire to understand the company's environment, values, and growth opportunities. Avoid overly technical or role-specific questions in this context. Ask 8-10 questions, covering topics like:- Company culture and work environment- Opportunities for professional growth- Team dynamics and communication- Leadership style and expectations- Work-life balance and flexibility Make sure the questions are concise, open-ended, and conversational. Don't offer any tea coffee or anything. Your introductory speech should be around 15 words.
  
    For example:
    user: Hello!
    You: Hello! welcome, and thank you for taking the time to meet with us today. I hope you're doing well. My name is Steve, and I’m part of the HR team here. It's great to have you here.`
    // console.log(socket);
    socket.sendUserInput(hr_prompt);

    // socket?.sendMessage(userMessage);
  });
  socket.on("message", handleSocketMessageEvent);
};

export const startSpeaking = async () => {
  connect();
};

async function handleWebSocketOpenEvent() {
	console.log("socket opened");
	connected = true;
	await captureAudio();
}
async function captureAudio() {
	// audioStream = await getAudioStream();
	audioStream = await navigator.mediaDevices.getUserMedia({
		audio: true,
		video: false,
		echoCancellation: true,
		noiseSuppression: true,
	});
	recorder = new MediaRecorder(audioStream);
	recorder.ondataavailable = async ({ data }) => {
		if (data.size < 1) return;
		const encodedAudioData = await convertBlobToBase64(data);
		const audioInput = {
			data: encodedAudioData,
		};
		socket.sendAudioInput(audioInput);
	};
	const timeSlice = 100;
	recorder.start(timeSlice);
}

async function handleSocketMessageEvent(message) {
	console.log("🚀 ~ handleSocketMessageEvent ~ message:", message);
	switch (message.type) {
		// save chat_group_id to resume chat if disconnected
		case "chat_metadata":
			chatGroupId = message.chatGroupId;
			break;

		// append user and assistant messages to UI for chat visibility
		case "user_message":
		case "assistant_message":
			console.log(
				"🚀 ~ handleSocketMessageEvent ~ message.message",
				message.message
			);

			const { role, content } = message.message;
			const topThreeEmotions = extractTopThreeEmotions(message);
			appendMessage(role, content ?? "", topThreeEmotions);
			break;

		// add received audio to the playback queue, and play next audio output
		case "audio_output":
			// convert base64 encoded audio to a Blob
			const audioOutput = message.data;
			const blob = convertBase64ToBlob(
				audioOutput,
				getBrowserSupportedMimeType(MimeType.WEBM)
			);

			// add audio Blob to audioQueue
			audioQueue.push(blob);

			// play the next audio output
			if (audioQueue.length >= 1) playAudio();
			break;

		// stop audio playback, clear audio playback queue, and update audio playback state on interrupt
		case "user_interruption":
			stopAudio();
			break;

		// invoke tool upon receiving a tool_call message
		case "tool_call":
			handleToolCallMessage(message, socket);
			break;
	}
}

function playAudio() {
	// IF there is nothing in the audioQueue OR audio is currently playing then do nothing
	if (!audioQueue.length || isPlaying) return;

	// update isPlaying state
	isPlaying = true;

	// pull next audio output from the queue
	const audioBlob = audioQueue.shift();

	// IF audioBlob is unexpectedly undefined then do nothing
	if (!audioBlob) return;

	// converts Blob to AudioElement for playback
	const audioUrl = URL.createObjectURL(audioBlob);
	currentAudio = new Audio(audioUrl);

	// play audio
	currentAudio.play();

	// callback for when audio finishes playing
	currentAudio.onended = () => {
		// update isPlaying state
		isPlaying = false;

		// attempt to pull next audio output from queue
		if (audioQueue.length) playAudio();
	};
}

function stopAudio() {
	// stop the audio playback
	currentAudio?.pause();
	currentAudio = null;

	// update audio playback state
	isPlaying = false;

	// clear the audioQueue
	audioQueue.length = 0;
}



document.addEventListener('keydown', (event) => {
  if (event.key === 's') {
    startSpeaking()
    // handleStart();
  } else if (event.key === 'm') {
    handleButtonClick();
  }
});