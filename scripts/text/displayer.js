import { MODULE_ID } from "../main.js";
import { encryptText, decryptText, createLanguageFontStyles } from "./helper.js";

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

  const pattern = /\[\[language=([^\|]+)\|([^\]]+)\]\]/g;
  const originalHTML = element.innerHTML;
  const matches = [...originalHTML.matchAll(pattern)];
  if (matches.length === 0) return;
  let newHTML = originalHTML;
  for (const match of matches) {
    const [fullMatch, langId, content] = match;
    const langLevels = getLangsLevels(isGM, userLanguages, levels, langId);
    const template = await renderTemplate(`modules/languages-rp/templates/language-display.html`, {
      langId,
      title: getTitle(languages[langId]?.name, !!langLevels.length),
      content,
      levels: langLevels,
      addEncryptBtn: !!langLevels.length
    });
    newHTML = newHTML.replace(fullMatch, template);
  }
  
  if (newHTML !== originalHTML) {
    element.innerHTML = newHTML;
    element.querySelectorAll('.language-level-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        const level = event.target.dataset.level;
        const langId = event.target.closest('.language-container').dataset.langId;
        const contentElement = event.target.closest('.language-container').querySelector('.language-content');
        const titleElement = event.target.closest('.language-container').querySelector('.language-translation-header');
        const encryptedContent = contentElement.dataset.encrypted;
        const langKey = languages[langId]?.key || "abcdefghijklmnopqrstuvwxyz";
        const currentLevel = levels.find(l => l.id === level);
        const decryptedText = decryptText(encryptedContent, langKey, currentLevel, langId);
        contentElement.innerHTML = decryptedText;
        event.target.closest('.language-container').style.backgroundColor = `${currentLevel.color}33`;
        contentElement.classList.remove(`language-rp-font-${langId}`);
        
        const langName = languages[langId]?.name || langId;
        titleElement.innerHTML = game.i18n.format("languages-rp.messages.translatedAs", {name: langName, level: currentLevel.name});
        titleElement.style.backgroundColor = currentLevel.color;
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
