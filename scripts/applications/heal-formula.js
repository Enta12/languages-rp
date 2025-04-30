const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { BooleanField, StringField } = foundry.data.fields;
import { STATIC_CONFIG } from "../static-config.js";

export default class HealFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["heal-formula-dialog"],
    tag: "form",
    form: {
      handler: HealFormulaDialog.handleFormSubmit,
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
  };

  static PARTS = {
    form: {
      template: "modules/dnd-easy-reference/templates/heal/formulas.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  }

  /**
   * Modèle de données.
   * @type {HealFormulaModel}
   */
  #model = new HealFormulaModel();

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
    const formula = this.#model.formula;
    const healType = this.#model.healType;

    if (!formula && !healType && !this.#model.average && !this.#model.extended) return null;

    let command = "[[/heal";

    if (formula) {
      command += ` formula=${formula}`;
    }

    if (healType) {
      command += ` type=${healType}`;
    }

    const options = [
      this.#model.average ? "average" : null,
      this.#model.extended ? "extended" : null,
    ].filter(Boolean).join(" ");

    if (options) {
      command += ` ${options}`;
    }

    command += "]]";

    return command;
  }

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    context.formula = {
      field: this.#model.schema.getField("formula"),
      value: this.#model.formula,
    };

    context.healType = {
      field: this.#model.schema.getField("healType"),
      value: this.#model.healType,
    };

    context.average = {
      field: this.#model.schema.getField("average"),
      value: this.#model.average,
    };

    context.extended = {
      field: this.#model.schema.getField("extended"),
      value: this.#model.extended,
    };

    context.healingTypes = STATIC_CONFIG.healingTypes;

    context.buttons = [{
      type: "submit",
      icon: "fa-solid fa-check",
      label: "Confirm",
    }];

    return context;
  }

  /**
   * Gère la soumission du formulaire.
   * @this {HealFormulaDialog}
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
class HealFormulaModel extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      formula: new foundry.data.fields.StringField({
        required: true,
        initial: "2d4",
        label: "DND.DIALOG.FORMULA",
      }),
      healType: new StringField({
        required: true,
        choices: Object.keys(STATIC_CONFIG.healingTypes),
      }),
      average: new BooleanField({
        label: "DND.DIALOG.AVERAGE",
      }),
      extended: new BooleanField({
        label: "DND.DIALOG.EXTENDED",
      }),
    };
  }
}