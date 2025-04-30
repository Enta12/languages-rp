const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
import { STATIC_CONFIG, dnd5eUtilities } from "../static-config.js";

export default class CheckFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["check-formula-dialog"],
    tag: "form",
    form: {
      handler: CheckFormulaDialog.handleFormSubmit,
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
      addCheck: CheckFormulaDialog.#addCheck,
      deleteCheck: CheckFormulaDialog.#deleteCheck,
    },
  };

  static PARTS = {
    config: {
      template: "modules/dnd-easy-reference/templates/check/config.hbs",
    },
    checks: {
      template: "modules/dnd-easy-reference/templates/check/formulas.hbs",
      scrollable: [""]
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  }

  /**
   * Modèle de données.
   * @type {CheckFormulaModel}
   */
  #model = new CheckFormulaModel();

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
    let checks = [];
    for (const { type } of this.#model.checks) {
      if (!type) continue;

      if (Object.keys(this.toolsMap || {}).includes(type)) {
        checks.push(`tool=${type}`);
      } else {
        checks.push(type);
      }
    }

    if (!checks.length) return null;

    let command = checks.join(" ");

    if (this.#model.dc) {
      command += ` dc=${this.#model.dc}`;
    }

    if (this.#model.format === "long") {
      command += " format=long";
    }

    if (this.#model.passive) {
      command += " passive";
    }

    return `[[/check ${command}]]`;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    const checks = context.checks = [];
    for (const [i, check] of this.#model.checks.entries()) {
      checks.push({
        idx: i,
        rule: i > 0,
        type: {
          field: this.#model.schema.getField("checks.element.type"),
          value: check.type,
          name: `checks.${i}.type`,
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

    context.passive = {
      field: this.#model.schema.getField("passive"),
      value: this.#model.passive,
    };

    context.abilities = STATIC_CONFIG.abilities;
    context.skills = STATIC_CONFIG.skills;

    let toolChoices = await dnd5eUtilities.documents.Trait.choices("tool");
    const tools = Object.entries(toolChoices).reduce((acc, [k, v]) => {
      acc[k] = dnd5eUtilities.documents.Trait.keyLabel(`tool:${k}`);
      return acc;
    }, {});

    this.toolsMap = tools;
    context.tools = tools;

    context.buttons = [{
      type: "submit",
      icon: "fa-solid fa-check",
      label: "Confirm",
    }];

    return context;
  }

  /**
   * Gère la soumission du formulaire.
   * @this {CheckFormulaDialog}
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
   * Ajoute un nouveau type de test.
   * @this {CheckFormulaDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #addCheck(event, target) {
    const checks = this.#model.toObject().checks;
    checks.push({ type: "" });
    this.#model.updateSource({ checks });
    this.render({ parts: ["checks"] });
  }

  /**
   * Supprime un type de test.
   * @this {CheckFormulaDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #deleteCheck(event, target) {
    const idx = parseInt(target.dataset.idx);
    const checks = this.#model.toObject().checks;
    checks.splice(idx, 1);
    this.#model.updateSource({ checks });
    this.render({ parts: ["checks"] });
  }

  constructor(data) {
    super(data);
    this.callback = data.callback;
  }

  /**
   * Crée une instance de cette application.
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
class CheckFormulaModel extends foundry.abstract.DataModel {
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
      passive: new foundry.data.fields.BooleanField({
        label: "DND.DIALOG.PASSIVE",
      }),
      checks: new foundry.data.fields.ArrayField(new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({ required: true }),
      }), {
        initial: () => {
          const defaultType = Object.keys(STATIC_CONFIG.abilities)[0] || "";
          return [{ type: defaultType }];
        }
      })
    };
  }
}