import { MODULE_ID } from "./main.js";

/**
 * Configuration application for available languages.
 * @extends FormApplication
 */
export class LanguagesConfig extends FormApplication {
  /**
   * @override
   * @returns {FormApplicationOptions}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "languages-config",
      title: game.i18n.localize("languages-rp.ui.languageConfiguration"),
      template: "modules/languages-rp/templates/languages-config.html",
      width: 500,
      height: "auto",
      closeOnSubmit: true
    });
  }

  /**
   * @override
   * @returns {object} Data for the template.
   */
  getData() {
    const availableLanguagesSetting = game.settings.get(MODULE_ID, 'availableLanguages') || {};
    const languageSettings = [];
    for (const [name, data] of Object.entries(availableLanguagesSetting)) {
      languageSettings.push({
        name: name,
        key: typeof data === 'object' ? data.key : data,
        font: typeof data === 'object' ? data.font : ''
      });
    }
    return { languages: languageSettings };
  }

  /**
   * Generates a random key string.
   * @returns {string} A 40-character random string.
   * @private
   */
  _generateRandomKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < 40; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * @override
   * @param {Event} event - The form submission event.
   * @returns {Promise<void>}
   * @protected
   */
  async _updateObject(event) {
    event.preventDefault();
    const oldLanguages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
    const updatedLanguages = {};
    this.element.find('.language-config-item').each((index, htmlElement) => {
      const name = $(htmlElement).find('.language-name').val();
      const key = $(htmlElement).find('.language-key').val();
      const font = $(htmlElement).find('.language-font').val();
      if (name && name.trim() !== '') {
        updatedLanguages[name.trim()] = {
          key: key || this._generateRandomKey(),
          font: font || ''
        };
      }
    });
    
    await game.settings.set(MODULE_ID, 'availableLanguages', updatedLanguages);
    
    await this._cleanupDeletedLanguagesFromActors(oldLanguages, updatedLanguages);
    
    Hooks.callAll('languagesRPUpdated', updatedLanguages);
  }

