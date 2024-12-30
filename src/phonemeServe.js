export default async function phonemeProcessor(data, wordCache, pronouncing, io) {
    let tempArr = [];
    for (let i = 0; i < data.length; i++) {
      let phonemeArr = await phonemeSplitter(data[i].word);
      phonemeArr = phonemeArr.flat();
      tempArr.push({ ...data[i], phoneme: phonemeArr });
    }
    io.emit("phonemeResult", tempArr);
    async function phonemeSplitter(str) {
      let arr = await generatePhoneme(str);
      let splittedFinalArr = [];
      for (let phoneme of arr) {
        if (!isPunctuation(phoneme)) {
          if (phoneme != " ") {
            let phonemeArr = phoneme.split(" ");
            splittedFinalArr.push(phonemeArr);
          } else {
            splittedFinalArr.push([phoneme]);
          }
        } else {
          splittedFinalArr.push([phoneme]);
        }
      }
      return splittedFinalArr;
    }
    async function generatePhoneme(text) {
      let finalArr = [];
      let stringArr = text.match(/(\w+|[^\w\s])/g) || [];
      for (let word of stringArr) {
        if (!isPunctuationOrSpace(word)) {
          let lowerWord = word.toLowerCase();
          if (wordCache[lowerWord]) {
            finalArr.push(wordCache[lowerWord]);
          } else {
            const phonemes = await pronouncing.phonesForWord(lowerWord);
            if (phonemes.length !== 0) {
              let phonemeArr = phonemes[0].split(" ");
              let ourPhoneme = phonemeArr.map(mapToAvailablePhoneme).join(" ");
              wordCache[lowerWord] = ourPhoneme;
              finalArr.push(ourPhoneme);
            } else {
              finalArr.push("unknown");
            }
          }
        } else {
          finalArr.push(word);
        }
      }
      return finalArr;
    }
  }
  function isPunctuation(char) {
    const punctuationMarks = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
    return punctuationMarks.includes(char);
  }
  function isPunctuationOrSpace(char) {
    return /[^\w\s]/.test(char) || /\s/.test(char);
  }
  const phonemeMap = {
    AA: "aa",
    AE: "ae",
    AH: "ah",
    AO: "ao",
    AW: "ao",
    AY: "ay",
    B: "b",
    CH: "ch",
    D: "d",
    DH: "dh",
    EH: "eh",
    ER: "er",
    EY: "ey",
    F: "f",
    G: "g",
    HH: "hh",
    IH: "ih",
    IY: "iy",
    JH: "j",
    K: "k",
    L: "l",
    M: "m",
    N: "n",
    NG: "ng",
    OW: "ow",
    OY: "oy",
    P: "p",
    R: "r",
    S: "s",
    SH: "sh",
    T: "t",
    TH: "th",
    UH: "u",
    UW: "uw",
    V: "v",
    W: "w",
    Y: "y",
    Z: "z",
    ZH: "sh",
    SIL: "silence",
  };
  /**
     * The function `mapToAvailablePhoneme` maps CMU phonemes to available phonemes in a predefined list.
     * @param cmuPhoneme - Thank you for providing the `mapToAvailablePhoneme` function. If you provide me
     * with the `cmuPhoneme` parameter, I can help you determine the corresponding available phoneme based
     * on the mapping in the function. Please go ahead and provide the `cmuPhoneme
     * @returns The function `mapToAvailablePhoneme` returns the corresponding available phoneme based on
     * the input CMU phoneme after removing stress markers.
     */
  function mapToAvailablePhoneme(cmuPhoneme) {
    const cleanedPhoneme = cmuPhoneme.replace(/\d/g, "");
    return phonemeMap[cleanedPhoneme] || "unknown";
  }
  
  