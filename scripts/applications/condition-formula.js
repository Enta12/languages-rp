const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { StringField, BooleanField } = foundry.data.fields;
import { STATIC_CONFIG } from "../static-config.js";

/**
 * @typedef {object} ConditionConfig
 * @property {string} condition   L'ID de la condition sélectionnée.
 * @property {boolean} apply      Indique si le bouton appliquer doit être affiché.
 */

export default class ConditionFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["condition-formula-dialog"],
    tag: "form",
    form: {
      handler: ConditionFormulaDialog.handleFormSubmit,
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
      template: "modules/dnd-easy-reference/templates/condition/config.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  }

  /* -------------------------------------------------- */

  /**
   * Modèle de données.
   * @type {ConditionFormulaModel}
   */
  #model = new ConditionFormulaModel();

  /* -------------------------------------------------- */

  /**
   * Configuration résultante.
   * @type {string|null}
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
    if (!this.#model.condition) return null;

    let command = `&Reference[${this.#model.condition}`;

    if (!this.#model.apply) {
      command += ` apply=false`;
    }

    command += `]`;
    return command;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    const conditionChoices = Object.entries(STATIC_CONFIG.conditionTypes ?? {})
      .reduce((acc, [id, info]) => {
        acc[id] = info.label;
        return acc;
      }, {});

    context.condition = {
      field: this.#model.schema.getField("condition"),
      value: this.#model.condition,
      choices: conditionChoices,
      label: game.i18n.localize("DND.MENU.CONDITIONTYPES.TITLE"),
      placeholder: game.i18n.localize("DND.DIALOG.PLACEHOLDER")
    };

    context.apply = {
      field: this.#model.schema.getField("apply"),
      value: this.#model.apply,
      label: game.i18n.localize("DND.DIALOG.APPLY")
    };

    context.buttons = [{
      type: "submit",
      icon: "fa-solid fa-check",
      label: game.i18n.localize("DND.DIALOG.CONFIRM"),
    }];

    return context;
  }

  /* -------------------------------------------------- */
  /* Gestionnaires d'événements                      */
  /* -------------------------------------------------- */

  /**
   * Gère la soumission du formulaire.
   * @this {ConditionFormulaDialog}
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
        if (!this.#model.condition) {
          ui.notifications.warn(game.i18n.localize("DND.DIALOG.CONDITION.WARN_NO_CONDITION"));
          return;
        }
        this.#config = this.#text;
        if (this.callback) this.callback(this.#config);
        this.close();
        break;
    }
  }

  /* -------------------------------------------------- */
  /* Méthodes d'usine                                */
  /* -------------------------------------------------- */

  /**
   * Constructeur.
   * @param {object} data
   */
  constructor(data) {
    super(data);
    this.callback = data.callback;
  }

  /**
   * Crée une instance de l'application.
   * @param {object} [options]
   * @returns {Promise<string|null>}
   */
  static async create(options = {}) {
    const { promise, resolve } = Promise.withResolvers();
    const application = new this({ ...options, callback: resolve });
    if (options.initialData) {
      application.#model.updateSource(options.initialData);
    }
    application.render({ force: true });
    application.addEventListener("close", (event) => {
      if (application.config === null) {
        resolve(null);
      }
    }, { once: true });
    return promise;
  }
}

/* -------------------------------------------------- */

/**
 * Modèle de données utilitaire.
 */
class ConditionFormulaModel extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    const conditionIds = Object.entries(STATIC_CONFIG.conditionTypes ?? {})
      .filter(([key, data]) => data?.reference)
      .map(([key, _]) => key);

    const initialCondition = conditionIds.length > 0 ? conditionIds[0] : "";

    return {
      condition: new StringField({
        required: true,
        blank: false,
        initial: initialCondition,
        choices: conditionIds,
        label: "DND.CONDITIONTYPES.TITLE",
        validate: value => {
          const conditionIds = Object.entries(STATIC_CONFIG.conditionTypes ?? {})
            .map(([id]) => id);
          return conditionIds.includes(value);
        }
      }),
      apply: new BooleanField({
        required: true,
        initial: true,
        label: "DND.DIALOG.CONFIRM"
      })
    };
  }
}