  /**
   * Clean up references to deleted languages from actors.
   * @param {Object} oldLanguages - The previous languages configuration.
   * @param {Object} newLanguages - The updated languages configuration.
   * @private
   */
  async _cleanupDeletedLanguagesFromActors(oldLanguages, newLanguages) {
    try {
      const deletedLanguages = Object.keys(oldLanguages).filter(lang => !newLanguages[lang]);
      
      if (deletedLanguages.length === 0) return;
      
      console.log(`${MODULE_ID} | Cleaning up deleted languages:`, deletedLanguages);
      
      let actorsUpdated = 0;
      
      for (const actor of game.actors) {
        try {
          let actorFlags = actor.flags?.[MODULE_ID] || actor.data?.flags?.[MODULE_ID];
          if (!actorFlags || !actorFlags.languages) continue;
          
          let needsUpdate = false;
          let actorLanguages = foundry.utils.deepClone(actorFlags.languages || {});
          
          for (const lang of deletedLanguages) {
            if (lang in actorLanguages) {
              delete actorLanguages[lang];
              needsUpdate = true;
            }
          }
          
          if (needsUpdate) {
            await actor.update({
              [`flags.${MODULE_ID}.languages`]: actorLanguages
            });
            actorsUpdated++;
            console.log(`${MODULE_ID} | Removed deleted language from actor: ${actor.name}`);
          }
        } catch (error) {
          console.error(`${MODULE_ID} | Error cleaning up for actor ${actor.name}:`, error);
        }
      }
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error cleaning up deleted languages:`, error);
    }
  }

  /**
   * @override
   * @param {JQuery} html - The jQuery object representing the HTML content of the form.
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.add-language-config').click(this._onAddLanguage.bind(this));
    html.find('.remove-language-config').click(this._onRemoveLanguage.bind(this));
    html.find('.file-picker').click(this._onFilePicker.bind(this));
    html.find('.language-font').each((index, fontInputElement) => {
      const inputElement = $(fontInputElement);
      const fontPath = inputElement.val();
      if (fontPath) {
        const previewElement = inputElement.siblings('.font-preview');
        const fontFileName = fontPath.split('/').pop().split('.')[0];
        try {
          const fontFace = new FontFace(fontFileName, `url("${fontPath}")`);
          fontFace.load().then(loadedFont => {
            document.fonts.add(loadedFont);
            previewElement.css('font-family', fontFileName);
            previewElement.text(game.i18n.localize("languages-rp.ui.preview"));
          }).catch(error => {
            console.error('Error loading font:', error);
            previewElement.text(game.i18n.localize("languages-rp.ui.loadingError") || 'Loading error');
          });
        } catch (error) {
          console.error('Error creating FontFace:', error);
          previewElement.text(game.i18n.localize("languages-rp.ui.invalidFont") || 'Invalid font');
        }
      }
    });
  }

  /**
   * Handles adding a new language configuration item.
   * @param {Event} event - The click event.
   * @returns {Promise<void>}
   * @private
   */
  async _onAddLanguage(event) {
    const randomKey = this._generateRandomKey();
    const newLanguageHTML = await renderTemplate('modules/languages-rp/templates/partials/language-config-item.html', { randomKey });
    const newLanguageElement = $(newLanguageHTML);
    this.element.find('.languages-config-list').append(newLanguageElement);
    newLanguageElement.find('.remove-language-config').click(this._onRemoveLanguage.bind(this));
    newLanguageElement.find('.file-picker').click(this._onFilePicker.bind(this));
  }

  /**
   * Handles removing a language configuration item.
   * @param {Event} event - The click event.
   * @private
   */
  _onRemoveLanguage(event) {
    $(event.currentTarget).closest('.language-config-item').remove();
  }

  /**
   * Handles the file picker interaction for selecting a font file.
   * @param {Event} event - The click event.
   * @private
   */
  _onFilePicker(event) {
    event.preventDefault();
    const buttonElement = event.currentTarget;
    const targetFieldId = buttonElement.dataset.target;
    const inputElement = this.element.find(`#${targetFieldId}`);
    const filePickerInstance = new FilePicker({
      type: "data",
      current: inputElement.val(),
      callback: (path) => {
        inputElement.val(path);
        const previewElement = inputElement.siblings('.font-preview');
        previewElement.text(game.i18n.localize("languages-rp.ui.preview"));
        const fontFileName = path.split('/').pop().split('.')[0];
        const fontFace = new FontFace(fontFileName, `url("${path}")`);
        fontFace.load().then(loadedFont => {
          document.fonts.add(loadedFont);
          previewElement.css('font-family', fontFileName);
          previewElement.text(game.i18n.localize("languages-rp.ui.preview"));
        }).catch(error => {
          console.error('Error loading font:', error);
          previewElement.text(game.i18n.localize("languages-rp.ui.loadingError") || 'Font loading error');
        });
      },
      allowExtensions: ["woff", "woff2", "ttf", "otf", "eot"]
    });
    filePickerInstance.browse();
  }
}

/**
 * Configuration application for proficiency levels.
 * @extends FormApplication
 */
export class ProficiencyLevelsConfig extends FormApplication {
  /**
   * @override
   * @returns {FormApplicationOptions}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "proficiency-levels-config",
      title: game.i18n.localize("languages-rp.ui.proficiencyLevelsConfiguration"),
      template: "modules/languages-rp/templates/proficiency-levels-config.html",
      width: 550,
      height: "auto",
      closeOnSubmit: true
    });
  }

  /**
   * Default proficiency levels.
   * @returns {object} The default proficiency levels.
   */
  static get DEFAULT_LEVELS() {
    return {
      [game.i18n.localize("languages-rp.proficiencyLevels.beginner")]: { value: 0.15, color: '#d9c060' },
      [game.i18n.localize("languages-rp.proficiencyLevels.intermediate")]: { value: 0.35, color: '#bcc060' },
      [game.i18n.localize("languages-rp.proficiencyLevels.advanced")]: { value: 0.60, color: '#9cc060' },
      [game.i18n.localize("languages-rp.proficiencyLevels.native")]: { value: 1.0, color: '#60c070' }
    };
  }

