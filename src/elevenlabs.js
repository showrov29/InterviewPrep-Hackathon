const voiceId = "CwhRBWXzGAHq8TQ4Fs17";
const model = "eleven_turbo_v2_5";
const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;
let elevenLabsSocket = new WebSocket(wsUrl);
elevenLabsSocket.onerror = function (error) {
  console.error("WebSocket error:", error);
  // Handle errors here, consider reconnecting
};

/**
 * Streams audio data for playback using the MediaSource API.
 * @param {ReadableStream} audioStream - The audio stream data.
 */
async function streamAudioData(audioStream) {
  const mediaSource = new MediaSource();
  const audioElement = document.getElementById("audioPlayback");
  
  audioElement.onended = function () {
      elevenLabsSocket = new WebSocket(wsUrl);
      if(firstTime){
        handleButtonClick()
        firstTime = false
      } else{
         startMicrophone();
      }
  }

  // Ensure audioElement is valid before using
  if (!audioElement) {
    console.error("Audio element not found!");
    return;
  }

  audioElement.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener("sourceopen", async () => {
    const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg"); // Adjust MIME type based on audio format
    const reader = audioStream.getReader(); // Get the reader for the audio stream

    async function readAndAppend() {
      const { done, value } = await reader.read(); // Read a chunk of the stream

      if (done) {
        // Check if mediaSource is still open before calling endOfStream()
        if (mediaSource.readyState === "open") {

          // Wait until all SourceBuffers have finished updating
          const waitForUpdates = Array.from(mediaSource.sourceBuffers).map(
            (sb) => {
              return new Promise((resolve) => {
                if (sb.updating) {
                  sb.addEventListener("updateend", function onUpdateEnd() {
                    sb.removeEventListener("updateend", onUpdateEnd);
                    resolve();
                  });
                } else {
                  resolve();
                }
              });
            }
          );

          // Ensure all source buffers have finished updating before ending the stream
          await Promise.all(waitForUpdates);

          mediaSource.readyState === "open" && mediaSource.endOfStream();
        } else {
          console.log("MediaSource is not in 'open' state during endOfStream");
        }
        return;
      }

      // Function to append buffer data when ready
      function appendWhenReady() {
        const firstSourceBuffer = mediaSource.sourceBuffers[0];
        if (firstSourceBuffer && firstSourceBuffer.updating) {
          firstSourceBuffer.addEventListener("updateend", appendWhenReady);
        } else if (firstSourceBuffer) {
          firstSourceBuffer.removeEventListener("updateend", appendWhenReady);

          // Append the audio chunk to the buffer
          try {
            firstSourceBuffer.appendBuffer(value);
            readAndAppend(); // Recursively read and append the next chunk
          } catch (error) {
            console.error("Error appending buffer:", error);
          }
        }
      }

      appendWhenReady(); // Call function to append the next buffer chunk
    }

    // Start reading and appending audio chunks
    readAndAppend();
  });

  mediaSource.addEventListener("error", (e) => {
    console.error("Error in MediaSource:", e);
  });
}

