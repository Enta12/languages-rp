//region Constantes

import DamageFormulaDialog from "./applications/damage-formula.js";
import AttackFormulaDialog from "./applications/attack-formula.js";
import CheckFormulaDialog from "./applications/check-formula.js";
import SaveFormulaDialog from "./applications/save-formula.js";
import HealFormulaDialog from "./applications/heal-formula.js";
import LookupFormulaDialog from "./applications/lookup-formula.js";
import RuleFormulaDialog from "./applications/rule-formula.js";
import ConditionFormulaDialog from "./applications/condition-formula.js";
import { STATIC_CONFIG } from "./static-config.js";

// Configuration des menus - structure harmonisée
const MENU_CONFIGS = {
  saves: {
    source: 'abilities',
    reference: false,
    dialogHandler: 'save'
  },
  checks: {
    source: {
      abilities: 'abilities',
      skills: 'skills'
    },
    reference: false,
    dialogHandler: 'check'
  },
  damage: {
    source: 'damageTypes',
    reference: false,
    dialogHandler: 'damage'
  },
  attack: {
    source: null,
    reference: false,
    dialogHandler: 'attack'
  },
  heal: {
    source: 'healingTypes',
    reference: false,
    dialogHandler: 'heal'
  },
  conditionTypes: {
    source: 'conditionTypes',
    reference: true,
    dialogHandler: 'condition'
  },
  lookup: {
    source: null,
    reference: false,
    dialogHandler: 'lookup'
  },
  rules: {
    source: 'rules',
    reference: true,
    dialogHandler: 'rule'
  },
  weaponMasteries: {
    source: 'weaponMasteries',
    reference: true,
    dialogHandler: null
  },
  areaTargetTypes: {
    source: 'areaTargetTypes',
    reference: true,
    dialogHandler: null
  },
  itemProperties: {
    source: 'itemProperties',
    reference: true,
    dialogHandler: null
  },
  abilities: {
    source: 'abilities',
    reference: true,
    dialogHandler: null
  },
  skills: {
    source: 'skills',
    reference: true,
    dialogHandler: null
  },
  damageTypes: {
    source: 'damageTypes',
    reference: true,
    dialogHandler: null
  },
  creatureTypes: {
    source: 'creatureTypes',
    reference: true,
    dialogHandler: null
  }
};

// Configuration des blocs de style
const STYLE_BLOCKS = {
  advice: { class: 'fvtt advice', icon: 'icons/vtt-512.png' },
  quest: { class: 'fvtt quest', icon: 'icons/magic/symbols/question-stone-yellow.webp' },
  treasure: { class: 'fvtt quest', icon: 'icons/containers/chest/chest-wooden-tied-white.webp' },
  narrative: { class: 'fvtt narrative', type: 'div' },
  notable: { class: 'notable', type: 'aside' }
};

const MODULE_ID = "languages-rp-fork";

