const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
const { ArrayField, BooleanField, SchemaField, SetField, StringField } = foundry.data.fields;
import { STATIC_CONFIG, dnd5eUtilities } from "../static-config.js";

/**
 * @typedef {object} DamageConfig
 * @property {string} formula     La formule de dégâts.
 * @property {string[]} types     Les types de dégâts.
 */

export default class DamageFormulaDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["damage-formula-dialog"],
    tag: "form",
    form: {
      handler: DamageFormulaDialog.handleFormSubmit,
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
      addPart: DamageFormulaDialog.#addPart,
      deletePart: DamageFormulaDialog.#deletePart,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    config: {
      template: "modules/dnd-easy-reference/templates/damage/config.hbs",
    },
    formulas: {
      template: "modules/dnd-easy-reference/templates/damage/formulas.hbs",
      scrollable: [""]
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  }

  /* -------------------------------------------------- */

  /**
   * Modèle de données.
   * @type {DamageFormulaModel}
   */
  #model = new DamageFormulaModel();

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
   * Texte final à injecter.
   * @type {string|null}
   */
  get #text() {
    let parts = [];
    for (const { formula, types } of this.#model.parts) {
      if (!formula) continue;
      const type = types.size ? `type=${Array.from(types).join("|")}` : "";
      parts.push([formula, type].filter(Boolean).join(" "));
    }

    const hasOptions = this.#model.average || this.#model.extended;

    if (!parts.length && !hasOptions) return null;

    let command = parts.length ? parts.join(" & ") : "";

    const options = [
      this.#model.average ? "average" : null,
      this.#model.extended ? "extended" : null,
    ].filter(Boolean);

    if (options.length > 0) {
      if (command) command += " ";
      command += options.join(" ");
    }

    return `[[/damage ${command}]]`;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    const parts = context.parts = [];
    for (const [i, part] of this.#model.parts.entries()) {
      parts.push({
        idx: i,
        rule: i > 0,
        formula: {
          field: this.#model.schema.getField("parts.element.formula"),
          value: part.formula,
          placeholder: game.i18n.localize("DND.DIALOG.FORMULA"),
          name: `parts.${i}.formula`,
        },
        types: {
          field: this.#model.schema.getField("parts.element.types"),
          value: part.types,
          name: `parts.${i}.types`,
        },
      })
    }

    context.average = {
      field: this.#model.schema.getField("average"),
      value: this.#model.average,
    };

    context.extended = {
      field: this.#model.schema.getField("extended"),
      value: this.#model.extended,
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
   * @this {DamageFormulaDialog}
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
        // Le callback (si défini) sera appelé via l'event listener 'close'
        this.close();
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Ajoute une nouvelle partie de dégâts.
   * @this {DamageFormulaDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #addPart(event, target) {
    const parts = this.#model.toObject().parts;
    parts.push({ formula: "", types: [] });
    this.#model.updateSource({ parts });
    this.render({ parts: ["formulas"] });
  }

  /* -------------------------------------------------- */

  /**
   * Supprime une partie de dégâts.
   * @this {DamageFormulaDialog}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #deletePart(event, target) {
    const idx = parseInt(target.dataset.idx);
    const parts = this.#model.toObject().parts;
    parts.splice(idx, 1);
    this.#model.updateSource({ parts });
    this.render({ parts: ["formulas"] });
  }

  /* -------------------------------------------------- */
  /* Méthodes d'usine                               */
  /* -------------------------------------------------- */

  /**
   * Crée et affiche une instance asynchrone de cette application.
   * @param {object} [options]            Options.
   * @returns {Promise<string|null>}      Le texte, ou `null`.
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
 * Modèle de données utilitaire.
 */
class DamageFormulaModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      parts: new ArrayField(new SchemaField({
        formula: new dnd5eUtilities.dataModels.fields.FormulaField({ required: true }),
        types: new SetField(new StringField({
          choices: STATIC_CONFIG.damageTypes,
          initial: []
        }))
      }), { initial: [{ formula: "", types: new Set() }] }),
      average: new BooleanField(),
      extended: new BooleanField()
    };
  }
}