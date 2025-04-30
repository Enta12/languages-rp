const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { StringField } = foundry.data.fields;
import { STATIC_CONFIG } from "../static-config.js";

/**
 * @typedef {object} RuleConfig
 * @property {string} rule     La règle sélectionnée.
 */

export default class RuleFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["rule-formula-dialog"],
    tag: "form",
    form: {
      handler: RuleFormulaDialog.handleFormSubmit,
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
    }
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    config: {
      template: "modules/dnd-easy-reference/templates/rule/config.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  }

  /* -------------------------------------------------- */

  /**
   * Modèle de données.
   * @type {RuleFormulaModel}
   */
  #model = new RuleFormulaModel();

  /* -------------------------------------------------- */

  /**
   * Configuration résultante.
   * @type {object|null}
   */
  #config = null;
  get config() {
    return this.#config;
  }

  /* -------------------------------------------------- */

  /**
   * Texte à injecter.
   * @type {string|null}
   */
  get #text() {
    if (!this.#model.rule) return null;
    return `&Reference[${this.#model.rule}]`;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    const rulesConfig = STATIC_CONFIG.rules || {};

    const rules = Object.keys(rulesConfig).map(key => ({
      value: key,
      label: rulesConfig[key]?.label || key
    }));

    context.rule = {
      field: this.#model.schema.getField("rule"),
      value: this.#model.rule,
      choices: rules,
      placeholder: game.i18n.localize("DND.DIALOG.PLACEHOLDER")
    };

    context.buttons = [{
      type: "submit",
      icon: "fa-solid fa-check",
      label: "Confirm",
    }];

    return context;
  }

  /* -------------------------------------------------- */
  /* Gestionnaires d'événements                     */
  /* -------------------------------------------------- */

  /**
   * Gère la soumission du formulaire.
   * @this {RuleFormulaDialog}
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
        this.close();
        break;
    }
  }

  /* -------------------------------------------------- */
  /* Méthodes d'usine                               */
  /* -------------------------------------------------- */

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

/* -------------------------------------------------- */

/**
 * Modèle de données utilitaire. */
class RuleFormulaModel extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    const rules = STATIC_CONFIG.rules || {};
    const ruleKeys = Object.keys(rules);
    const initialRule = ruleKeys.length > 0 ? ruleKeys[0] : null;

    return {
      rule: new StringField({
        label: "DND.DIALOG.RULES_SEARCH",
        required: true,
        initial: "",
        blank: true,
        choices: () => {
          return Object.keys(rules).reduce((acc, key) => {
            acc[key] = rules[key]?.label || key;
            return acc;
          }, {});
        }
      })
    };
  }
}