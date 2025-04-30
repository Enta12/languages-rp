const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import { STATIC_CONFIG } from "../static-config.js";

export default class SaveFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["save-formula-dialog"],
    tag: "form",
    form: {
      handler: SaveFormulaDialog.handleFormSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    position: {
      width: 400,
      height: "auto",
    },
    window: {
      title: "DND.MENU.DIALOG",
      contentClasses: ["standard-form"]
    },
    actions: {
      addSave: SaveFormulaDialog.#addSave,
      deleteSave: SaveFormulaDialog.#deleteSave,
    },
  };

  static PARTS = {
    config: {
      template: "modules/dnd-easy-reference/templates/save/config.hbs",
    },
    saves: {
      template: "modules/dnd-easy-reference/templates/save/formulas.hbs",
      scrollable: [""]
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  }

  /**
   * Modèle de données.
   * @type {SaveFormulaModel}
   */
  #model = new SaveFormulaModel();

  /**
   * Configuration résultante.
   * @type {object|null}
   */
  #config = null;
  get config() {
    return this.#config;
  }

  /**
   * Texte à injecter.
   * @type {string|null}
   */
  get #text() {
    let saves = [];
    for (const { ability } of this.#model.saves) {
      if (!ability) continue;
      saves.push(ability);
    }

    if (!saves.length) return null;

    let command = saves.join(" ");

    if (this.#model.dc) {
      command += ` dc=${this.#model.dc}`;
    }

    if (this.#model.format === "long") {
      command += " format=long";
    }

    const commandType = this.#model.useConcentration ? "concentration" : "save";

    return `[[/${commandType} ${command}]]`;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    const saves = context.saves = [];
    for (const [i, save] of this.#model.saves.entries()) {
      saves.push({
        idx: i,
        rule: i > 0,
        ability: {
          field: this.#model.schema.getField("saves.element.ability"),
          value: save.ability,
          name: `saves.${i}.ability`,
        }
      });
    }

    context.dc = {
      field: this.#model.schema.getField("dc"),
      value: this.#model.dc,
    };

    context.format = {
      field: this.#model.schema.getField("format"),
      value: this.#model.format,
    };

    context.useConcentration = {
      field: this.#model.schema.getField("useConcentration"),
      value: this.#model.useConcentration,
    };

    context.abilities = STATIC_CONFIG.abilities;

    context.buttons = [{
      type: "submit",
      icon: "fa-solid fa-check",
      label: "Confirm",
    }];

    return context;
  }

  /**
   * Gère la soumission du formulaire.
   * @this {SaveFormulaDialog}
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   * @param {object} submitOptions
   */
  static handleFormSubmit(event, form, formData, submitOptions) {
    switch (event.type) {
      case "change":
        this.#model.updateSource(formData.object);
        break;
      case "submit":
        this.#config = this.#text;
        if (this.callback) this.callback(this.#config);
        this.close();
        break;
    }
  }

  /**
   * Ajoute une nouvelle capacité de sauvegarde.
   * @this {SaveFormulaDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #addSave(event, target) {
    const saves = this.#model.toObject().saves;
    const defaultAbility = Object.keys(STATIC_CONFIG.abilities)[0] || "";
    saves.push({ ability: defaultAbility });
    this.#model.updateSource({ saves });
    this.render({ parts: ["saves"] });
  }

  /**
   * Supprime une capacité de sauvegarde.
   * @this {SaveFormulaDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #deleteSave(event, target) {
    const idx = parseInt(target.dataset.idx);
    const saves = this.#model.toObject().saves;
    saves.splice(idx, 1);
    this.#model.updateSource({ saves });
    this.render({ parts: ["saves"] });
  }

  constructor(data) {
    super(data);
    this.callback = data.callback;
  }

  /**
   * Crée une instance de l'application.
   * @param {object} [options]            Options.
   * @returns {Promise<string|null>}      Le texte, ou null.
   */
  static async create(options = {}) {
    const { promise, resolve } = Promise.withResolvers();
    const application = new this(options);
    application.addEventListener("close", () => resolve(application.config), { once: true });
    application.render({ force: true });
    return promise;
  }
}

/**
 * Modèle de données utilitaire.
 */
class SaveFormulaModel extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      dc: new foundry.data.fields.NumberField({
        required: true,
        initial: 15,
        min: 0,
        integer: true,
        label: "DND.DIALOG.DC",
      }),
      format: new foundry.data.fields.StringField({
        required: true,
        initial: "short",
        choices: {
          "short": "DND.SETTINGS.FORMAT.SHORT",
          "long": "DND.SETTINGS.FORMAT.LONG"
        },
        label: "DND.SETTINGS.FORMAT.TITLE",
      }),
      useConcentration: new foundry.data.fields.BooleanField({
        required: true,
        initial: false,
        label: "DND.DIALOG.CONCENTRATION",
      }),
      saves: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
        ability: new foundry.data.fields.StringField({
          required: true,
          choices: () => STATIC_CONFIG.abilities
        }),
      }), {
        initial: () => {
          const defaultAbility = Object.keys(STATIC_CONFIG.abilities)[0] || "";
          return [{ ability: defaultAbility }];
        }
      })
    };
  }
}