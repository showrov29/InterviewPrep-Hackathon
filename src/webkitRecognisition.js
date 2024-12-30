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
recognition.onresult = (event) => {
  let interimTranscript = '';
  for (let i = event.resultIndex, len = event.results.length; i < len; i++) {
    let transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
        console.log('finalTranscript: ', finalTranscript);
        
      finalTranscript += transcript;
    } else {
      interimTranscript += transcript;
    }
  }
//   console.log(finalTranscript + interimTranscript);
}



function startMicrophone() {
  recognition.start();
}

function stopMicrophone() {
  recognition.stop();
}