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

function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // suppression
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

export function calculateSimilarity(word1, word2) {
  const normalized1 = normalizeText(word1).toLowerCase();
  const normalized2 = normalizeText(word2).toLowerCase();
  
  if (normalized1 === normalized2) return 100;
  
  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 100;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  
  return Math.round(similarity);
}

export function findMostSimilarWord(word, knownWords, minSimilarity = 60) {
  if (!word || !knownWords || knownWords.length === 0) return null;
  
  const normalizedWord = normalizeText(word).toLowerCase();
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const knownWord of knownWords) {
    const similarity = calculateSimilarity(normalizedWord, knownWord);
    if (similarity >= minSimilarity && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = knownWord;
    }
  }
  
  return bestMatch ? { word: bestMatch, similarity: bestSimilarity } : null;
}

export function encryptText(text, key) {
  if (!text) return;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";

  const normalizedText = normalizeText(text);
  const parts = normalizedText.split(/(\b\w+\b)/g);

  return parts.map(part => {
    if (!/^\w+$/.test(part)) return part;

    const firstChar = part[0];
    const startsWithUpperCase = /[A-Z]/.test(firstChar);

    const rawMarker = part
      .slice(0, 3)
      .split('')
      .reduce((sum, char) => sum + (alphabet.indexOf(char.toLowerCase()) + 1), 0);
    const markerValue = ((rawMarker - 1) % 26) + 1;
    let markerChar = alphabet[markerValue - 1];
    if (startsWithUpperCase) {
      markerChar = markerChar.toUpperCase();
    }

    let encrypted = '';
    for (let i = 0; i < part.length; i++) {
      const ch = part[i];
      if (!/[a-zA-Z]/.test(ch)) {
        encrypted += ch;
        continue;
      }
      const keyIdx = (markerValue + i) % key.length;
      const keyChar = key[keyIdx].toLowerCase();
      const keyPos = alphabet.indexOf(keyChar) + 1;
      const idx = alphabet.indexOf(ch.toLowerCase());
      const shift = (keyPos + markerValue) % 26;
      const newIdx = (idx + shift) % 26;
      const newChar = alphabet[newIdx];
      // Si c'est la première lettre et que le mot original commençait par une majuscule,
      // mettre cette lettre en minuscule (la majuscule sera sur le marqueur)
      if (i === 0 && startsWithUpperCase) {
        encrypted += newChar.toLowerCase();
      } else {
        encrypted += ch === ch.toUpperCase() ? newChar.toUpperCase() : newChar;
      }
    }

    return markerChar + encrypted;
  }).join('');
}

export function calculateWordScore(word, key, markerValue, userId) {
  const len = word.length;
  let lengthFactor = len <= 2 ? 0.05 : len <= 4 ? 0.15 : len <= 6 ? 0.3 : len <= 9 ? 0.5 : 0.7;

  let keySum = [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const combined = word + keySum;
  const hash = [...combined].reduce((s, c, i) => (s + c.charCodeAt(0) * (i+1) * keySum) % 1000, 0) / 1000;

  let specialFactor = (markerValue % 5) * 0.04;
  
  let userFactor = 0.1;
  if (userId) {
    const userHash = [...userId].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const wordHash = [...word].reduce((sum, c, i) => sum + c.charCodeAt(0) * (i+1), 0);
    const firstRealLetterValue = word.length > 0 ? word.charCodeAt(0) % 26 : 0;
    userFactor = ((userHash * wordHash + firstRealLetterValue) % 20) / 100;
  }
  const finalScore = lengthFactor * 0.35 + hash * 0.3 + Math.min(specialFactor, 0.2) * 0.2 + userFactor * 0.15;
  return Math.round(finalScore * 100) / 100;
}

export function decryptWordWithoutLevelCheck(encryptedWord, key, markerValue, markerIsUpperCase = false) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let decrypted = '';
  for (let i = 0; i < encryptedWord.length; i++) {
    const ch = encryptedWord[i];
    if (!/[a-zA-Z]/.test(ch)) {
      decrypted += ch;
      continue;
    }
    const keyIdx = (markerValue + i) % key.length;
    const keyChar = key[keyIdx].toLowerCase();
    const keyPos = alphabet.indexOf(keyChar) + 1;

    const idx = alphabet.indexOf(ch.toLowerCase());
    const shift = (keyPos + markerValue) % 26;
    const origIdx = (idx - shift + 26) % 26;
    const origChar = alphabet[origIdx];
    if (i === 0 && markerIsUpperCase) {
      decrypted += origChar.toUpperCase();
    } else {
      decrypted += ch === ch.toUpperCase() ? origChar.toUpperCase() : origChar;
    }
  }
  return decrypted;
}