async function getAudioAndCharsFromElevenLabs(text ) {
  let donePlayingVisemes = false;
  const audioElement = document.getElementById("audioPlayback");
  let firstTime = true;
  let initialVisemes = [];
  let visemeIndex = 0;

  const audioStream = new ReadableStream({
    start(controller) {
      // Function to push audio chunks into the stream
      function pushChunk(chunk) {
        controller.enqueue(chunk);
      }
      // 2. Initialize the connection by sending the BOS message
      if (elevenLabsSocket.readyState === WebSocket.OPEN) {
        const bosMessage = {
          text: " ",
          voice_settings: {
            stability: 0.2,
            similarity_boost: 0.5,
          },
          xi_api_key: "sk_6e33f5b66e721da18f8773393324355639c3d0ee0255556b",
        };
        elevenLabsSocket.send(JSON.stringify(bosMessage));
        const textMessage = {
          text: `${text}.`,
        };
        elevenLabsSocket.send(JSON.stringify(textMessage));
        // End of Batch Sending
        const endMessage = {
          text: "", // Send empty string to indicate end of input
        };
        elevenLabsSocket.send(JSON.stringify(endMessage));
      }
      // 5. Handle server responses
      elevenLabsSocket.onmessage = async function (event) {
        const response = JSON.parse(event.data);

        if (response.audio) {
          const audioChunk = atob(response.audio);

          const dataArray = new Uint8Array(audioChunk.length);
          for (let i = 0; i < audioChunk.length; i++) {
            dataArray[i] = audioChunk.charCodeAt(i);
          }
          pushChunk(dataArray);
        }

        if (response.normalizedAlignment) {
          const { result, startTimeAdder } = elevenLabsResToObjArr(
            response.normalizedAlignment
          );

          prevChunkLastTime = startTimeAdder;

          let resultWithPhoneme = await addPhonemeToObj(result);

          let visemesOnly = convertToVisemes(resultWithPhoneme);

          initialVisemes.push(visemesOnly);

          // mapVisemesToModel(initialVisemes);
          // console.log("🚀 ~ initialVisemes:", initialVisemes)
          if (firstTime) {
            audioElement.play();
            let interviewText = document.getElementById("interviewer-text")
            interviewText.innerHTML = `<p>Interviewer:</p><p>${text}</p>`;
            let interviewDiv = document.getElementById("interviewer-div");
            interviewDiv.style.opacity = 0
            interviewDiv.style.display = "block"
            for (let i = 0; i <= 1; i += 0.1) {
              setTimeout(() => {
              interviewDiv.style.opacity = i;
              }, i * 500);
            }
          }
        }
      };

      // Handle errors
      elevenLabsSocket.onerror = function (error) {
        console.error(`WebSocket Error: ${error}`);
      };

      // Handle socket closing
      elevenLabsSocket.onclose = async function (event) {
        if (event.wasClean) {
          console.info(
            `Connection closed cleanly, code=${event.code}, reason=${event.reason}`
          );
        } else {
          console.warn("Connection died");
        }
        // Signal the end of the stream
        controller.close();
      };
    },
  });
  await streamAudioData(audioStream);
  audioElement.onplay = async () => {
    isAudioPlaying = true;
    firstTime = false;
    visemeIndex++;
    donePlayingVisemes = await mapVisemesToModel(initialVisemes[0]);
    console.log("🚀 ~ audioElement.onplay= ~ donePlayingVisemes:", donePlayingVisemes)
  };

  audioElement.addEventListener("ended", async () => {
    isAudioPlaying = false;
  });
  audioElement.ontimeupdate = async (track) => {
    if (donePlayingVisemes) {
      donePlayingVisemes = false;
      visemeIndex++;
      if (initialVisemes[visemeIndex - 1]) {
        donePlayingVisemes = await mapVisemesToModel(
          initialVisemes[visemeIndex - 1]
        );
        // donePlayingVisemes = true
      }
    }
  };
}

//Function to handle the text-to-speech and viseme data

function isPunctuation(char) {
  const punctuationMarks = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
  return punctuationMarks.includes(char);
}

function elevenLabsResToObjArr(charsArray, startTimeAdder = 0) {
  const { chars, charStartTimesMs, charDurationsMs } = charsArray;
  const result = [];
  let currentWord = "";
  let i = 0;
  let currentDuration = 0;

  chars.forEach((char, index) => {
    i = index;
    if (/\w/.test(char)) {
      currentWord += char;
      currentDuration += charDurationsMs[index];
    } else {
      if (currentWord !== "") {
        result.push({
          word: currentWord,
          startTime:
            startTimeAdder + charStartTimesMs[index - currentWord.length],
          duration: currentDuration,
        });
        currentWord = "";
        currentDuration = 0;
      }
      if (char !== "") {
        result.push({
          word: char,
          startTime: startTimeAdder + charStartTimesMs[index],
          duration: charDurationsMs[index],
        });
      }
    }
  });

  // Check if there's a leftover word
  if (currentWord !== "") {
    result.push({
      word: currentWord,
      startTime: startTimeAdder + charStartTimesMs[i],
      duration: charDurationsMs[i - currentWord.length],
    });
  }
  startTimeAdder =
    startTimeAdder +
    charsArray.charStartTimesMs.at(-1) +
    charsArray.charDurationsMs.at(-1);

  return { result, startTimeAdder };
}

async function addPhonemeToObj(resultArr) {
  let tempArr = await fetchPhonemeResult(resultArr);
  return tempArr;
}
function sendWord(word) {
  client.emit("sendWord", word);
}

function fetchPhonemeResult(word) {
    
  return new Promise((resolve, reject) => {
    client.emit("sendWord", word);

    client.once("phonemeResult", (data) => {
      resolve(data);
    });
  });
}

function convertToVisemes(arr) {
  let visArr = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].phoneme && arr[i].word) {
      let durationForEachPhn = Math.floor(
        arr[i].duration / arr[i].phoneme.length
      );

      arr[i].phoneme.forEach((phn, index) => {
        if (isPunctuation(phn) || phn == " ") {
          phn = "sil";
        }
        let vis = {
          value: phn,
          time: arr[i].startTime + index * durationForEachPhn,
        };
        visArr.push(vis);
      });
    }
  }
  return visArr;
}

async function mapVisemesToModel(visemes) {
  console.log("🚀 ~ mapVisemesToModel ~ visemes:", visemes.length);
  let totalComp = 0;
  return new Promise((resolve) => {
    for (let i = 0; i < visemes.length; i++) {
      const viseme = visemes[i];
      setTimeout(() => {
        changeMorphTargetByName(viseme.value);
        totalComp += 1;
        if (visemes.length === totalComp) {
          console.log('completed');
          resolve(true);
        }
      }, viseme.time);
    }
  });
}
