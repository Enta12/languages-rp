import { decryptText } from "./encryption.js";

Hooks.once('ready', () => {
  if (typeof decryptText === 'function' && typeof decryptText !== 'function') {
    decryptText = decryptText;
  } else if (typeof decryptText === 'function') {
  } else {
    decryptText = function(text, language, level) {
      return `[${language} - ${level}] ${text}`;
    };
  }
  
  const newStyle = document.createElement('style');
  newStyle.id = 'language-blocks-style';
  newStyle.textContent = `
    .language-block {
      margin: 15px 0;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
      background-color: rgba(245, 245, 245, 0.5);
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .language-header-row {
      width: 100%;
      padding: 5px 10px;
      font-weight: bold;
      color: white;
      font-size: 0.9em;
      text-transform: uppercase;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      grid-row: 1;
    }
    .language-content-row {
      padding: 10px;
      background-color: rgba(255, 255, 255, 0.7);
      grid-row: 2;
      cursor: pointer;
    }
    .language-content-row.decrypted {
      background-color: rgba(220, 240, 220, 0.7);
    }
    .language-click-hint {
      font-size: 0.8em;
      color: #666;
      margin-top: 5px;
      text-align: right;
      font-style: italic;
    }
    .language-tooltip {
      display: none !important;
    }
  `;
  document.head.appendChild(newStyle);
  
  $('.window-content').each(function() {
    addLanguageHeaders($(this));
  });
});

Hooks.on('renderJournalSheet', (app, html, data) => {
  setTimeout(() => addLanguageHeaders(html), 100);
});
Hooks.on('renderJournalPageSheet', (app, html, data) => {
  setTimeout(() => addLanguageHeaders(html), 100);
});
Hooks.on('renderTextPageSheet', (app, html, data) => {
  setTimeout(() => addLanguageHeaders(html), 100);
});
Hooks.on('renderItemSheet', (app, html, data) => {
  setTimeout(() => addLanguageHeaders(html), 100);
});
Hooks.on('renderActorSheet', (app, html, data) => {
  setTimeout(() => addLanguageHeaders(html), 100);
});
Hooks.on('renderChatMessage', (message, html, data) => {
  setTimeout(() => addLanguageHeaders(html), 100);
});

Hooks.on('renderApplication', (app, html, data) => {
  setTimeout(() => {
    const languageElements = html.find('.language-text');
    if (languageElements.length > 0) {
      addLanguageHeaders(html);
    }
  }, 100);
});

const MODULE_ID = "languages-rp-fork";

function getLanguagesFromActorData(actor) {
  const actorLangs = {};
  if (actor && actor.flags && actor.flags[MODULE_ID] && Array.isArray(actor.flags[MODULE_ID].languages)) {
    actor.flags[MODULE_ID].languages.forEach(lang => {
      if (lang && typeof lang.name === 'string' && typeof lang.level === 'string') {
        const langNameLower = lang.name.toLowerCase();
        const langLevelLower = lang.level.toLowerCase();
        actorLangs[langNameLower] = {
          level: langLevelLower
        };
      }
    });
  }
  return actorLangs;
}


/**
 * Fonction principale pour transformer les éléments de langue en blocs avec en-têtes
 * @param {jQuery} html - Le contenu HTML à traiter
 */
