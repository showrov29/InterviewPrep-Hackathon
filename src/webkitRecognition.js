const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = true;

let finalTranscript = '';

recognition.onstart = () => {
    console.log('Speech recognition service has started');
}


recognition.onend = () => {
    console.log('Speech recognition service disconnected');
  }
recognition.onresult = async (event) => {
  let interimTranscript = '';
  for (let i = event.resultIndex, len = event.results.length; i < len; i++) {
    let transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript = ''
      finalTranscript += transcript;
      console.log('finalTranscript: ', finalTranscript);
      let response = await getResponse(finalTranscript)  
      // let response = "A quick brown fox jumps over the lazy dog"
      console.log("🚀 ~ response:", response)
      getAudioAndCharsFromElevenLabs(response)
    } else {
      interimTranscript += transcript;
      let user_text = document.getElementById('user-text');
      let user_div = document.getElementById('user-div');
      user_div.style.display = "block"
      user_text.innerHTML = "You: " + interimTranscript;
    }
  }
//   console.log(finalTranscript + interimTranscript);
}



function startMicrophone() {
      document.getElementById("speak-button").style.display = 'inline-block'
      micIndicator.visible = true
  recognition.start();
}

function stopMicrophone() {
  micIndicator.visible = false
  recognition.stop();
}