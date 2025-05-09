import { MODULE_ID } from "../main.js";

//TODO: Customize what we should keep
//TODO: Accept accents
function normalizeText(text) {
  if (!text) return '';
  return text.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function encryptText(text, key) {
  if (!text) return;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  const normalizedText = normalizeText(text);
  let parts = normalizedText.split(/(\b\w+\b)/g);
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

export function decryptText(text, key, level, langId) {
  try {
    if (!text) return text;
    console.log("text", text, key, level)
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
        const shouldDecrypt = difficultyScore <= level.value;
        if (shouldDecrypt) {
          wordsDecrypted++;
          return decryptWord(part, initialShift);
        }
        return `<span class="none-translated language-rp-font-${langId}">${part}</span>`;
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

export function createLanguageFontStyles() {
  const languages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
  let styleContent = '';
  
  Object.entries(languages).forEach(([langId, langData]) => {
    if (typeof langData === 'object' && langData.font) {
      const fontName = langData.font.split('/').pop().split('.')[0];
      const fontPath = langData.font;
      
      styleContent += `
        @font-face {
          font-family: "${fontName}";
          src: url("${fontPath}");
        }
        .language-rp-font-${langId} {
          font-family: "${fontName}", sans-serif !important;
        }
      `;
      
      try {
        const fontFace = new FontFace(fontName, `url("${fontPath}")`);
        fontFace.load().then(loadedFont => {
          document.fonts.add(loadedFont);
        }).catch(err => {
          console.error(`[LANGUAGES RP] Error loading font ${fontPath}:`, err);
        });
      } catch (err) {
        console.error(`[LANGUAGES RP] Error creating font ${fontPath}:`, err);
      }
    }
  });
  
  if (styleContent) {
    const styleElement = document.createElement('style');
    styleElement.id = 'language-rp-font-styles';
    styleElement.textContent = styleContent;
    document.head.appendChild(styleElement);
  }
}