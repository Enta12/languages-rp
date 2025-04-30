const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LanguagesConfig extends FormApplication {
  static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
          id: "languages-config",
          title: "Configuration des langues",
          template: "modules/languages-rp-fork/templates/languages-config.html",
          width: 500,
          height: "auto",
          closeOnSubmit: true
      });
  }

  getData() {
      return {
          languages: game.settings.get(MODULE_ID, 'availableLanguages')
      };
  }

  async _updateObject(event) {
      event.preventDefault();
      
      const languages = [];
      this.element.find('.language-config-item').each((i, el) => {
          const name = $(el).find('.language-name').val();
          if (name && name.trim() !== '') {
              languages.push(name.trim());
          }
      });
      
      await game.settings.set(MODULE_ID, 'availableLanguages', languages);
      Hooks.callAll('languagesRPUpdated', languages);
      ui.notifications.info("Les langues ont été mises à jour avec succès.");
  }

  activateListeners(html) {
      super.activateListeners(html);
      
      html.find('.add-language-config').click(this._onAddLanguage.bind(this));
      html.find('.remove-language-config').click(this._onRemoveLanguage.bind(this));
  }
  
  _onAddLanguage(_) {
      const newLanguage = $(`
          <div class="language-config-item">
              <input type="text" class="language-name" placeholder="Nom de la langue">
              <button type="button" class="remove-language-config"><i class="fas fa-trash"></i></button>
          </div>
      `);
      
      this.element.find('.languages-config-list').append(newLanguage);
      newLanguage.find('.remove-language-config').click(this._onRemoveLanguage.bind(this));
  }
  
  _onRemoveLanguage(event) {
      $(event.currentTarget).closest('.language-config-item').remove();
  }
} 

//region Constantes
const MENU_CATEGORIES = [
  "saves",
  "checks",
  "attack",
  "damage",
  "heal",
  "lookup",
  "rules",
  "conditionTypes",
  "weaponMasteries",
  "areaTargetTypes",
  "itemProperties",
  "abilities",
  "skills",
  "damageTypes",
  "creatureTypes"
];

const MODULE_ID = "languages-rp-fork";

//region Hook
Hooks.once("init", () => {
  // Enregistrement d'un sous-menu de configuration
  game.settings.registerMenu(MODULE_ID, "menuConfig", {
    name: game.i18n.localize("DND.SETTINGS.MENU.TITLE"),
    label: game.i18n.localize("DND.SETTINGS.MENU.LABEL"),
    hint: game.i18n.localize("DND.SETTINGS.MENU.HINT"),
    icon: "fas fa-list",
    type: DnDMenuConfigV2,
    restricted: true,
  });

  // Elargir ou non la fenêtre item
  game.settings.register(MODULE_ID, "widenItemWindows", {
    name: game.i18n.localize("DND.SETTINGS.PROSEGAP.TITLE"),
    hint: game.i18n.localize("DND.SETTINGS.PROSEGAP.HINT"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
    onChange: (value) => {
      if (value) {
        document.documentElement.classList.add("dnd-widen-windows");
      } else {
        document.documentElement.classList.remove("dnd-widen-windows");
      }
    },
  });

  game.settings.register(MODULE_ID, "availableLanguages", {
    name: 'Langues disponibles',
    hint: 'Liste des langues disponibles pour les joueurs',
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });

  game.settings.registerMenu(MODULE_ID, "languagesConfig", {
    name: 'Configurer les langues',
    label: 'Configurer',
    hint: 'Configurer les langues disponibles pour vos joueurs',
    icon: 'fas fa-language',
    type: LanguagesConfig,
    restricted: true
  });


  Hooks.once("ready", () => {
    // Appliquer le style au chargement si le paramètre est activé
    if (game.settings.get(MODULE_ID, "widenItemWindows")) {
      document.documentElement.classList.add("dnd-widen-windows");
    }
  });

  // Enregistrement des paramètres pour chaque catégorie de menu
  MENU_CATEGORIES.forEach((category) => {
    game.settings.register(MODULE_ID, `show${category}`, {
      name: game.i18n.localize(`DND.MENU.${category.toUpperCase()}.TITLE`),
      hint: game.i18n.localize(`DND.MENU.${category.toUpperCase()}.HINT`),
      scope: "world",
      config: false,
      type: Boolean,
      default: true,
    });
  });
});

class DnDMenuConfigV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dnd-menu-config",
    form: {
      handler: DnDMenuConfigV2.#onSubmit,
      closeOnSubmit: true,
    },
    position: {
      width: 480,
      height: "auto",
    },
    tag: "form",
    window: {
      title: "DND.SETTINGS.MENU.TITLE",
      contentClasses: ["reference-form"],
    },
  };

  get title() {
    return game.i18n.localize(this.options.window.title);
  }

  static PARTS = {
    dnd: {
      template: "modules/languages-rp-fork/templates/menu-config.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  _prepareContext(options) {
    return {
      categories: MENU_CATEGORIES.map((category) => ({
        id: category,
        name: game.i18n.localize(`DND.MENU.${category.toUpperCase()}.TITLE`),
        hint: game.i18n.localize(`DND.MENU.${category.toUpperCase()}.HINT`),
        checked: game.settings.get(MODULE_ID, `show${category}`),
      })),
      buttons: [
        { type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" },
      ],
    };
  }

  static async #onSubmit(event, form, formData) {
    const settings = foundry.utils.expandObject(formData.object);
    await Promise.all(
      Object.entries(settings).map(([key, value]) => {
        const settingKey = key.startsWith("show") ? key : `show${key}`;
        return game.settings.set(MODULE_ID, settingKey, value);
      })
    );
  }
}

// Ajouter le hook pour afficher la liste des langues dans les paramètres
Hooks.on('renderSettingsConfig', (app, html) => {
    const containerId = 'languages-rp-dynamic-list';
    const container = $(`<div id="${containerId}" class="languages-list-container"></div>`);
    
    html.find(`button[data-key="${MODULE_ID}.languagesConfig"]`).parent().after(container);
    
    const updateLanguagesList = () => {
        const languages = game.settings.get(MODULE_ID, 'availableLanguages');
        
        const languagesList = $('<div class="languages-list-display"></div>');
        
        const header = $(`<h3 class="languages-header">
            <i class="fas fa-language"></i> 
            Langues disponibles <span class="language-count">(${languages.length})</span>
        </h3>`);
        languagesList.append(header);
        
        if (languages.length > 0) {
            const ul = $('<ul></ul>');
            languages.forEach(lang => {
                ul.append(`<li>${lang}</li>`);
            });
            languagesList.append(ul);
        } else {
            languagesList.append('<p class="notes">Aucune langue configurée</p>');
        }
        
        container.fadeOut(200, function() {
            $(this).empty().append(languagesList).fadeIn(200);
        });
    };
    
    updateLanguagesList();
    
    Hooks.on('updateSetting', (setting) => {
        if (setting.key === `${MODULE_ID}.availableLanguages`) {
            updateLanguagesList();
        }
    });
    
    Hooks.on('languagesRPUpdated', () => {
        updateLanguagesList();
    });
});