export function decryptText(text, key, level, langId, userId = game.user.id, knownWords = [], onlyKnownWords = false) {
  try {
    if (!text) return text;
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const parts = text.split(/(\b\w+\b)/g);
    
    const normalizedKnownWords = knownWords.map(word => normalizeText(word).toLowerCase());

    return parts.map(part => {
      if (!/^\w+$/.test(part)) return part;

      const firstChar = part[0];
      if (!alphabet.includes(firstChar.toLowerCase())) return part;
      
      const markerIsUpperCase = /[A-Z]/.test(firstChar);
      const markerChar = firstChar.toLowerCase();
      const markerValue = alphabet.indexOf(markerChar) + 1;
      if (part.length <= 1) return part;
      
      const encryptedWord = part.slice(1);

      if (knownWords.length > 0) {
        const decryptedForKnown = decryptWordWithoutLevelCheck(encryptedWord, key, markerValue, markerIsUpperCase);
        const normalizedDecrypted = normalizeText(decryptedForKnown).toLowerCase();
        if (normalizedKnownWords.includes(normalizedDecrypted)) {
          return decryptedForKnown;
        }
        
        if (normalizedDecrypted.length >= 4) {
          const similarMatch = findMostSimilarWord(decryptedForKnown, knownWords, 60);
          if (similarMatch) {

            let displayWord = similarMatch.word;
            if (markerIsUpperCase || /[A-Z]/.test(decryptedForKnown[0])) {
              displayWord = displayWord.charAt(0).toUpperCase() + displayWord.slice(1);
            }
            return `<span class="similar-word" data-similarity="${similarMatch.similarity}" data-original-word="${decryptedForKnown}" data-known-word="${similarMatch.word}" title="${similarMatch.similarity}% de ressemblance" style="color: #ff4444; text-decoration: underline; text-decoration-style: wavy; cursor: help;">${displayWord}</span>`;
          }
        }
        
        if (onlyKnownWords) {
          return `<span class="none-translated language-rp-font-${langId}">${part}</span>`;
        }
      }

      const score = calculateWordScore(encryptedWord, key, markerValue, userId);
      if (score > level.value) {
        return `<span class="none-translated language-rp-font-${langId}">${part}</span>`;
      }

      let decrypted = '';
      for (let i = 0; i < encryptedWord.length; i++) {
        const ch = encryptedWord[i];
        if (!/[a-zA-Z]/.test(ch)) {
          decrypted += ch;
          continue;
        }
        const keyIdx = (markerValue + i) % key.length;
        const keyChar = key[keyIdx].toLowerCase();
        const keyPos = alphabet.indexOf(keyChar) + 1;

        const idx = alphabet.indexOf(ch.toLowerCase());
        const shift = (keyPos + markerValue) % 26;
        const origIdx = (idx - shift + 26) % 26;
        const origChar = alphabet[origIdx];
        if (i === 0 && markerIsUpperCase) {
          decrypted += origChar.toUpperCase();
        } else {
          decrypted += ch === ch.toUpperCase() ? origChar.toUpperCase() : origChar;
        }
      }

      if (knownWords.length > 0 && normalizeText(decrypted).length >= 4) {
        const similarMatch = findMostSimilarWord(decrypted, knownWords, 60);
        if (similarMatch) {
          let displayWord = similarMatch.word;
          if (markerIsUpperCase || /[A-Z]/.test(decrypted[0])) {
            displayWord = displayWord.charAt(0).toUpperCase() + displayWord.slice(1);
          }
          return `<span class="similar-word" data-similarity="${similarMatch.similarity}" data-original-word="${decrypted}" data-known-word="${similarMatch.word}" title="${similarMatch.similarity}% de ressemblance" style="color: #ff4444; text-decoration: underline; text-decoration-style: wavy; cursor: help;">${displayWord}</span>`;
        }
      }

      return decrypted;
    }).join('');

  } catch (err) {
    return `[ERREUR DE DÉCHIFFREMENT: ${err.message}]`;
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
        fontFace.load().then(loadedFont => document.fonts.add(loadedFont));
      } catch (err) {
        console.error(`[LANGUAGES RP] Error loading font ${fontPath}:`, err);
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
