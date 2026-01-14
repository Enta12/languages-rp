import { MODULE_ID } from "../main.js";
import { decryptText, createLanguageFontStyles, calculateWordScore, decryptWordWithoutLevelCheck, findMostSimilarWord } from "./helper.js";

function selectJournalContent(app, html) {
  let root;
  if (html instanceof jQuery) {
    root = html[0];
  } else if (html instanceof HTMLElement) {
    root = html;
  } else if (app?.element) {
    root = app.element instanceof jQuery ? app.element[0] : app.element;
  }
  
  if (!root) return [];
  
  const selectors = [
    '.journal-sheet-content',
    '.journal-sheet-body',
    '.journal-page-content',
    '.content',
    '.window-content'
  ];
  const found = selectors.reduce((acc, sel) => {
    const nodes = Array.from(root.querySelectorAll(sel));
    return acc.concat(nodes);
  }, []);
  return found.length ? found : [root];
}

function getLangsLevels(
  isGM,
  userLanguages,
  levels,
  langId
) {
  if(isGM) return levels || []
  if(!userLanguages) return []
  if(!levels) return []
  return userLanguages.filter(l => l.id === langId).map(l => levels.find(level => level.id === l.level)).filter(l => l)
}

function getTitle(langName, isLangKnown) {
  if(isLangKnown) return game.i18n.format("languages-rp.messages.unknownLanguage", {name: langName});
  return game.i18n.localize("languages-rp.messages.languageNotStudied");
}

function canDecryptWord(langId, isGM, userLanguages, levels) {
  if (isGM) return true;
  if (!userLanguages || !levels) return false;
  const userLang = userLanguages.find(l => l.id === langId);
  if (!userLang) return false;
  const level = levels.find(l => l.id === userLang.level);
  return !!level;
}

function getBestDecryptionLevel(langId, isGM, userLanguages, levels) {
  if (isGM)  return levels.sort((a, b) => b.value - a.value)[0];


  if (!userLanguages || !levels) return null;
  const userLang = userLanguages.find(l => l.id === langId);
  if (!userLang) return null;
  return levels.find(l => l.id === userLang.level) || null;
}