//region Hook
// Hook principal qui s'exécute lors de l'initialisation des menus ProseMirror
Hooks.on("getProseMirrorMenuDropDowns", (proseMirrorMenu, dropdowns) => {
  // Fonction pour insérer du texte dans l'éditeur
  const insertText = (text) => {
    if (!text) return;
    proseMirrorMenu.view.dispatch(
      proseMirrorMenu.view.state.tr.insertText(text).scrollIntoView()
    );
  };

  // Fonctions d'insertion pour les références et dialogues
  const insertions = {
    reference: (item, category) => {
      const reference = category === 'weaponMasteries' ? `weaponMastery=${item}` : item;
      insertText(`&Reference[${reference}]`);
    },

    // Dialogue pour les états
    condition: async (conditionId) => {
      const options = conditionId ? { initialData: { condition: conditionId } } : {};
      const text = await ConditionFormulaDialog.create(options);
      if (text) insertText(text);
    },

    // Dialogue pour les jets de sauvegarde
    save: async (abilityId) => {
      const options = abilityId ? { defaultAbility: abilityId } : {};
      const text = await SaveFormulaDialog.create(options);
      if (text) insertText(text);
    },

    // Dialogue pour les jets d'opposition
    check: async (skillOrAbility) => {
      const options = skillOrAbility ? { defaultType: skillOrAbility } : {};
      const text = await CheckFormulaDialog.create(options);
      if (text) insertText(text);
    },

    // Dialogue pour les dégâts
    damage: async (damageType) => {
      const options = damageType ? { defaultType: damageType } : {};
      const text = await DamageFormulaDialog.create(options);
      if (text) insertText(text);
    },

    // Dialogue pour les attaques
    attack: async () => {
      const text = await AttackFormulaDialog.create();
      if (text) insertText(text);
    },

    // Dialogue pour les soins
    heal: async (healType) => {
      const options = healType ? { defaultType: healType } : {};
      const text = await HealFormulaDialog.create(options);
      if (text) insertText(text);
    },

    rule: async () => {
      const text = await RuleFormulaDialog.create();
      if (text) insertText(text);
    },

    // Dialogue pour les lookups
    lookup: async () => {
      const text = await LookupFormulaDialog.create();
      if (text) insertText(text);
    },
  };


  // Fonction pour créer les entrées de menu en fonction de la catégorie et de la configuration
  const createMenuEntries = (category, config) => {
    // Cas spécial pour les jets de sauvegarde
    if (category === 'saves') {
      return Object.keys(STATIC_CONFIG[config.source] || {})
        .map(item => ({
          title: STATIC_CONFIG[config.source][item]?.label || item,
          action: item,
          cmd: () => insertions.save(item)
        }));
    }

    // Cas spécial pour les tests de caractéristiques et compétences
    if (category === 'checks') {
      return [
        ...Object.keys(STATIC_CONFIG[config.source.abilities] || {}).map(ability => ({
          title: STATIC_CONFIG[config.source.abilities][ability]?.label || ability,
          action: ability,
          cmd: () => insertions.check(ability)
        })),
        ...Object.keys(STATIC_CONFIG[config.source.skills] || {}).map(skill => ({
          title: STATIC_CONFIG[config.source.skills][skill]?.label || skill,
          action: skill,
          cmd: () => insertions.check(skill)
        }))
      ];
    }

    // Cas pour les dégâts
    if (category === 'damage') {
      return Object.keys(STATIC_CONFIG[config.source] || {})
        .map(item => ({
          title: STATIC_CONFIG[config.source][item]?.label || item,
          action: item,
          cmd: () => insertions.damage(item)
        }));
    }

    // Cas pour les soins
    if (category === 'heal') {
      return Object.keys(STATIC_CONFIG[config.source] || {})
        .map(item => ({
          title: STATIC_CONFIG[config.source][item]?.label || item,
          action: item,
          cmd: () => insertions.heal(item)
        }));
    }

    // Cas standard pour les références
    return Object.keys(STATIC_CONFIG[config.source] || {})
      .filter(item => !config.reference || STATIC_CONFIG[config.source][item]?.reference)
      .map(item => ({
        title: STATIC_CONFIG[config.source][item]?.label || item,
        action: item,
        cmd: () => insertions.reference(item, category)
      }));
  };

  // Fonction pour créer des entrées de menu pour les blocs de style
  const createStyleEntry = (type, config) => {
    if (config.type) {
      // Bloc de style avec un type spécifique
      return {
        title: game.i18n.localize(`DND.MENU.STYLE.${type.toUpperCase()}`),
        action: type,
        node: proseMirrorMenu.schema.nodes[config.type],
        attrs: { class: config.class },
        cmd: () => proseMirrorMenu._toggleBlock(
          proseMirrorMenu.schema.nodes[config.type],
          foundry.prosemirror.commands.wrapIn,
          { attrs: { _preserve: { class: config.class } } }
        )
      };
    }

    // Bloc de style avec icône et du contenu
    return {
      title: game.i18n.localize(`DND.MENU.STYLE.${type.toUpperCase()}`),
      action: type,
      cmd: () => {
        const schema = proseMirrorMenu.schema;
        const divNode = schema.nodes.div.create(
          { _preserve: { class: config.class } },
          [
            schema.nodes.figure.create(
              { _preserve: { class: 'icon' } },
              [schema.nodes.image.create({ src: config.icon, _preserve: { class: 'round' } })]
            ),
            schema.nodes.article.create(null, [
              schema.nodes.heading.create(
                { level: 4 },
                schema.text(game.i18n.localize(`DND.MENU.STYLE.${type.toUpperCase()}_TITLE`))
              ),
              schema.nodes.paragraph.create(
                null,
                schema.text(game.i18n.localize(`DND.MENU.STYLE.${type.toUpperCase()}_CONTENT`))
              )
            ])
          ]
        );
        proseMirrorMenu.view.dispatch(
          proseMirrorMenu.view.state.tr.replaceSelectionWith(divNode)
        );
        return true;
      }
    };
  };

  // Filtre les menus activés en fonction des paramètres utilisateur
  const enabledMenus = Object.entries(MENU_CONFIGS)
    .filter(([key]) => game.settings.get(MODULE_ID, `show${key}`));

  //region Menu final
  dropdowns.dndeasyreference = {
    action: 'reference',
    title: '<i class="fa-solid fa-books"></i>', // Icône FontAwesome
    entries: [
      // Entrées de menu pour les dialogues
      ...enabledMenus
        .filter(([_, config]) => config.dialogHandler)
        .map(([key, config]) => ({
          title: game.i18n.localize(`DND.MENU.${key.toUpperCase()}.TITLE`),
          action: `${key}-dialog`,
          cmd: () => insertions[config.dialogHandler]()
        })),

      // Entrées de menu pour les catégories avec sous-menus
      ...enabledMenus
        .filter(([_, config]) => !config.dialogHandler && config.source)
        .map(([key, config]) => ({
          title: game.i18n.localize(`DND.MENU.${key.toUpperCase()}.TITLE`),
          action: key,
          children: createMenuEntries(key, config)
        })),

      // Menu des styles
      {
        title: game.i18n.localize('DND.MENU.STYLE.TITLE'),
        action: 'styles',
        children: Object.entries(STYLE_BLOCKS).map(([type, config]) =>
          createStyleEntry(type, config)
        )
      }
    ]
  };
});