  /**
   * @override
   * @returns {object} Data for the template.
   */
  getData() {
    const proficiencyLevelsSetting = game.settings.get(MODULE_ID, 'proficiencyLevels') || ProficiencyLevelsConfig.DEFAULT_LEVELS;
    const levelSettings = [];
    for (const [name, data] of Object.entries(proficiencyLevelsSetting)) {
      const value = typeof data === 'object' ? data.value : data;
      const color = typeof data === 'object' ? data.color : this._getDefaultColor(value);
      levelSettings.push({
        name: name,
        value: value,
        color: color
      });
    }
    levelSettings.sort((a, b) => a.value - b.value);
    return {
      levels: levelSettings,
      worldName: game.world.title
    };
  }

  /**
   * Gets a default color based on the proficiency value.
   * @param {number} value - The proficiency value (0 to 1).
   * @returns {string} The hex color string.
   * @private
   */
  _getDefaultColor(value) {
    const hue = Math.min(60 + (value * 60), 120);
    return this._hslToHex(hue, 70, 70);
  }

  /**
   * Converts HSL color values to a HEX string.
   * @param {number} h - Hue.
   * @param {number} s - Saturation.
   * @param {number} l - Lightness.
   * @returns {string} The hex color string.
   * @private
   */
  _hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const colorValue = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * colorValue).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * @override
   * @param {Event} event - The form submission event.
   * @returns {Promise<void>}
   * @protected
   */
  async _updateObject(event) {
    event.preventDefault();
    const updatedLevels = {};
    const levelElements = this.element.find('.proficiency-level-item');
    levelElements.each((index, itemElement) => {
      const $itemElement = $(itemElement);
      const nameInputElement = $itemElement.find('input[type="text"]');
      const valueInputElement = $itemElement.find('input[type="number"]');
      const colorInputElement = $itemElement.find('input[type="color"]');
      const name = nameInputElement.val().trim();
      const value = parseFloat(valueInputElement.val());
      const color = colorInputElement.val();
      if (name) {
        updatedLevels[name] = {
          value: isNaN(value) ? 0.5 : Math.min(Math.max(value, 0), 1),
          color: color || '#cccccc'
        };
      }
    });

    const hasNativeLevel = Object.values(updatedLevels).some(data =>
      Math.abs(data.value - 1.0) < 0.001
    );

    if (!hasNativeLevel && Object.keys(updatedLevels).length > 0) {
      const highestLevelEntry = Object.entries(updatedLevels)
        .sort((a, b) => b[1].value - a[1].value)[0];
      updatedLevels[highestLevelEntry[0]].value = 1.0;
    }

    if (Object.keys(updatedLevels).length === 0) {
      Object.assign(updatedLevels, ProficiencyLevelsConfig.DEFAULT_LEVELS);
    }

    try {
      const levelsToSave = JSON.parse(JSON.stringify(updatedLevels));
      await game.settings.set(MODULE_ID, 'proficiencyLevels', levelsToSave);
      Hooks.callAll('proficiencyLevelsUpdated', levelsToSave);
    } catch (error) {
      console.error("Error saving levels:", error);
      ui.notifications.error("An error occurred while saving proficiency levels.");
    }
  }

