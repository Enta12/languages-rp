const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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