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
    AA: "viseme_aa",
    AE: "viseme_aa", // Assuming AE maps to the same as AA
    AH: "viseme_aa", // Assuming AH maps to the same as AA
    AO: "viseme_O",
    AW: "viseme_O", // Assuming AW maps to the same as AO
    AY: "viseme_aa", // Assuming AY maps to the same as AA
    B: "viseme_PP",
    CH: "viseme_CH",
    D: "viseme_DD",
    DH: "viseme_TH",
    EH: "viseme_E",
    ER: "viseme_RR",
    EY: "viseme_E", // Assuming EY maps to the same as EH
    F: "viseme_FF",
    G: "viseme_kk",
    HH: "viseme_sil", // Assuming HH is silent
    IH: "viseme_I",
    IY: "viseme_I", // Assuming IY maps to the same as IH
    JH: "viseme_CH", // Assuming JH maps to the same as CH
    K: "viseme_kk",
    L: "viseme_nn",
    M: "viseme_PP", // Assuming M maps to the same as B
    N: "viseme_nn",
    NG: "viseme_nn", // Assuming NG maps to the same as N
    OW: "viseme_O",
    OY: "viseme_O", // Assuming OY maps to the same as OW
    P: "viseme_PP",
    R: "viseme_RR",
    S: "viseme_SS",
    SH: "viseme_SS", // Assuming SH maps to the same as S
    T: "viseme_DD",
    TH: "viseme_TH",
    UH: "viseme_U",
    UW: "viseme_U", // Assuming UW maps to the same as UH
    V: "viseme_FF", // Assuming V maps to the same as F
    W: "viseme_U",  // Assuming W maps to the same as UH
    Y: "viseme_I",  // Assuming Y maps to the same as IH
    Z: "viseme_SS", // Assuming Z maps to the same as S
    ZH: "viseme_SS", // Assuming ZH maps to the same as SH
    SIL: "viseme_sil"
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
  
  