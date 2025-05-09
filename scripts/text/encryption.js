import { MODULE_ID } from "../main.js";

const LANGUAGE_FONT = {
  getFontName: (language) => {
    const languagesData =
      game.settings.get(MODULE_ID, "availableLanguages") || {};
    const langData = languagesData[language];
    if (langData && langData.font) {
      return langData.font.split("/").pop().split(".")[0];
    }
    return null;
  },
};

function normalizeAccents(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function encryptText(text, language) {
  if (!text) return text;
  text = normalizeAccents(text);
  const languagesData =
    game.settings.get(MODULE_ID, "availableLanguages") || {};
  const langData = languagesData[language] || "abcdefghijklmnopqrstuvwxyz"; // Données par défaut
  const key = typeof langData === "object" ? langData.key : langData;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  let parts = text.split(/(\b\w+\b)/g);
  return parts
    .map((part) => {
      if (!part.match(/^\w+$/)) return part;
      const wordLength = part.length;
      const keyIndex = (wordLength - 1) % key.length;
      const keyChar = key[keyIndex].toLowerCase();
      const alphabetIndex = alphabet.indexOf(keyChar);
      const initialShift = alphabetIndex !== -1 ? alphabetIndex + 1 : 1;
      let encryptedWord = "";
      for (let i = 0; i < part.length; i++) {
        const char = part[i];
        if (!/[a-zA-Z]/.test(char)) {
          encryptedWord += char;
          continue;
        }
        const isUpperCase = char === char.toUpperCase();
        const lowerChar = char.toLowerCase();
        const index = alphabet.indexOf(lowerChar);
        if (index === -1) {
          encryptedWord += char;
          continue;
        }
        const shift = (initialShift + i) % 26;
        const newIndex = (index + shift) % 26;
        const newChar = alphabet[newIndex];
        encryptedWord += isUpperCase ? newChar.toUpperCase() : newChar;
      }
      return encryptedWord;
    })
    .join("");
}

export function decryptText(text, language, proficiencyLevel = "natif") {
  try {
    if (!text) return text;
    const languagesData =
      game.settings.get(MODULE_ID, "availableLanguages") || {};
    const langData = languagesData[language] || "abcdefghijklmnopqrstuvwxyz"; // Données par défaut
    const key = typeof langData === "object" ? langData.key : langData;
    const proficiencyConfig = game.settings.get(
      MODULE_ID,
      "proficiencyLevels"
    ) || {
      débutant: { value: 0.3, color: "#d9c060" },
      moyen: { value: 0.6, color: "#bcc060" },
      fort: { value: 0.8, color: "#9cc060" },
      avancé: { value: 0.9, color: "#7cc060" },
      natif: { value: 1.0, color: "#60c070" },
    };
    const threshold =
      typeof proficiencyConfig[proficiencyLevel] === "object"
        ? proficiencyConfig[proficiencyLevel]?.value || 0.3
        : proficiencyConfig[proficiencyLevel] || 0.3;
    let parts = text.split(/(\b\w+\b)/g);
    let wordsDecrypted = 0;
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let result = parts
      .map((part) => {
        if (!part.match(/^\w+$/)) return part;
        const wordLength = part.length;
        const keyIndex = (wordLength - 1) % key.length;
        const keyChar = key[keyIndex].toLowerCase();
        const alphabetIndex = alphabet.indexOf(keyChar);
        const initialShift = alphabetIndex !== -1 ? alphabetIndex + 1 : 1;
        const difficultyScore = calculateWordScore(part, key);
        const shouldDecrypt = difficultyScore <= threshold;
        if (shouldDecrypt) {
          wordsDecrypted++;
          return decryptWord(part, initialShift);
        }
        return `<span class="language-text" style="font-family: ${
          LANGUAGE_FONT.getFontName(language) || "inherit"
        }">${part}</span>`;
      })
      .join("");
    return result;

    function calculateWordScore(word, key) {
      if (!word || word.length === 0) return 0;
      const len = word.length;
      let lengthFactor;
      if (len <= 2) {
        lengthFactor = 0.1;
      } else if (len <= 4) {
        lengthFactor = 0.3;
      } else if (len <= 6) {
        lengthFactor = 0.5;
      } else if (len <= 9) {
        lengthFactor = 0.7;
      } else {
        lengthFactor = 0.9;
      }
      let keySum = 0;
      for (let i = 0; i < key.length; i++) {
        keySum += key.charCodeAt(i);
      }
      const combinedString = word + keySum.toString();
      const hash =
        [...combinedString].reduce(
          (sum, char, i) =>
            (sum + char.charCodeAt(0) * (i + 1) * keySum) % 1000,
          0
        ) / 1000;
      const hardLetters = key.substring(0, 5);
      let specialLettersFactor = 0;
      for (const letter of hardLetters) {
        if (word.toLowerCase().includes(letter)) {
          specialLettersFactor += 0.05;
        }
      }
      specialLettersFactor = Math.min(specialLettersFactor, 0.2);
      const finalScore =
        lengthFactor * 0.5 + hash * 0.3 + specialLettersFactor * 0.2;
      return Math.round(finalScore * 100) / 100;
    }

    function decryptWord(word, initialShift) {
      let decryptedWord = "";
      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (!/[a-zA-Z]/.test(char)) {
          decryptedWord += char;
          continue;
        }
        const isUpperCase = char === char.toUpperCase();
        const lowerChar = char.toLowerCase();
        const index = alphabet.indexOf(lowerChar);
        if (index === -1) {
          decryptedWord += char;
          continue;
        }
        const shift = (initialShift + i) % 26;
        const newIndex = (index - shift + 26) % 26;
        const newChar = alphabet[newIndex];
        decryptedWord += isUpperCase ? newChar.toUpperCase() : newChar;
      }
      return decryptedWord;
    }
  } catch (error) {
    return `[ERREUR DE DÉCHIFFREMENT: ${error.message}] ${text?.substring(
      0,
      30
    )}...`;
  }
}
