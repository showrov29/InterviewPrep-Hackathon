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
let conversations = new Proxy([], {
  set: function (target, property, value, receiver) {
    target[property] = value;
    if (property !== 'length') {
      updateConversationUI();
    }
    return true;
  }
});
let isActive=true
let isSpeaking = false
// hume ai code ends
let visemes = []
let thisVisemeIndex = 0;
let lastVisemeIndex = 0;
let dictionary;
let mixer;
let blinkLeftIndex

let blinkRightIndex


let technical_prompt = `You are Alex, a seasoned software engineer conducting the technical interview for the role of Junior Software Engineer. Your goal is to assess the candidate's technical proficiency, problem-solving abilities, and understanding of core programming concepts. Tailor your questions to gauge the candidate's ability to apply their knowledge to practical scenarios and explain their thought process clearly. Ensure the questions are structured progressively, starting with fundamentals and gradually increasing in complexity.
  
Focus areas for the questions should include:

Programming concepts (data structures, algorithms, OOP).
Problem-solving and debugging.
Familiarity with tools, frameworks, or languages mentioned in the job description.
Code optimization and best practices.
Their approach to version control (e.g., Git).
Ask 8–10 questions, ensuring a mix of conceptual and scenario-based challenges. Encourage the candidate to talk through their thought process for each answer. Provide them with code snippets or short problems as needed for a practical evaluation. Your response should be less than 10 words, setting a professional and collaborative tone. Avoid unnecessary formalities or non-technical discussions. First you'll introduce yourself and make the candidate comfortable.

Example:
User: Hello!
You: Hello, welcome! I’m Alex, your technical interviewer today. Let’s dive into some coding and problem-solving!`
let hr_prompt = `You are Steve, a professional interviewer who is evaluating HR part for the job of Junior Software Engineer. He has done his technical round already. Your job is to ask thoughtful and relevant questions to the interviewer that demonstrate the candidate's curiosity, interest in the company, and alignment with its culture. Ensure the questions are polite, engaging, and reflective of the candidate's desire to understand the company's environment, values, and growth opportunities. Avoid overly technical or role-specific questions in this context. Ask 8-10 questions, covering topics like:- Company culture and work environment- Opportunities for professional growth- Team dynamics and communication- Leadership style and expectations- Work-life balance and flexibility Make sure the questions are concise, open-ended, and conversational. Don't offer any tea coffee or anything. Your introductory speech should be around 15 words.

For example:
user: Hello!
You: Hello! welcome, and thank you for taking the time to meet with us today. I hope you're doing well. My name is Steve, and I’m part of the HR team here. It's great to have you here.`

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
  // console.log("🚀 ~ targetName:", targetName)
  if (!avatar) {
    console.error("Model not loaded yet.");
    return;
  }

  avatar.children[0].getObjectByName('Wolf3D_Avatar').morphTargetInfluences[lastVisemeIndex] = 0;
  thisVisemeIndex = dictionary[targetName] || 0;
  // console.log("🚀 ~ thisVisemeIndex:", targetName,dictionary)
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
      apiKey: "1hNtzZBkVzpvurVq2e38gqsUcEorLAXElG6b2nQB3pMU8ZUb",
      secretKey:
        "N7k7VzhYwLcvA2WS9zR7tncItT0wAGnhewMF9jlGY9DG7v64mglWlHx8pEAddxQx",
    });
  }

  socket = await client.empathicVoice.chat.connect({
    configId: import.meta.env.VITE_HUME_WEATHER_ASSISTANT_CONFIG_ID || null,
    resumedChatGroupId: chatGroupId,
    
  });

  socket.on("open", () => {
    handleWebSocketOpenEvent();

    if(document.getElementById('toggle-button').textContent == 'Technical'){
      socket.sendUserInput(technical_prompt);
      console.log('technical');

    }
    else if(document.getElementById('toggle-button').textContent == 'real-life'){
      // socket.sendUserInput(technical_prompt);
      console.log('real-life');
      
    }
    else if(document.getElementById('toggle-button').textContent == 'HR'){
      console.log('hr');
      
      socket.sendUserInput(hr_prompt);
    }

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

      visemes= mapStringToVisemes(message.message.content)
    //  mapVisemesToModel(visemes)
     console.log("🚀 ~ handleSocketMessageEvent ~ visemes:", visemes)

			const { role, content } = message.message;
			const topThreeEmotions = extractTopThreeEmotions(message);
      conversations.push({role, content, topThreeEmotions})
			// appendMessage(role, content ?? "", topThreeEmotions);
      console.log("🚀 ~ handleSocketMessageEvent ~ conversations", conversations)
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
      console.log("🚀 ~ handleSocketMessageEvent ~ user_interruption");
      
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
// console.log("🚀 ~ playAudio ~ currentAudio", currentAudio.duration);

	// play audio
	currentAudio.play();
  currentAudio.onplay = () => {
    mapVisemesToModel(visemes)
    console.log("🚀 ~ playAudio ~ current", currentAudio);
    
  }

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
  console.log("🚀 ~ stopAudio ~ audioQueue");
  
}



document.addEventListener('keydown', (event) => {
  if (event.key === 's') {
    startSpeaking()
    // handleStart();
  } else if (event.key === 'm') {
    handleButtonClick();
  }
});



  function handleButtonClick() {
    let user_text = document.getElementById('user-text');
    let button = document.getElementById('speak-button-id')

    if (isListening) {
      user_text.innerHTML = '';
      button.innerHTML = 'Speak';
      button.classList.remove('listening');
      stopMicrophone();
    } else {
      user_text.innerHTML = 'Listening...';
      button.innerHTML = 'Stop';
      button.classList.add('listening');
      elevenLabsSocket = new WebSocket(wsUrl);
      startMicrophone();
    }

    isListening = !isListening;
  }
  function handleStart() {
    document.getElementById("start-button").style.display = 'none';
    document.getElementById("toggle-button").style.display = 'none';
    initSpeech();
  }

  async function handleEnd() {
    stopMicrophone();
    document.getElementById("audioPlayback").pause();
    document.getElementById("end-button").style.display = 'none';
    document.getElementById("speak-button-id").style.display = 'none';
    document.getElementById("toggle-button").style.display = 'none';
    document.getElementById("start-button").style.display = 'none';
    document.getElementById("user-div").style.display = 'none';
    document.getElementById("interviewer-div").style.display = 'none';
    document.getElementById("audioPlayback").style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable scrolling if needed

    // Hide Three.js canvas
    renderer.domElement.style.display = 'none';

    // Fetch result
    let result = await getResponse("", true);
    console.log("🚀 ~ handleEnd ~ result:", result);

    // Process result to add new lines if asterisk (*) is found
    result = result.replace(/\:::/g, '<br>');

    // Show result
    const resultDiv = document.createElement('div');
    resultDiv.id = 'result-div';
    resultDiv.style.position = 'absolute';
    resultDiv.style.lineHeight = 1.6
    resultDiv.style.top = '50%';
    resultDiv.style.left = '50%';
    resultDiv.style.transform = 'translate(-50%, -50%)';
    resultDiv.style.backgroundColor = 'white';
    resultDiv.style.padding = '20px';
    resultDiv.style.borderRadius = '8px';
    resultDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    resultDiv.innerHTML = `<div><p style="font-weight: bold; text-align: center; font-size: 20px">Here is how you did</p><p style="text-align: justify">${result}</p></div>`;
    document.body.appendChild(resultDiv);
  }

  async function initSpeech() {
    startSpeaking()
    // response = await getResponse(`Hello!`);
    // getAudioAndCharsFromElevenLabs(response)
  }

  function handleToggle() {
    const toggleButton = document.getElementById("toggle-button");

    if (toggleButton.classList.contains('technical')) {
      toggleButton.classList.remove('technical');
      toggleButton.classList.add('hr');
      toggleButton.innerHTML = "HR";
      // updateSystemPrompt(hr_prompt)
    } else {
      toggleButton.classList.remove('hr');
      toggleButton.classList.add('technical');
      toggleButton.innerHTML = "Technical";
      // updateSystemPrompt(technical_prompt)
    }
  }



  document.getElementById('start-button').addEventListener('click', handleStart);
  document.getElementById('toggle-button').addEventListener('click', handleToggle);
  document.getElementById('end-button').addEventListener('click', handleEnd);

const dashboardButton = document.createElement('button');
dashboardButton.id = 'dashboard-button';
dashboardButton.textContent = 'Dashboard';
dashboardButton.style.position = 'absolute';
dashboardButton.style.top = '10px';
dashboardButton.style.left = '10px';
document.body.appendChild(dashboardButton);

dashboardButton.addEventListener('click', () => {
  document.getElementById('dashboard-modal').style.display = 'block';
});

const dashboardModal = document.createElement('div');
dashboardModal.id = 'dashboard-modal';
dashboardModal.style.display = 'none';
dashboardModal.style.position = 'fixed';
dashboardModal.style.top = '50%';
dashboardModal.style.left = '50%';
dashboardModal.style.transform = 'translate(-50%, -50%)';
dashboardModal.style.width = '90%';
dashboardModal.style.height = '90%';
dashboardModal.style.backgroundColor = 'white';
dashboardModal.style.padding = '20px';
dashboardModal.style.borderRadius = '8px';
dashboardModal.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
dashboardModal.style.zIndex = '1000';
dashboardModal.style.overflowY = 'auto';
document.body.appendChild(dashboardModal);

const closeModalButton = document.createElement('button');
closeModalButton.textContent = 'Close';
closeModalButton.style.position = 'absolute';
closeModalButton.style.top = '10px';
closeModalButton.style.right = '10px';
closeModalButton.addEventListener('click', () => {
  dashboardModal.style.display = 'none';
});
dashboardModal.appendChild(closeModalButton);

const topContainer = document.createElement('div');
topContainer.style.display = 'flex';
topContainer.style.justifyContent = 'space-between';
topContainer.style.marginBottom = '20px';
dashboardModal.appendChild(topContainer);

const chartContainer = document.createElement('div');
chartContainer.id = 'chart-container';
chartContainer.style.width = '48%';
chartContainer.style.height = '40%';
topContainer.appendChild(chartContainer);

const canvas = document.createElement('canvas');
canvas.id = 'line-chart';
canvas.style.width = '100%';
chartContainer.appendChild(canvas);

const bulletPointsContainer = document.createElement('div');
bulletPointsContainer.style.width = '48%';
bulletPointsContainer.style.padding = '20px';
bulletPointsContainer.style.backgroundColor = '#f9f9f9';
bulletPointsContainer.style.borderRadius = '8px';
bulletPointsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
topContainer.appendChild(bulletPointsContainer);

const bulletPointsTitle = document.createElement('h2');
bulletPointsTitle.textContent = 'Key Points';
bulletPointsContainer.appendChild(bulletPointsTitle);

const bulletPointsList = document.createElement('ul');
const bulletPoints = [
  'Point 1: Description of point 1.',
  'Point 2: Description of point 2.',
  'Point 3: Description of point 3.',
  'Point 4: Description of point 4.',
  'Point 5: Description of point 5.'
];
bulletPoints.forEach(point => {
  const listItem = document.createElement('li');
  listItem.textContent = point;
  bulletPointsList.appendChild(listItem);
});
bulletPointsContainer.appendChild(bulletPointsList);

const data = [
  { label: 'Progress 1', value: 25, description: 'Description for Progress 1' },
  { label: 'Progress 2', value: 50, description: 'Description for Progress 2' },
  { label: 'Progress 3', value: 90, description: 'Description for Progress 3' },
  { label: 'Progress 4', value: 70, description: 'Description for Progress 4' },
  { label: 'Progress 5', value: 85, description: 'Description for Progress 5' },
  { label: 'Progress 6', value: 40, description: 'Description for Progress 6' }
];

const indicatorsContainer = document.createElement('div');
indicatorsContainer.style.display = 'flex';
indicatorsContainer.style.flexWrap = 'wrap';
indicatorsContainer.style.justifyContent = 'space-between';
dashboardModal.appendChild(indicatorsContainer);

data.forEach((item, index) => {
  const columnContainer = document.createElement('div');
  columnContainer.style.display = 'flex';
  columnContainer.style.flexDirection = 'column';
  columnContainer.style.alignItems = 'center';
  columnContainer.style.width = '18%';
  columnContainer.style.marginBottom = '20px';
  indicatorsContainer.appendChild(columnContainer);

  const circularIndicator = document.createElement('canvas');
  circularIndicator.id = `circular-indicator-${index}`;
  circularIndicator.style.width = '100%';
  circularIndicator.style.height = '100%';
  columnContainer.appendChild(circularIndicator);

  const circularLabel = document.createElement('div');
  circularLabel.textContent = item.label;
  circularLabel.style.marginTop = '10px';
  columnContainer.appendChild(circularLabel);

  const descriptionModal = document.createElement('div');
  descriptionModal.id = `description-modal-${index}`;
  descriptionModal.style.width = '100%';
  descriptionModal.style.padding = '20px';
  descriptionModal.style.backgroundColor = '#f9f9f9';
  descriptionModal.style.borderRadius = '8px';
  descriptionModal.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  descriptionModal.style.textAlign = 'center';
  descriptionModal.style.marginTop = '10px';
  columnContainer.appendChild(descriptionModal);

  const descriptionContent = document.createElement('p');
  descriptionContent.textContent = item.description;
  descriptionModal.appendChild(descriptionContent);
});

// Load Chart.js dynamically
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
script.onload = () => {
  const ctx = canvas.getContext('2d');
  const lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [
        {
          label: 'Dataset 1',
          data: [65, 59, 80, 81, 56, 55, 40],
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          fill: false
        },
        {
          label: 'Dataset 2',
          data: [28, 48, 40, 19, 86, 27, 90],
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Month'
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Value'
          }
        }
      }
    }
  });

  data.forEach((item, index) => {
    const ctx = document.getElementById(`circular-indicator-${index}`).getContext('2d');
    const backgroundColor = item.value < 30 ? '#ff0000' : item.value <= 70 ? '#ffeb3b' : '#4caf50';
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Score'],
        datasets: [{
          data: [item.value, 100 - item.value],
          backgroundColor: [backgroundColor, '#e0e0e0']
        }]
      },
      options: {
        responsive: true,
        cutout: '50%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (tooltipItem) {
                return `${tooltipItem.label}: ${tooltipItem.raw}%`;
              }
            }
          },
          doughnutlabel: {
            labels: [
              {
                text: `${item.value}%`,
                font: {
                  size: '20'
                },
                color: '#000'
              }
            ]
          }
        }
      }
    });
  });
};
document.head.appendChild(script);

  function updateConversationUI() {
    const conversationContainer = document.getElementById('conversation');
    conversationContainer.innerHTML = ''; // Clear existing content
    conversationContainer.style.position = 'absolute';
    conversationContainer.style.top = '10px';
    conversationContainer.style.right = '10px';
    conversationContainer.style.width = '300px';
    conversationContainer.style.maxHeight = '90vh';
    conversationContainer.style.overflowY = 'auto';
    conversationContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    conversationContainer.style.padding = '10px';
    conversationContainer.style.borderRadius = '8px';
    conversationContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  
    conversations.slice(1).forEach(({ role, content, topThreeEmotions }) => {
      const messageDiv = document.createElement('div');
      messageDiv.classList.add('message', role);
      messageDiv.style.border = '1px solid #ccc';
      messageDiv.style.padding = '10px';
      messageDiv.style.marginBottom = '10px';
      messageDiv.style.borderRadius = '5px';
      messageDiv.style.backgroundColor = role === 'user' ? '#e0f7fa' : '#f1f8e9';
  
      const contentDiv = document.createElement('div');
      contentDiv.textContent = content;
      messageDiv.appendChild(contentDiv);
  
      const emotionsDiv = document.createElement('div');
      emotionsDiv.classList.add('emotions');
      emotionsDiv.style.display = 'flex';
      emotionsDiv.style.justifyContent = 'space-between';
  
      topThreeEmotions.forEach(({ emotion, score }) => {
        const emotionContainer = document.createElement('div');
        emotionContainer.style.display = 'flex';
        emotionContainer.style.flexDirection = 'column';
        emotionContainer.style.alignItems = 'center';
        emotionContainer.style.marginBottom = '5px';
  
        const emotionName = document.createElement('div');
        emotionName.textContent = emotion;
        emotionName.style.fontSize = '12px';
        emotionName.style.marginBottom = '2px';
        emotionContainer.appendChild(emotionName);
  
        const emotionSpan = document.createElement('span');
        emotionSpan.classList.add('emotion');
        emotionSpan.style.display = 'inline-block';
        emotionSpan.style.width = `${((Number(score)*100).toFixed(2))}%`;
        emotionSpan.style.height = '5px';
        emotionSpan.style.backgroundColor = getEmotionColor(emotion, score);
        emotionContainer.appendChild(emotionSpan);
  
        const emotionValue = document.createElement('div');
        emotionValue.textContent = `${((Number(score)*100).toFixed(2))}%`;
        emotionValue.style.fontSize = '10px';
        emotionValue.style.marginTop = '2px';
        emotionContainer.appendChild(emotionValue);
  
        emotionsDiv.appendChild(emotionContainer);
      });
  
      messageDiv.appendChild(emotionsDiv);
  
      if (role === 'user') {
        messageDiv.style.textAlign = 'right';
      } else if (role === 'assistant') {
        messageDiv.style.textAlign = 'left';
      }
  
      conversationContainer.appendChild(messageDiv);
    });
  }
  
  function getEmotionColor(emotion, score) {
    const colors = {
      admiration: "midnightblue",
      adoration: "crimson",
      aestheticAppreciation: "indigo",
      amusement: "goldenrod",
      anger: "darkred",
      anxiety: "slategray",
      awe: "navy",
      awkwardness: "darkorange",
      boredom: "olive",
      calmness: "steelblue",
      concentration: "forestgreen",
      confusion: "darkviolet",
      contemplation: "darkgreen",
      contempt: "saddlebrown",
      contentment: "seagreen",
      craving: "chocolate",
      desire: "firebrick",
      determination: "darkblue",
      disappointment: "dimgray",
      disgust: "darkolivegreen",
      distress: "darkslategray",
      doubt: "mediumslateblue",
      ecstasy: "darkgoldenrod",
      embarrassment: "hotpink",
      empathicPain: "mediumorchid",
      entrancement: "mediumpurple",
      envy: "darkgreen",
      excitement: "darkorange",
      fear: "black",
      guilt: "darkblue",
      horror: "maroon",
      interest: "darkturquoise",
      joy: "darkyellow",
      love: "firebrick",
      nostalgia: "saddlebrown",
      pain: "indigo",
      pride: "goldenrod",
      realization: "deepskyblue",
      relief: "mediumseagreen",
      romance: "darkviolet",
      sadness: "royalblue",
      satisfaction: "darkseagreen",
      shame: "darkgray",
      surpriseNegative: "goldenrod",
      surprisePositive: "yellowgreen",
      sympathy: "cadetblue",
      tiredness: "dimgray",
      triumph: "darkgoldenrod"
    };
    return colors[emotion] || 'gray';
  }