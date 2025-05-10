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
  const parts = normalizedText.split(/(\b\w+\b)/g);

  return parts.map(part => {
    if (!/^\w+$/.test(part)) return part;

    const rawMarker = part
      .slice(0, 3)
      .split('')
      .reduce((sum, char) => sum + (alphabet.indexOf(char.toLowerCase()) + 1), 0);
    const markerValue = ((rawMarker - 1) % 26) + 1;
    const markerChar = alphabet[markerValue - 1];

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
      encrypted += ch === ch.toUpperCase() ? newChar.toUpperCase() : newChar;
    }

    return markerChar + encrypted;
  }).join('');
}

export function decryptText(text, key, level, langId, userId = game.user.id) {
  try {
    if (!text) return text;
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const parts = text.split(/(\b\w+\b)/g);

    return parts.map(part => {
      if (!/^\w+$/.test(part)) return part;

      const firstChar = part[0].toLowerCase();
      if (!alphabet.includes(firstChar)) return part;
      const markerChar = firstChar;
      const markerValue = alphabet.indexOf(markerChar) + 1;
      if (part.length <= 1) return part;
      
      const encryptedWord = part.slice(1);

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
        decrypted += ch === ch.toUpperCase() ? origChar.toUpperCase() : origChar;
      }

      return decrypted;
    }).join('');

  } catch (err) {
    return `[ERREUR DE DÉCHIFFREMENT: ${err.message}]`;
  }

  function calculateWordScore(word, key, markerValue, userId) {
    const len = word.length;
    // Réduction des valeurs pour la taille des mots
    let lengthFactor = len <= 2 ? 0.05 : len <= 4 ? 0.15 : len <= 6 ? 0.3 : len <= 9 ? 0.5 : 0.7;

    let keySum = [...key].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const combined = word + keySum;
    const hash = [...combined].reduce((s, c, i) => (s + c.charCodeAt(0) * (i+1) * keySum) % 1000, 0) / 1000;

    let specialFactor = (markerValue % 5) * 0.04;
    
    let userFactor = 0.1; // valeur par défaut
    if (userId) {
      const userHash = [...userId].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      const wordHash = [...word].reduce((sum, c, i) => sum + c.charCodeAt(0) * (i+1), 0);
      const firstRealLetterValue = word.length > 0 ? word.charCodeAt(0) % 26 : 0;
      userFactor = ((userHash * wordHash + firstRealLetterValue) % 20) / 100;
    }
    const finalScore = lengthFactor * 0.35 + hash * 0.3 + Math.min(specialFactor, 0.2) * 0.2 + userFactor * 0.15;
    return Math.round(finalScore * 100) / 100;
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