function normalizeText(text) {
  if (!text) return '';
  return text.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function canDecryptWordWithLevel(word, langKey, level, langId, knownWords = []) {
  if (!word) return false;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const firstChar = word[0].toLowerCase();
  if (!alphabet.includes(firstChar) || word.length <= 1) return false;
  
  const markerChar = firstChar;
  const markerValue = alphabet.indexOf(markerChar) + 1;
  const encryptedWord = word.slice(1);
  

  if (knownWords.length > 0) {
    const markerIsUpperCase = /[A-Z]/.test(word[0]);
    const decryptedForKnown = decryptWordWithoutLevelCheck(encryptedWord, langKey, markerValue, markerIsUpperCase);
    const normalizedDecrypted = normalizeText(decryptedForKnown).toLowerCase();
    const normalizedKnownWords = knownWords.map(w => normalizeText(w).toLowerCase());
    if (normalizedKnownWords.includes(normalizedDecrypted)) {
      return true;
    }
    if (normalizedDecrypted.length >= 4) {
      const similarMatch = findMostSimilarWord(decryptedForKnown, knownWords, 60);
      if (similarMatch) {
        return true;
      }
    }
  }
  
  if (!level) return false;
  const score = calculateWordScore(encryptedWord, langKey, markerValue);
  
  return score <= level.value;
}

function setupWordHover(element, langId, languages, levels, isGM, userLanguages, knownWords = []) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const langKey = languages[langId]?.key || "abcdefghijklmnopqrstuvwxyz";
  const canDecrypt = canDecryptWord(langId, isGM, userLanguages, levels);
  
  if (!canDecrypt && knownWords.length === 0) return;
  
  const level = getBestDecryptionLevel(langId, isGM, userLanguages, levels);
  if (!level && knownWords.length === 0) return;
  
  const contentElements = element.querySelectorAll(`.language-rp-font-${langId}`);
  
  contentElements.forEach(contentEl => {
    if (contentEl.classList.contains('encrypted-word-processed')) {
      return;
    }
    
    contentEl.classList.add('encrypted-word-processed');
    
    const walker = document.createTreeWalker(
      contentEl,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const wordPattern = /\b([a-zA-Z]+)\b/g;
      const words = [...text.matchAll(wordPattern)];
      
      if (words.length === 0) return;
      
      const fragments = [];
      let lastIndex = 0;
      
      words.forEach(match => {
        const word = match[0];
        const matchIndex = match.index;
        const firstChar = word[0].toLowerCase();
        
        if (alphabet.includes(firstChar) && word.length > 1) {
            if (canDecryptWordWithLevel(word, langKey, level, langId, knownWords)) {
            if (matchIndex > lastIndex) {
              fragments.push(document.createTextNode(text.substring(lastIndex, matchIndex)));
            }
            
            const span = document.createElement('span');
            span.className = 'encrypted-word-hover';
            span.dataset.word = word;
            span.dataset.langId = langId;
            span.textContent = word;
            span.style.cursor = 'help';
            fragments.push(span);
            
            lastIndex = matchIndex + word.length;
          }
        }
      });
      
      if (lastIndex < text.length) {
        fragments.push(document.createTextNode(text.substring(lastIndex)));
      }
      
      if (fragments.length > 0) {
        const parent = textNode.parentNode;
        fragments.forEach(fragment => {
          parent.insertBefore(fragment, textNode);
        });
        parent.removeChild(textNode);
      }
    });
  });
  
  element.querySelectorAll('.encrypted-word-hover').forEach(span => {
    if (span.dataset.hoverSetup === 'true') return;
    span.dataset.hoverSetup = 'true';
    
    let tooltip = null;
    
    span.addEventListener('mouseenter', async (event) => {
      const word = event.target.dataset.word;
      const wordLangId = event.target.dataset.langId;
      
      if (!word || !wordLangId) return;
      
      const currentLanguages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
      const currentIsGM = game.user.isGM;
      const currentUserActor = game.user.character;
      const currentUserLanguages = currentUserActor?.flags?.['languages-rp']?.languages;
      const currentKnownWords = currentUserActor?.flags?.['languages-rp']?.knownWords?.[wordLangId] || [];
      const currentLevels = Object.entries(game.settings.get(MODULE_ID, 'proficiencyLevels')).map(([id, level]) => ({
        id,
        ...level,
      }));
      const currentLangKey = currentLanguages[wordLangId]?.key || "abcdefghijklmnopqrstuvwxyz";
      
      const level = getBestDecryptionLevel(wordLangId, currentIsGM, currentUserLanguages, currentLevels);
      if (!level && currentKnownWords.length === 0) return;
      

      if (!canDecryptWordWithLevel(word, currentLangKey, level, wordLangId, currentKnownWords)) {
        return;
      }
      
      const decryptedWord = decryptText(word, currentLangKey, level || { value: 1.0 }, wordLangId, game.user.id, currentKnownWords);
      
      if (decryptedWord.includes('none-translated')) {
        return;
      }
      

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = decryptedWord;
      const cleanDecrypted = tempDiv.textContent || tempDiv.innerText || '';
      const similarSpan = tempDiv.querySelector('.similar-word');
      
      tooltip = document.createElement('div');
      tooltip.className = 'language-hover-tooltip';
      
      if (similarSpan) {
        const similarity = similarSpan.dataset.similarity;
        const knownWord = similarSpan.dataset.knownWord;
        tooltip.innerHTML = `<div><strong>${knownWord}</strong></div><div style="font-size: 10px; margin-top: 4px; opacity: 0.8;">${similarity}% de ressemblance</div>`;
      } else {
        tooltip.textContent = cleanDecrypted;
      }
      tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        max-width: 300px;
        word-wrap: break-word;
        white-space: normal;
      `;
      
      document.body.appendChild(tooltip);
      
      updateTooltipPosition(event, tooltip);
    });
    
    span.addEventListener('mouseleave', () => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
        tooltip = null;
      }
    });
    
    span.addEventListener('mousemove', (event) => {
      if (tooltip) {
        updateTooltipPosition(event, tooltip);
      }
    });
  });
}

function updateTooltipPosition(event, tooltip) {
  const rect = event.target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  let top = rect.top - tooltipRect.height - 8;
  
  if (left < 8) {
    left = 8;
  }
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8;
  }
  if (top < 8) {
    top = rect.bottom + 8;
  }
  if (top + tooltipRect.height > window.innerHeight - 8) {
    top = rect.top - tooltipRect.height - 8;
  }
  
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

async function replaceLanguagePatterns(element) {
  if (element.closest('.ProseMirror') || element.classList.contains('ProseMirror')) return;
  const languages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
  const levels = Object.entries(game.settings.get(MODULE_ID, 'proficiencyLevels')).map(([id, level]) => ({
    id,
    ...level,
  }));
  const isGM = game.user.isGM;
  const userActor = game.user.character;
  const userLanguages = userActor?.flags?.['languages-rp']?.languages;
  const userKnownWords = userActor?.flags?.['languages-rp']?.knownWords || {};

  const pattern = /\[\[language=([^\|]+)\|([^\]]+)\]\]/g;
  const originalHTML = element.innerHTML;
  const matches = [...originalHTML.matchAll(pattern)];
  if (matches.length === 0) return;
  let newHTML = originalHTML;
  for (const match of matches) {
    const [fullMatch, langId, content] = match;
    const langLevels = getLangsLevels(isGM, userLanguages, levels, langId);
    const knownWordsForLang = userKnownWords[langId] || [];
    const langKey = languages[langId]?.key || "abcdefghijklmnopqrstuvwxyz";
    
    let displayContent = content;
    let shouldShowFont = true;
    
    const hasKnownWordsOnly = knownWordsForLang.length > 0 && !langLevels.length;
    
    const template = await renderTemplate(`modules/languages-rp/templates/language-display.html`, {
      langId,
      title: getTitle(languages[langId]?.name, !!langLevels.length || knownWordsForLang.length > 0),
      encryptedContent: content,
      displayContent: displayContent,
      showFont: shouldShowFont,
      levels: langLevels,
      addEncryptBtn: !!langLevels.length || knownWordsForLang.length > 0,
      hasKnownWordsOnly: hasKnownWordsOnly
    });
    newHTML = newHTML.replace(fullMatch, template);
  }
  
  if (newHTML !== originalHTML) {
    element.innerHTML = newHTML;
    
    element.querySelectorAll('.language-container').forEach(container => {
      const langId = container.dataset.langId;
      const knownWordsForLang = userKnownWords[langId] || [];
      setupWordHover(container, langId, languages, levels, isGM, userLanguages, knownWordsForLang);
    });
    
    element.querySelectorAll('.language-level-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        const level = event.target.dataset.level;
        const langId = event.target.closest('.language-container').dataset.langId;
        const contentElement = event.target.closest('.language-container').querySelector('.language-content');
        const titleElement = event.target.closest('.language-container').querySelector('.language-translation-header');
        const encryptedContent = contentElement.dataset.encrypted;
        const langKey = languages[langId]?.key || "abcdefghijklmnopqrstuvwxyz";
        const currentLevel = levels.find(l => l.id === level);
        const knownWordsForLang = userKnownWords[langId] || [];
        const decryptedText = decryptText(encryptedContent, langKey, currentLevel, langId, game.user.id, knownWordsForLang);
        contentElement.innerHTML = decryptedText;
        event.target.closest('.language-container').style.backgroundColor = `${currentLevel.color}33`;
        contentElement.classList.remove(`language-rp-font-${langId}`);
        
        setupWordHover(event.target.closest('.language-container'), langId, languages, levels, isGM, userLanguages, knownWordsForLang);
        
        const langName = languages[langId]?.name || langId;
        titleElement.innerHTML = game.i18n.format("languages-rp.messages.translatedAs", {name: langName, level: currentLevel.name});
        titleElement.style.backgroundColor = currentLevel.color;
      });
    });

    element.querySelectorAll('.known-words-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        const langId = event.target.closest('.language-container').dataset.langId;
        const contentElement = event.target.closest('.language-container').querySelector('.language-content');
        const titleElement = event.target.closest('.language-container').querySelector('.language-translation-header');
        const encryptedContent = contentElement.dataset.encrypted;
        const langKey = languages[langId]?.key || "abcdefghijklmnopqrstuvwxyz";
        const knownWordsForLang = userKnownWords[langId] || [];
        

        const fakeLevel = { value: 1.0 };
        const decryptedText = decryptText(encryptedContent, langKey, fakeLevel, langId, game.user.id, knownWordsForLang, true);
        contentElement.innerHTML = decryptedText;
        event.target.closest('.language-container').style.backgroundColor = '#4a90e233';
        contentElement.classList.remove(`language-rp-font-${langId}`);
        contentElement.classList.remove('encrypted-word-processed');
        
        setupWordHover(event.target.closest('.language-container'), langId, languages, levels, isGM, userLanguages, knownWordsForLang);
        
        const langName = languages[langId]?.name || langId;
        titleElement.innerHTML = game.i18n.format("languages-rp.messages.translatedAs", {name: langName, level: game.i18n.localize("languages-rp.ui.knownWords")});
        titleElement.style.backgroundColor = '#4a90e2';
      });
    });

    element.querySelectorAll('.encrypt-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        const langId = event.target.closest('.language-container').dataset.langId;
        const contentElement = event.target.closest('.language-container').querySelector('.language-content');
        const titleElement = event.target.closest('.language-container').querySelector('.language-translation-header');
        const encryptedContent = contentElement.dataset.encrypted;
        contentElement.innerHTML = encryptedContent;
        event.target.closest('.language-container').style.backgroundColor = '';
        contentElement.classList.add(`language-rp-font-${langId}`);
        contentElement.classList.remove('encrypted-word-processed');
        
        const knownWordsForLang = userKnownWords[langId] || [];
        setupWordHover(event.target.closest('.language-container'), langId, languages, levels, isGM, userLanguages, knownWordsForLang);
        
        const langName = languages[langId]?.name || langId;
        titleElement.innerHTML = getTitle(langName, true);
        titleElement.style.backgroundColor = '';
      });
    });
  }
}

async function processJournalContent(app, html) {
  const root = html instanceof jQuery ? html[0] : html;
  
  if (app?.options?.proseMirror || 
      root.querySelector('.ProseMirror') || 
      root.querySelector('.editor-content') ||
      root.querySelector('.editor')) {
    return;
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (root.querySelector('.ProseMirror')) return;
  
  const elements = selectJournalContent(app, html);
  for (let el of elements) {
    if (!el.closest('.ProseMirror') && !el.querySelector('.ProseMirror')) {
      await replaceLanguagePatterns(el);
    }
  }
}



console.log("[Languages-RP] ce fichier est chargé");
Hooks.once('init', () => {
  createLanguageFontStyles();
});

Hooks.on('renderApplicationV2', async (app, html) => {
  if  (app.constructor.name === "JournalEntrySheet") {
    await processJournalContent(app, html);
  }
});