  /**
   * @override
   * @param {JQuery} html - The jQuery object representing the HTML content of the form.
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.find('.add-level').click(this._onAddLevel.bind(this));
    html.find('.remove-level').click(this._onRemoveLevel.bind(this));
    html.find('.reset-defaults').click(this._onResetDefaults.bind(this));
    html.find('input[type="number"], input[type="color"]').on('input change', () => {
    });
  }

  /**
   * Handles adding a new proficiency level item.
   * @param {Event} event - The click event.
   * @returns {Promise<void>}
   * @private
   */
  async _onAddLevel(event) {
    const levelsListElement = this.element.find('.proficiency-levels-list');
    const newLevelIndex = levelsListElement.find('.proficiency-level-item').length;
    const defaultValue = 0.5;
    const defaultColor = this._getDefaultColor(defaultValue);
    const defaultPercentage = Math.round(defaultValue * 100);

    const templatePath = 'modules/languages-rp/templates/partials/proficiency-level-item.html';
    const templateData = { index: newLevelIndex, value: defaultValue, percentage: defaultPercentage, color: defaultColor };
    const newLevelHtml = await renderTemplate(templatePath, templateData);
    const newLevelElement = $(newLevelHtml);

    levelsListElement.append(newLevelElement);
    newLevelElement.find('.remove-level').click(this._onRemoveLevel.bind(this));
    newLevelElement.find('input[type="number"]').on('input change', function() {
      const value = parseFloat($(this).val()) || 0;
      $(this).closest('.level-value').find('.percentage').text(Math.round(value * 100) + '%');
      const colorInputElement = $(this).closest('.proficiency-level-item').find('input[type="color"]');
      if (!colorInputElement.data('manually-changed')) {
        const newColor = this._getDefaultColor(value);
        colorInputElement.val(newColor);
      }
    }.bind(this));
    newLevelElement.find('input[type="color"]').on('change', function() {
      $(this).data('manually-changed', true);
    });
  }

  /**
   * Handles removing a proficiency level item.
   * @param {Event} event - The click event.
   * @private
   */
  _onRemoveLevel(event) {
    $(event.currentTarget).closest('.proficiency-level-item').remove();
  }

  /**
   * Handles resetting proficiency levels to their default values.
   * @param {Event} event - The click event.
   * @private
   */
  _onResetDefaults(event) {
    event.preventDefault();
    Dialog.confirm({
      title: game.i18n.localize("languages-rp.settings.proficiencyLevels.reset.title"),
      content: game.i18n.localize("languages-rp.settings.proficiencyLevels.reset.content"),
      yes: async () => {
        const defaultLevelsData = JSON.parse(JSON.stringify(ProficiencyLevelsConfig.DEFAULT_LEVELS));
        try {
          await game.settings.set(MODULE_ID, 'proficiencyLevels', defaultLevelsData);
          this.render(true);
          Hooks.callAll('proficiencyLevelsUpdated', defaultLevelsData);
        } catch (error) {
          console.error("Error resetting levels:", error);
          ui.notifications.error("An error occurred while resetting proficiency levels.");
        }
      },
      no: () => { }
    });
  }
}