function addLanguageHeaders(html) {
  const actor = game.user.character;
  const actorLangs = getLanguagesFromActorData(actor);
  const isGM = game.user.isGM;
  html.find('.language-tooltip').remove();
  const langElements = html.find('.language-text').filter(function() {
    return !$(this).data('language-header-processed');
  });
  langElements.each(function() {
    const element = $(this);
    const language = element.data('language');
    const level = actorLangs[language]?.level;
    element.data('language-header-processed', true);
    let proficiencyLevel = "Aucun";
    let headerColor = "#777777";
    let isKnown = false;
    if (isGM) {
      isKnown = true;
      proficiencyLevel = "Encrypté";
    }
    const getFontForLanguage = (language) => {
      const languagesData = game.settings.get(MODULE_ID, 'availableLanguages') || {};
      const langData = languagesData[language];
      if (typeof langData === 'object' && langData.font) {
        const fontName = langData.font.split('/').pop().split('.')[0];
        const fontPath = langData.font;
        const fontFace = new FontFace(fontName, `url("${fontPath}")`);
        fontFace.load().then(font => {
          document.fonts.add(font);
        }).catch(err => {
          console.error('[LANGUAGES RP] Error loading font', err);
        });
        return fontName;
      }
      return null;
    }
    const font = getFontForLanguage(language);
    function getTitle(language, level) {
      if(!language) return 'Unknown language';
      if(isGM || level) return `${language} - ${level || 'Non-Traduit'}`;
      return 'Langue inconnue';
    }
    const languageBlock = $(`
      <div class="language-block">
        <div class="language-header-row" style="background-color: ${headerColor};">${getTitle(language, level)}</div>
        <div class="language-content-row lang-${language.toLowerCase().replace(/\s+/g, '-')}" ${font ? `style="font-family: '${font}', sans-serif;"` : ''}>${element.text()}</div>
      </div>
    `);
    const originalText = element.text();
    const contentRow = languageBlock.find('.language-content-row');
    contentRow.data('original-text', originalText);
    contentRow.data('language', language);
    contentRow.data('proficiency', proficiencyLevel);
    if (isGM || level) {
      let proficiencyLevelColors = {};
      let proficiencyOptions = ['Encrypté'];
      try {
        const proficiencyLevels = game.settings.get(MODULE_ID, 'proficiencyLevels') || {};
        const sortedLevels = Object.entries(proficiencyLevels)
          .sort(([, a], [, b]) => a.value - b.value)
          .filter(([elLevel]) => isGM || elLevel === level);
        for (const [level, config] of sortedLevels) {
          if (level !== 'Encrypté') {
            proficiencyOptions.push(level);
          }
          proficiencyLevelColors[level] = config.color || "#777777";
        }
        if (proficiencyOptions.length === 1) {
          proficiencyOptions = ['Encrypté', 'débutant', 'moyen', 'avancé', 'natif'];
          proficiencyLevelColors = {
            "Encrypté": "#777777",
            "débutant": "#ff0000",
            "moyen": "#ffa500",
            "avancé": "#00ff00",
            "natif": "#0000ff"
          };
        } else {
          proficiencyLevelColors["Encrypté"] = proficiencyLevelColors["Encrypté"] || "#777777";
        }
      } catch (error) {
        proficiencyOptions = ['Encrypté', 'débutant', 'moyen', 'avancé', 'natif'];
        proficiencyLevelColors = {
          "Encrypté": "#777777",
          "débutant": "#ff0000",
          "moyen": "#ffa500",
          "avancé": "#00ff00",
          "natif": "#0000ff"
        };
      }
      let proficiencyControls = `<div class="gm-language-controls" data-language="${language}">`;
      proficiencyOptions.forEach((level) => {
        const buttonColor = proficiencyLevelColors[level] || "#777777";
        proficiencyControls += `<button class="gm-level-button" data-level="${level}" data-original-text="${originalText}" style="background-color: ${buttonColor}; color: white;">${level}</button>`;
      });
      proficiencyControls += `</div>`;
      contentRow.append(proficiencyControls);
        if (!document.getElementById('gm-language-controls-style')) {
        const gmStyle = document.createElement('style');
        gmStyle.id = 'gm-language-controls-style';
        gmStyle.textContent = `
          .gm-language-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px dashed #ccc;
          }
          .gm-level-button {
            font-size: 0.8em;
            padding: 2px 6px;
            border: 1px solid #333;
            border-radius: 3px;
            cursor: pointer;
            text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.7);
          }
          .gm-level-button:hover {
            opacity: 0.8;
          }
          .gm-level-button.active {
            border: 2px solid white;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
          }
        `;
        document.head.appendChild(gmStyle);
          $(document).off('click', '.gm-level-button').on('click', '.gm-level-button', function(e) {
          e.stopPropagation();
          const $this = $(this);
          const selectedLevel = $this.data('level');
          const originalText = $this.data('original-text');
          const language = $this.closest('.gm-language-controls').data('language');
          const languageBlock = $this.closest('.language-block');
          const contentRow = $this.closest('.language-content-row');
          const headerRow = languageBlock.find('.language-header-row');
          const buttonColor = proficiencyLevelColors[selectedLevel] || "#777777";
          headerRow.text(`${language || 'Langue inconnue'} - ${selectedLevel}`);
          headerRow.css('background-color', buttonColor);
          languageBlock.find('.gm-level-button').removeClass('active');
          $this.addClass('active');          
          if (selectedLevel === 'Encrypté') {
            const controls = contentRow.find('.gm-language-controls').detach();
            contentRow.html(originalText);
            contentRow.append(controls);
            const font = getFontForLanguage(language);
            contentRow.css({
                'background-color': hexToRgba(buttonColor, 0.1),
                'padding': '8px',
                'border-radius': '4px',
                'margin': '4px 0',
                'border': `1px solid ${hexToRgba(buttonColor, 0.2)}`,
                'font-family': font ? `'${font}', sans-serif` : 'inherit'
            });
            
            contentRow.find(`.gm-level-button[data-level="${selectedLevel}"]`).addClass('active');
          } else {
            try {
              let decryptedText = "(Texte déchiffré)";
              if (typeof decryptText === 'function') {
                try {
                  const effectiveLevel = selectedLevel;
                  decryptedText = decryptText(originalText, language, effectiveLevel);
                } catch (decryptError) {
                  decryptedText = `Erreur de déchiffrement: ${decryptError.message || 'Erreur inconnue'}`;
                  ui.notifications.error(`Erreur lors du déchiffrement: ${decryptError.message || 'Erreur inconnue'}`);
                }
              } else {
                decryptedText = "Fonction de déchiffrement non disponible";
                ui.notifications.error(`La fonction de déchiffrement n'est pas disponible`);
              }
              
              const controls = contentRow.find('.gm-language-controls').detach();
              contentRow.html(decryptedText);
              contentRow.append(controls);
              contentRow.css({
                  'background-color': hexToRgba(buttonColor, 0.1),
                  'padding': '8px',
                  'border-radius': '4px',
                  'margin': '4px 0',
                  'border': `1px solid ${hexToRgba(buttonColor, 0.2)}`,
                  'font-family': 'inherit'
              });
              
              contentRow.find(`.gm-level-button[data-level="${selectedLevel}"]`).addClass('active');
            } catch (error) {
              contentRow.html(`Erreur de traitement: ${error.message || 'Erreur inconnue'}`);
              const controls = contentRow.find('.gm-language-controls').detach();
              contentRow.append(controls);
            }
          }
        });
      }
      languageBlock.find(`.gm-level-button[data-level="Encrypté"]`).addClass('active');
    }
    element.replaceWith(languageBlock);
  });
}

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(108, 138, 165, ${alpha})`;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    return hex;
  }
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

Hooks.once('ready', () => {
  const style = document.createElement('style');
  style.textContent = `
    .language-block {
      position: relative;
      margin: 15px 0;
      border: 1px solid #ddd;
      border-radius: 5px;
      overflow: hidden;
    }
    
    .language-content.decrypted {
      background-color: rgba(220, 240, 220, 0.7);
      transition: background-color 0.3s ease;
    }
    
    .language-content {
      transition: background-color 0.3s ease;
    }
  `;
  document.head.appendChild(style);
});