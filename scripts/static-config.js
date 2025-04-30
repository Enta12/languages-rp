// Configuration statique pour remplacer les dépendances à DnD5e
export const STATIC_CONFIG = {
  abilities: {
    str: { label: "Force" },
    dex: { label: "Dextérité" },
    con: { label: "Constitution" },
    int: { label: "Intelligence" },
    wis: { label: "Sagesse" },
    cha: { label: "Charisme" }
  },
  skills: {
    acr: { label: "Acrobaties" },
    ani: { label: "Dressage" },
    arc: { label: "Arcanes" },
    ath: { label: "Athlétisme" },
    dec: { label: "Tromperie" },
    his: { label: "Histoire" },
    ins: { label: "Intuition" },
    itm: { label: "Intimidation" },
    inv: { label: "Investigation" },
    med: { label: "Médecine" },
    nat: { label: "Nature" },
    prc: { label: "Perception" },
    prf: { label: "Représentation" },
    per: { label: "Persuasion" },
    rel: { label: "Religion" },
    slt: { label: "Escamotage" },
    ste: { label: "Discrétion" },
    sur: { label: "Survie" }
  },
  damageTypes: {
    acid: { label: "Acide" },
    bludgeoning: { label: "Contondant" },
    cold: { label: "Froid" },
    fire: { label: "Feu" },
    force: { label: "Force" },
    lightning: { label: "Foudre" },
    necrotic: { label: "Nécrotique" },
    piercing: { label: "Perforant" },
    poison: { label: "Poison" },
    psychic: { label: "Psychique" },
    radiant: { label: "Radiant" },
    slashing: { label: "Tranchant" },
    thunder: { label: "Tonnerre" }
  },
  healingTypes: {
    healing: { label: "Soins" },
    temphp: { label: "PV temporaires" }
  },
  conditionTypes: {
    blinded: { label: "Aveuglé", reference: true },
    charmed: { label: "Charmé", reference: true },
    deafened: { label: "Assourdi", reference: true },
    exhaustion: { label: "Épuisement", reference: true },
    frightened: { label: "Effrayé", reference: true },
    grappled: { label: "Agrippé", reference: true },
    incapacitated: { label: "Incapable d'agir", reference: true },
    invisible: { label: "Invisible", reference: true },
    paralyzed: { label: "Paralysé", reference: true },
    petrified: { label: "Pétrifié", reference: true },
    poisoned: { label: "Empoisonné", reference: true },
    prone: { label: "À terre", reference: true },
    restrained: { label: "Entravé", reference: true },
    stunned: { label: "Étourdi", reference: true },
    unconscious: { label: "Inconscient", reference: true }
  },
  rules: {
    cover: { label: "Abri", reference: true },
    vision: { label: "Vision", reference: true },
    inspiration: { label: "Inspiration", reference: true },
    advantage: { label: "Avantage", reference: true },
    disadvantage: { label: "Désavantage", reference: true },
    concentration: { label: "Concentration", reference: true }
  },
  weaponMasteries: {
    sim: { label: "Armes simples" },
    mar: { label: "Armes de guerre" }
  },
  areaTargetTypes: {
    cone: { label: "Cône" },
    cube: { label: "Cube" },
    cylinder: { label: "Cylindre" },
    line: { label: "Ligne" },
    sphere: { label: "Sphère" }
  },
  itemProperties: {
    ada: { label: "Adamantium", reference: true },
    amm: { label: "Munitions", reference: true },
    fin: { label: "Finesse", reference: true },
    fir: { label: "Tir", reference: true },
    foc: { label: "Focus", reference: true },
    hvy: { label: "Lourd", reference: true },
    lgt: { label: "Léger", reference: true },
    lod: { label: "Chargement", reference: true },
    mgc: { label: "Magique", reference: true },
    rch: { label: "Allonge", reference: true },
    rel: { label: "Rechargement", reference: true },
    ret: { label: "Lancer", reference: true },
    sil: { label: "Argent", reference: true },
    spc: { label: "Spécial", reference: true },
    thr: { label: "Lancer", reference: true },
    two: { label: "Deux mains", reference: true },
    ver: { label: "Versatile", reference: true }
  },
  creatureTypes: {
    aberration: { label: "Aberration", reference: true },
    beast: { label: "Bête", reference: true },
    celestial: { label: "Céleste", reference: true },
    construct: { label: "Artificiel", reference: true },
    dragon: { label: "Dragon", reference: true },
    elemental: { label: "Élémentaire", reference: true },
    fey: { label: "Fée", reference: true },
    fiend: { label: "Fiélon", reference: true },
    giant: { label: "Géant", reference: true },
    humanoid: { label: "Humanoïde", reference: true },
    monstrosity: { label: "Monstruosité", reference: true },
    ooze: { label: "Vase", reference: true },
    plant: { label: "Plante", reference: true },
    undead: { label: "Mort-vivant", reference: true }
  },
  trackableAttributes: {
    movement: {
      land: { label: "Terrestre" },
      water: { label: "Aquatique" },
      air: { label: "Aérienne" }
    }
  }
};

export const dnd5eUtilities = {
  dataModels: {
    fields: {
      FormulaField: class {
        constructor(options = {}) {
          this.options = options;
        }
      }
    }
  },
  documents: {
    Trait: {
      async choices(traitType) {
        if (traitType === "tool") {
          return {
            alchemist: "Matériel d'alchimiste",
            brewer: "Matériel de brasseur",
            calligrapher: "Matériel de calligraphe",
            carpenter: "Outils de charpentier",
            cartographer: "Outils de cartographe",
            cobbler: "Outils de cordonnier",
            cook: "Ustensiles de cuisine",
            glassblower: "Outils de souffleur de verre",
            jeweler: "Outils de joaillier",
            leatherworker: "Outils de tanneur",
            mason: "Outils de maçon",
            painter: "Matériel de peintre",
            potter: "Outils de potier",
            smith: "Outils de forgeron",
            tinker: "Outils de bricoleur",
            weaver: "Métier à tisser",
            woodcarver: "Outils de sculpteur sur bois"
          };
        }
        return {};
      },
      keyLabel(key) {
        return key.split(":")[1] || key;
      }
    }
  }
}; 