function mapStringToVisemes(input) {
    // Define the mapping from characters to visemes
    const visemeMap = {
      a: "viseme_aa",
      b: "viseme_PP",
      c: "viseme_SS",
      d: "viseme_DD",
      e: "viseme_E",
      f: "viseme_FF",
      g: "viseme_kk",
      h: "viseme_sil",
      i: "viseme_I",
      j: "viseme_CH",
      k: "viseme_kk",
      l: "viseme_nn",
      m: "viseme_PP",
      n: "viseme_nn",
      o: "viseme_O",
      p: "viseme_PP",
      q: "viseme_kk", // Assuming Q maps to G/K
      r: "viseme_RR",
      s: "viseme_SS",
      t: "viseme_DD",
      u: "viseme_U",
      v: "viseme_FF",
      w: "viseme_U",
      x: "viseme_kk", // Assuming X maps to K
      y: "viseme_I",
      z: "viseme_SS",
      " ": "viseme_sil", // Silence for space
    };
  
    const result = [];
    let time = 0;
  
    for (const char of input.toLowerCase()) {
      const value = visemeMap[char] || "viseme_sil"; // Default to silence if no mapping
      result.push({ value, time });
      time += 50; // Increment time by 500 ms for each character
    }
  
    return result;
  }