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
conversations = new Proxy([], {
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

let confidence = [];
let communication = [];
let attitude = [];
let improvements = [];
let backstory = [];


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
// const stats = Stats();
// document.body.appendChild(stats.dom);

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
    // stats.update();
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
      apiKey: "gsL9rIfx3HO6DbIbtN1rC6ABXWciNOFG8MvQgeU765gKTnEU",
      secretKey:
        "1co9e5iQhwq0eApZ62AniCDOCAntJeccHeb6ZAsUZnIghvQrUt2jydqjk6DXzYeF",
    });
  }

  socket = await client.empathicVoice.chat.connect({
    configId: import.meta.env.VITE_HUME_WEATHER_ASSISTANT_CONFIG_ID || null,
    resumedChatGroupId: chatGroupId,
    
  });

  socket.on("open", () => {
    handleWebSocketOpenEvent();

    socket.sendUserInput(current_prompt);

    // socket?.sendMessage(userMessage);
  });
  socket.on("message", handleSocketMessageEvent);
  socket.on("close", () => {
    console.log("Socket connection closed");
  });
};

export const startSpeaking = async () => {
  connect();
};

async function handleWebSocketOpenEvent() {
  if (socket.readyState === WebSocket.OPEN) {
    console.log("socket opened");
    connected = true;
    await captureAudio();
  }
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
		if (data?.size < 1) return;
		const encodedAudioData = await convertBlobToBase64(data);
		const audioInput = {
			data: encodedAudioData,
		};
    if (socket.readyState === WebSocket.OPEN) {
      socket.sendAudioInput(audioInput);
    }
	};
	const timeSlice = 100;
	recorder.start(timeSlice);
}
let user_conv_count = 0;
let oncer = true;
async function handleSocketMessageEvent(message) {
	console.log("🚀 ~ handleSocketMessageEvent ~ message:", message);
  user_conv_count = conversations.filter(conversation => conversation.role === 'user').length - 1;
  console.log("🚀 ~ handleSocketMessageEvent ~ user_conv_count:", user_conv_count)
  if(message.type == "assistant_end" && user_conv_count>15 && oncer){
    oncer = false;
        console.log("🚀 ~ handleSocketMessageEvent ~ assistant_end");
        if(current_role === 'technical'){
          socket.sendUserInput(end_technical_prompt);
        }
        else if (current_role === 'hr') {
          socket.sendUserInput(end_hr_prompt);
        } else if (current_role === 'barista') {
          socket.sendUserInput(end_barista_prompt);
        }
}
// if (score < 0 && !interimPromptSent) {
//   interimPromptSent = true;
//   socket.sendUserInput(interim_prompt);
// } else if (score > 0 && !interimPromptSent) {
//   interimPromptSent = true;
//   socket.sendUserInput(interim_prompt);
// }
if (message.type == "assistant_end" && user_conv_count > 15 && oncer) {
  oncer = false;
  console.log("🚀 ~ handleSocketMessageEvent ~ assistant_end");
  if (current_role === 'technical') {
    socket.sendUserInput(end_technical_prompt);
  } else if (current_role === 'hr') {
    socket.sendUserInput(end_hr_prompt);
  } else if (current_role === 'barista') {
    socket.sendUserInput(end_barista_prompt);
  }
}
	switch (message.type) {
		// save chat_group_id to resume chat if disconnected
		case "chat_metadata":
			chatGroupId = message.chatGroupId;
			break;

		// append user and assistant messages to UI for chat visibility
		case "user_message":
      let lastResponse = message.message.content;
      if(conversations.length>0){
      getFeedback(lastResponse).then(response => {
        console.log("🚀 ~ handleSocketMessageEvent ~ response", response)

        score += parseFloat(response);
        score = Math.max(-5, Math.min(5, score));
        console.log("🚀 ~ handleSocketMessageEvent ~ score", score)
      
    updateScoreSlider(score);
      }
      );
    }
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
      if(content == end_technical_prompt || content == end_hr_prompt || content == end_barista_prompt){
        console.log('you can end now')
        sessionEnded = true;
      }
      else{
        conversations.push({role, content, topThreeEmotions})
      }
      if(conversations.length>6){
        document.getElementById('end-button').style.display = 'inline-block';
      }
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
    stopAudio();
    socket.close();
    // stopMicrophone();
    document.getElementById("audioPlayback").pause();
    document.getElementById("end-button").style.display = 'none';
    document.getElementById("speak-button-id").style.display = 'none';
    document.getElementById("toggle-button").style.display = 'none';
    document.getElementById("start-button").style.display = 'none';
    document.getElementById("user-div").style.display = 'none';
    document.getElementById("interviewer-div").style.display = 'none';
    document.getElementById("conversation").style.display = 'none';
    document.getElementById("score-slider-container").style.display = 'none';
    document.getElementById("audioPlayback").style.display = 'none';
    document.body.style.overflow = 'auto'; // Enable scrolling if needed

    // Hide Three.js canvas
    renderer.domElement.style.display = 'none';

    // Create and display the loading screen
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.style.position = 'fixed';
    loadingScreen.style.top = '50%';
    loadingScreen.style.left = '50%';
    loadingScreen.style.transform = 'translate(-50%, -50%)';
    loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    loadingScreen.style.color = 'white';
    loadingScreen.style.padding = '20px';
    loadingScreen.style.borderRadius = '8px';
    loadingScreen.style.zIndex = '1000';
    loadingScreen.innerHTML = '<p>Loading...</p>';
    document.body.appendChild(loadingScreen);

    // Fetch result
    let result = await getFinalFeedback();
    console.log("🚀 ~ handleEnd ~ result:", result)
    
    result = JSON.parse(result);
    
    console.log("🚀 ~ handleEnd ~ result_parsed:", result);
    
    // Remove loading screen
    document.body.removeChild(loadingScreen);

    // Check localStorage for existing result
    let storedConfidence = JSON.parse(localStorage.getItem('confidence')) || [];
    storedConfidence.push(result.confidence);
    localStorage.setItem('confidence', JSON.stringify(storedConfidence));
    let storedCommunication = JSON.parse(localStorage.getItem('communication')) || [];
    storedCommunication.push(result.communication);
    localStorage.setItem('communication', JSON.stringify(storedCommunication));
    let storedAttitude = JSON.parse(localStorage.getItem('attitude')) || [];
    storedAttitude.push(result.attitude);
    localStorage.setItem('attitude', JSON.stringify(storedAttitude));
    let storedImprovements = JSON.parse(localStorage.getItem('improvements')) || [];
     storedImprovements = result.Improvements
    console.log("🚀 ~ handleEnd ~ storedImprovements:", storedImprovements)
    localStorage.setItem('improvements', JSON.stringify(storedImprovements));

    let storedBackstory = JSON.parse(localStorage.getItem('backstory')) || [];
    storedBackstory.push(
      {
        "label": new Date().toLocaleDateString(),
        "description": result.backstory,
        "value": result.score
      }
    );
    localStorage.setItem('backstory', JSON.stringify(storedBackstory));

    // Create and display the modal
    const resultModal = document.createElement('div');
    resultModal.id = 'result-modal';
    resultModal.style.position = 'fixed';
    resultModal.style.top = '50%';
    resultModal.style.left = '50%';
    resultModal.style.transform = 'translate(-50%, -50%)';
    resultModal.style.width = '90%';
    resultModal.style.height = '90%';
    resultModal.style.backgroundColor = 'white';
    resultModal.style.padding = '20px';
    resultModal.style.borderRadius = '8px';
    resultModal.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    resultModal.style.zIndex = '1000';
    resultModal.style.overflowY = 'auto';
    document.body.appendChild(resultModal);

    const closeModalButton = document.createElement('button');
    closeModalButton.innerHTML = '&times;';
    closeModalButton.style.position = 'absolute';
    closeModalButton.style.top = '10px';
    closeModalButton.style.right = '10px';
    closeModalButton.style.background = 'none';
    closeModalButton.style.border = 'none';
    closeModalButton.style.fontSize = '24px';
    closeModalButton.style.cursor = 'pointer';
    closeModalButton.addEventListener('click', () => {
      resultModal.style.display = 'none';
    });
    resultModal.appendChild(closeModalButton);

    const contentContainer = document.createElement('div');
    contentContainer.style.display = 'flex';
    resultModal.appendChild(contentContainer);

    const barsColumn = document.createElement('div');
    barsColumn.style.width = '50%';
    barsColumn.style.display = 'flex';
    barsColumn.style.flexDirection = 'column';
    barsColumn.style.justifyContent = 'space-around';
    contentContainer.appendChild(barsColumn);

    const confidenceBar = createBar('Confidence', result.confidence);
    const communicationBar = createBar('Communication', result.communication);
    const attitudeBar = createBar('Attitude', result.attitude);
    barsColumn.appendChild(confidenceBar);
    barsColumn.appendChild(communicationBar);
    barsColumn.appendChild(attitudeBar);

    const improvementsContainer = document.createElement('div');
    improvementsContainer.style.marginBottom = '20px';
    improvementsContainer.style.padding = '10px';
    improvementsContainer.style.backgroundColor = '#f9f9f9';
    improvementsContainer.style.borderRadius = '8px';
    improvementsContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    barsColumn.appendChild(improvementsContainer);

    const improvementsTitle = document.createElement('h2');
    improvementsTitle.textContent = 'Improvements';
    improvementsContainer.appendChild(improvementsTitle);

    const improvementsList = document.createElement('ul');
    storedImprovements.forEach(point => {
      const listItem = document.createElement('li');
      listItem.textContent = `• ${point}`;
      improvementsList.appendChild(listItem);
    });
    improvementsContainer.appendChild(improvementsList);

    const backstoryContainer = document.createElement('div');
    backstoryContainer.style.padding = '10px';
    backstoryContainer.style.backgroundColor = '#f9f9f9';
    backstoryContainer.style.borderRadius = '8px';
    backstoryContainer.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    barsColumn.appendChild(backstoryContainer);

    const backstoryTitle = document.createElement('h2');
    backstoryTitle.textContent = 'Backstory';
    backstoryContainer.appendChild(backstoryTitle);

    const backstoryContent = document.createElement('p');
    backstoryContent.textContent = result.backstory;
    backstoryContainer.appendChild(backstoryContent);

    const rightColumn = document.createElement('div');
    rightColumn.style.width = '50%';
    rightColumn.style.display = 'flex';
    rightColumn.style.flexDirection = 'column';
    rightColumn.style.justifyContent = 'space-around';
    contentContainer.appendChild(rightColumn);

    const scoreContainer = document.createElement('div');
    scoreContainer.style.display = 'flex';
    scoreContainer.style.justifyContent = 'center';
    scoreContainer.style.marginBottom = '20px';
    rightColumn.appendChild(scoreContainer);

    const scoreCanvas = document.createElement('canvas');
    scoreCanvas.id = 'score-canvas';
    scoreCanvas.style.width = '200px';
    scoreCanvas.style.height = '200px';
    scoreContainer.appendChild(scoreCanvas);

    // Load Chart.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => {
      const ctx = scoreCanvas.getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Score'],
          datasets: [{
            data: [result.score, 100 - result.score],
            backgroundColor: ['#4caf50', '#e0e0e0']
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
                  text: `${result.score}%`,
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
    };
    document.head.appendChild(script);
  }

  function createBar(label, value) {
    const barContainer = document.createElement('div');
    barContainer.style.width = '80%';
    barContainer.style.margin = '10px auto';
    barContainer.style.textAlign = 'center';

    const barLabel = document.createElement('div');
    barLabel.textContent = label;
    barLabel.style.marginBottom = '10px';
    barContainer.appendChild(barLabel);

    const bar = document.createElement('div');
    bar.style.height = '20px';
    bar.style.width = '100%';
    bar.style.backgroundColor = '#e0e0e0';
    bar.style.borderRadius = '10px';
    bar.style.overflow = 'hidden';
    barContainer.appendChild(bar);

    const barFill = document.createElement('div');
    barFill.style.height = '100%';
    barFill.style.width = `${value}%`;
    barFill.style.backgroundColor = getBarColor(value);
    bar.appendChild(barFill);

    return barContainer;
  }

  function getBarColor(value) {
    if (value < 30) return '#ff0000';
    if (value <= 70) return '#ffeb3b';
    return '#4caf50';
  }

  async function initSpeech() {
    startSpeaking()
    // response = await getResponse(`Hello!`);
    // getAudioAndCharsFromElevenLabs(response)
  }

 

  document.getElementById('start-button').addEventListener('click', handleStart);
  document.getElementById('end-button').addEventListener('click', handleEnd);
  // document.getElementById('toggle-button').addEventListener('click', handleToggle);
  document.getElementById('end-button').addEventListener('click', handleEnd);

const dashboardButton = document.createElement('button');
dashboardButton.id = 'dashboard-button';
dashboardButton.textContent = 'Dashboard';
dashboardButton.style.position = 'absolute';
dashboardButton.style.top = '2%';
dashboardButton.style.left = '4.5%';
dashboardButton.style.padding = '10px 20px';
dashboardButton.style.backgroundColor = '#4CAF50';
dashboardButton.style.color = 'white';
dashboardButton.style.border = 'none';
dashboardButton.style.borderRadius = '12px';
dashboardButton.style.cursor = 'pointer';
dashboardButton.style.fontSize = '16px';
dashboardButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
dashboardButton.style.transition = 'background-color 0.3s ease';

dashboardButton.addEventListener('mouseover', () => {
  dashboardButton.style.backgroundColor = '#45a049';
});

dashboardButton.addEventListener('mouseout', () => {
  dashboardButton.style.backgroundColor = '#4CAF50';
});
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

const bulletPointsTitle = document.createElement('h1');
bulletPointsTitle.innerHTML = '<h1><b>Key Points</b></h1></br>';
bulletPointsContainer.appendChild(bulletPointsTitle);

const bulletPointsList = document.createElement('ul');
const bulletPoints = JSON.parse(localStorage.getItem('improvements')) || [];
bulletPoints?.forEach(point => {
  const listItem = document.createElement('li');
  listItem.textContent = `• ${point}`;
  bulletPointsList.appendChild(listItem);
});
bulletPointsContainer.appendChild(bulletPointsList);

const data = JSON.parse(localStorage.getItem('backstory')) || [];

const indicatorsContainer = document.createElement('div');
indicatorsContainer.style.display = 'flex';
indicatorsContainer.style.flexWrap = 'wrap';
indicatorsContainer.style.justifyContent = 'start';
indicatorsContainer.style.gap = '20px';
dashboardModal.appendChild(indicatorsContainer);

data?.forEach((item, index) => {
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
      labels: data?.map((_, index) => `Conv ${index + 1}`),
      datasets: [
        {
          label: 'Confidence',
          data: JSON.parse(localStorage.getItem('confidence')) || [],
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          fill: false
        },
        {
          label: 'Communication Skill',
          data: JSON.parse(localStorage.getItem('communication')) || [],
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2,
          fill: false
        },
        {
          label: 'Attitude',
          data: JSON.parse(localStorage.getItem('attitude')) || [],
          borderColor: 'rgba(255, 159, 64, 1)',
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
            text: 'Count'
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

  data?.forEach((item, index) => {
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
    conversationContainer.classList.add('auto-scroll');
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
        emotionSpan.style.width = `${parseInt((Number(score)*100))}%`;
        emotionSpan.style.height = '5px';
        emotionSpan.style.backgroundColor = getEmotionColor(emotion, score);
        emotionContainer.appendChild(emotionSpan);
  
        const emotionValue = document.createElement('div');
        emotionValue.textContent = `${parseInt((Number(score)*100))}`;
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
  
    // Scroll to the bottom
    conversationContainer.scrollTop = conversationContainer.scrollHeight;
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