Hooks.once("init", () => {
  const cssPath = `modules/${MODULE_ID}/styles/settings.css`;
  const link = document.createElement('link');
  link.type = 'text/css';
  link.rel = 'stylesheet';
  link.href = cssPath;
  document.head.appendChild(link);

  /**
   * Handlebars helper for basic math operations.
   * @param {number} leftValue - The left operand.
   * @param {string} operator - The operator (+, -, *, /).
   * @param {number} rightValue - The right operand.
   * @returns {number} The result of the operation, rounded to 2 decimal places.
   */
  Handlebars.registerHelper('math', function(leftValue, operator, rightValue) {
    leftValue = parseFloat(leftValue);
    rightValue = parseFloat(rightValue);
    switch (operator) {
      case '+': return Math.round((leftValue + rightValue) * 100) / 100;
      case '-': return Math.round((leftValue - rightValue) * 100) / 100;
      case '*': return Math.round((leftValue * rightValue) * 100) / 100;
      case '/': return Math.round((leftValue / rightValue) * 100) / 100;
      default: return leftValue;
    }
  });

  game.settings.register(MODULE_ID, "availableLanguages", {
    name: game.i18n.localize("languages-rp.settings.languages.name"),
    hint: game.i18n.localize("languages-rp.settings.languages.hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {},
  });

  game.settings.register(MODULE_ID, "proficiencyLevels", {
    name: game.i18n.localize("languages-rp.settings.proficiencyLevels.name"),
    hint: game.i18n.localize("languages-rp.settings.proficiencyLevels.hint"),
    scope: "world",
    config: false,
    type: Object,
    default: {
      'beginner': { value: 0.15, color: '#d9c060' },
      'intermediate': { value: 0.35, color: '#bcc060' },
      'advanced': { value: 0.60, color: '#9cc060' },
      'native': { value: 1.0, color: '#60c070' }
    },
  });

  game.settings.registerMenu(MODULE_ID, "languagesConfig", {
    name: game.i18n.localize("languages-rp.settings.languages.name"),
    label: game.i18n.localize("languages-rp.settings.languages.label"),
    hint: game.i18n.localize("languages-rp.settings.languages.hint"),
    icon: 'fas fa-language',
    type: LanguagesConfig,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "proficiencyLevelsConfig", {
    name: game.i18n.localize("languages-rp.settings.proficiencyLevels.name"),
    label: game.i18n.localize("languages-rp.settings.proficiencyLevels.label"),
    hint: game.i18n.localize("languages-rp.settings.proficiencyLevels.hint"),
    icon: 'fas fa-graduation-cap',
    type: ProficiencyLevelsConfig,
    restricted: true
  });

  Hooks.once("ready", () => {
    if (game.settings.get(MODULE_ID, "widenItemWindows")) {
      document.documentElement.classList.add(`${MODULE_ID}-widen-windows`);
    }
  });
});

Hooks.once('ready', async () => {
  const currentLanguagesSetting = game.settings.get(MODULE_ID, 'availableLanguages');
  if (Array.isArray(currentLanguagesSetting)) {
    const migratedLanguagesSetting = {};
    currentLanguagesSetting.forEach(languageName => {
      const key = LanguagesConfig.prototype._generateRandomKey();
      migratedLanguagesSetting[languageName] = key;
    });
    await game.settings.set(MODULE_ID, 'availableLanguages', migratedLanguagesSetting);
  }

  const currentProficiencyLevels = game.settings.get(MODULE_ID, 'proficiencyLevels');
  let needsMigration = false;
  if (currentProficiencyLevels && Object.keys(currentProficiencyLevels).length > 0) {
    needsMigration = Object.values(currentProficiencyLevels).some(value =>
      typeof value !== 'object' || !value.hasOwnProperty('value') || !value.hasOwnProperty('color')
    );
    if (needsMigration) {
      const migratedProficiencyLevels = {};
      Object.entries(currentProficiencyLevels).forEach(([name, value]) => {
        if (typeof value === 'object' && value.hasOwnProperty('value') && value.hasOwnProperty('color')) {
          migratedProficiencyLevels[name] = value;
        } else {
          const numericValue = typeof value === 'number' ? value : parseFloat(value);
          if (!isNaN(numericValue)) {
            const hue = Math.min(60 + (numericValue * 60), 120);
            const color = ProficiencyLevelsConfig.prototype._hslToHex(hue, 70, 70);
            migratedProficiencyLevels[name] = {
              value: numericValue,
              color: color
            };
          }
        }
      });
      const defaultLevels = {
        'beginner': { value: 0.15, color: '#d9c060' },
        'intermediate': { value: 0.35, color: '#bcc060' },
        'advanced': { value: 0.60, color: '#9cc060' },
        'native': { value: 1.0, color: '#60c070' }
      };
      for (const [name, config] of Object.entries(defaultLevels)) {
        if (!migratedProficiencyLevels[name]) {
          migratedProficiencyLevels[name] = config;
        }
      }
      await game.settings.set(MODULE_ID, 'proficiencyLevels', migratedProficiencyLevels);
    }
  }
});

Hooks.on('renderSettingsConfig', (_, htmljQueryElement) => {
  const dynamicListContainerId = 'languages-rp-dynamic-list';
  const dynamicListContainerElement = $(`<div id="${dynamicListContainerId}" class="languages-list-container"></div>`);
  htmljQueryElement.find(`button[data-key="${MODULE_ID}.languagesConfig"]`).parent().after(dynamicListContainerElement);

  /**
   * Updates the display of the dynamic list of available languages.
   * @async
   */
  const updateDynamicLanguagesListDisplay = async () => {
    const availableLanguagesData = game.settings.get(MODULE_ID, 'availableLanguages') || {};
    const languageNamesList = Object.keys(availableLanguagesData);
    const languagesListDisplayElement = $('<div class="languages-list-display"></div>');

    const headerHtml = await renderTemplate('modules/languages-rp/templates/partials/languages-list-header.html');
    const headerElement = $(headerHtml);
    languagesListDisplayElement.append(headerElement);

    if (languageNamesList.length > 0) {
      const unorderedListElement = $('<ul></ul>');
      let fontStyleContent = '';

      languageNamesList.forEach((languageName) => {
        const languageData = availableLanguagesData[languageName];
        const languageKey = typeof languageData === 'object' ? languageData.key : languageData;
        const fontPath = typeof languageData === 'object' ? languageData.font : '';
        let fontClassName = '';

        if (fontPath) {
          const fontFileName = fontPath.split('/').pop().split('.')[0];
          const languageIdentifier = languageName.toLowerCase().replace(/\s+/g, '-');
          fontClassName = `lang-font-${languageIdentifier}`;
          fontStyleContent += `
            @font-face {
              font-family: "${fontFileName}";
              src: url("${fontPath}");
            }
            .${fontClassName} {
              font-family: "${fontFileName}", sans-serif;
            }
          `;
          try {
            const fontFace = new FontFace(fontFileName, `url("${fontPath}")`);
            fontFace.load().then(loadedFont => {
              document.fonts.add(loadedFont);
            }).catch(error => {
              console.error(`Error loading font ${fontPath}:`, error);
            });
          } catch (error) {
            console.error(`Error creating FontFace for ${fontPath}:`, error);
          }
        }
        const displayedKey = languageKey.length > 15 ? languageKey.substring(0, 15) + '...' : languageKey;
        const listItemElement = $(`<li>${languageName} - <span class="${fontClassName} lang-key" title="${languageKey}">${displayedKey}</span></li>`);
        unorderedListElement.append(listItemElement);
      });

      if (fontStyleContent) {
        const styleElementId = `${MODULE_ID}-dynamic-font-styles`;
        let fontStyleElement = document.getElementById(styleElementId);
        if (!fontStyleElement) {
          fontStyleElement = document.createElement('style');
          fontStyleElement.id = styleElementId;
          document.head.appendChild(fontStyleElement);
        }
        fontStyleElement.textContent = fontStyleContent;
      }
      languagesListDisplayElement.append(unorderedListElement);
    } else {
      languagesListDisplayElement.append('<p class="notes">No languages configured</p>');
    }

    dynamicListContainerElement.fadeOut(200, function() {
      $(this).empty().append(languagesListDisplayElement).fadeIn(200);
    });
  };

  updateDynamicLanguagesListDisplay();
  Hooks.on('updateSetting', (setting) => {
    if (setting.key === `${MODULE_ID}.availableLanguages`) {
      updateDynamicLanguagesListDisplay();
    }
  });
  Hooks.on('languagesRPUpdated', () => {
    updateDynamicLanguagesListDisplay();
  });
});