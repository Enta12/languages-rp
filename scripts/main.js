import { addActorDirectoryContextMenu } from "./actor-languages.js";
import "./text.js/language-headers.js";
import { encryptText, decryptText } from "./text.js/encryption.js";

export const MODULE_ID = "languages-rp-fork";

function addLanguageHeaders(html) {
  const actor = game.user.character;
  if (!actor) {
    return;
  }
  const knownLanguages = {};
  if (actor.system.traits && actor.system.traits.languages) {
    const languages = actor.system.traits.languages.value || [];
    const custom = actor.system.traits.languages.custom || "";
    languages.forEach((lang) => {
      const langName = CONFIG.DND5E.languages[lang] || lang;
      knownLanguages[langName.toLowerCase()] = { level: game.i18n.localize("languages-rp-fork.proficiencyLevels.native") };
    });
    custom.split(";").forEach((lang) => {
      const trimmed = lang.trim();
      if (trimmed) {
        const match = trimmed.match(/(.+)\s*\(([^)]+)\)$/);
        if (match) {
          const langName = match[1].trim();
          const level = match[2].trim().toLowerCase();
          knownLanguages[langName.toLowerCase()] = { level };
        } else {
          knownLanguages[trimmed.toLowerCase()] = { level: game.i18n.localize("languages-rp-fork.proficiencyLevels.native") };
        }
      }
    });
  }
  const availableLanguages =
    game.settings.get(MODULE_ID, "availableLanguages") || {};
  let langElements = html.find(".language-text");
  langElements.each((i, el) => {
    const element = $(el);
    const language = element.data("language");
    if (element.data("header-added")) return;
    element.data("header-added", true);
    element.wrap('<div class="language-block-container"></div>');
    let proficiencyLevel = game.i18n.localize("languages-rp-fork.ui.noLevel");
    let headerColor = "#777777";
    if (language && knownLanguages[language.toLowerCase()]) {
      proficiencyLevel = knownLanguages[language.toLowerCase()].level;
      const proficiencyLevels =
        game.settings.get(MODULE_ID, "proficiencyLevels") || {};
      const levelConfig = proficiencyLevels[proficiencyLevel] || {};
      if (levelConfig.color) {
        headerColor = levelConfig.color;
      }
      element.addClass("known-language");
      element.data("original-encrypted", element.text());
      const langData = availableLanguages[language];
      if (langData && typeof langData === "object" && langData.font) {
        const langId = language.toLowerCase().replace(/\s+/g, "-");
        element.addClass(`lang-font-${langId}`);
      }
      element.off("click").on("click", function () {
        const $this = $(this);
        if ($this.hasClass("decrypted")) {
          $this.text($this.data("original-encrypted"));
          $this.removeClass("decrypted");
        } else {
          const encryptedText =
            $this.data("original-encrypted") || $this.text();
          const decryptedText = decryptText(
            encryptedText,
            language,
            proficiencyLevel
          );
          $this.text(decryptedText);
          $this.addClass("decrypted");
          $this.attr("data-proficiency-level", proficiencyLevel);
        }
      });
    }
    const headerText = `${language} - ${proficiencyLevel}`;
    const header = $(
      `<div class="language-header" style="background-color: ${headerColor};">${headerText}</div>`
    );
    element.parent().prepend(header);
  });
}

Hooks.on("getActorDirectoryEntryContext", addActorDirectoryContextMenu);

Hooks.on("renderJournalSheet", (_, html) => {
  addLanguageHeaders(html);
});
Hooks.on("renderChatMessage", (_, html) => {
  addLanguageHeaders(html);
});
Hooks.on("renderActorSheet", (_, html) => {
  addLanguageHeaders(html);
});
Hooks.on("renderItemSheet", (_, html) => {
  addLanguageHeaders(html);
});
Hooks.once("init", () => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = `modules/${MODULE_ID}/styles/main.css`;
  document.head.appendChild(link);

  Hooks.once("ready", () => {
    const dynamicStyle = document.createElement("style");
    dynamicStyle.id = "language-proficiency-levels-styles";
    dynamicStyle.textContent = generateProficiencyLevelStyles();
    document.head.appendChild(dynamicStyle);
    loadLanguageFonts();
    const proficiencyLevels =
      game.settings.get(MODULE_ID, "proficiencyLevels") || {};
    const defaultLevels = {
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.beginner")]: { value: 0.15, color: "#d9c060" },
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.intermediate")]: { value: 0.35, color: "#bcc060" },
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.advanced")]: { value: 0.6, color: "#9cc060" },
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.native")]: { value: 1.0, color: "#60c070" },
    };
    let needsUpdate = false;
    Object.entries(proficiencyLevels).forEach(([name, data]) => {
      if (typeof data === "object" && !data.color) {
        const defaultData = defaultLevels[name];
        if (defaultData && defaultData.color) {
          proficiencyLevels[name].color = defaultData.color;
        } else {
          const hue = 60 + data.value * 60;
          proficiencyLevels[name].color = hslToHex(hue, 0.7, 0.7);
        }
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      game.settings.set(MODULE_ID, "proficiencyLevels", proficiencyLevels);
    }
  });

  function generateProficiencyLevelStyles() {
    const proficiencyLevels = game.settings.get(
      MODULE_ID,
      "proficiencyLevels"
    ) || {
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.beginner")]: { value: 0.15, color: "#d9c060" },
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.intermediate")]: { value: 0.35, color: "#bcc060" },
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.advanced")]: { value: 0.6, color: "#9cc060" },
      [game.i18n.localize("languages-rp-fork.proficiencyLevels.native")]: { value: 1.0, color: "#60c070" },
    };
    const sortedLevels = Object.entries(proficiencyLevels).sort(
      ([, a], [, b]) => {
        const valueA = typeof a === "object" ? a.value : a;
        const valueB = typeof b === "object" ? b.value : b;
        return valueA - valueB;
      }
    );
    let levelStyles = "";
    sortedLevels.forEach(([name, data]) => {
      const value = typeof data === "object" ? data.value : data;
      const color = typeof data === "object" ? data.color : null;
      const backgroundColor = color || `hsl(${60 + value * 60}, 70%, 85%)`;
      const borderColor = color || `hsl(${60 + value * 60}, 70%, 55%)`;
      const rgbaBackground = hexToRgba(backgroundColor, 0.1);
      const rgbaBorder = hexToRgba(borderColor, 0.8);
      levelStyles += `
    .language-text.decrypted[data-proficiency-level="${name}"] {
      background-color: ${rgbaBackground} !important;
      border-bottom: 1px dotted ${rgbaBorder} !important;
      color: inherit !important;
    }`;
    });

    const styleElement =
      document.getElementById("language-proficiency-styles") ||
      document.createElement("style");
    styleElement.id = "language-proficiency-styles";
    styleElement.textContent = levelStyles;
    if (!document.getElementById("language-proficiency-styles")) {
      document.head.appendChild(styleElement);
    }
    return levelStyles;
  }

  function loadLanguageFonts() {
    const availableLanguages =
      game.settings.get(MODULE_ID, "availableLanguages") || {};
    const styleElement = document.createElement("style");
    let styleContent = "";
    Object.entries(availableLanguages).forEach(([langName, langData]) => {
      if (typeof langData === "object" && langData.font) {
        const font = langData.font;
        const fontName = font.split("/").pop().split(".")[0];
        const langId = langName.toLowerCase().replace(/\s+/g, "-");
        styleContent += `
          @font-face {
            font-family: "${fontName}";
            src: url("${font}");
          }
          .lang-font-${langId} {
            font-family: "${fontName}", sans-serif !important;
          }
        `;
        try {
          const fontFace = new FontFace(fontName, `url("${font}")`);
          fontFace
            .load()
            .then((loaded) => {
              document.fonts.add(loaded);
            })
            .catch((err) => {
              console.error(
                `Erreur lors du chargement de la police ${font}:`,
                err
              );
            });
        } catch (err) {
          console.error(
            `Erreur lors de la création de la police ${font}:`,
            err
          );
        }
      }
    });

    if (styleContent && !document.getElementById("language-fonts-styles")) {
      styleElement.id = "language-fonts-styles";
      styleElement.textContent = styleContent;
      document.head.appendChild(styleElement);
    }
  }

  function hexToRgba(hex, alpha = 1) {
    if (hex.startsWith("rgba") || hex.startsWith("rgb")) {
      return hex;
    }
    if (hex.startsWith("hsl")) {
      const hslMatch = hex.match(
        /hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/
      );
      if (hslMatch) {
        const h = parseInt(hslMatch[1], 10);
        const s = parseInt(hslMatch[2], 10) / 100;
        const l = parseInt(hslMatch[3], 10) / 100;
        hex = hslToHex(h, s, l);
      }
    }
    const namedColors = {
      red: "#ff0000",
      green: "#00ff00",
      blue: "#0000ff",
      yellow: "#ffff00",
      cyan: "#00ffff",
      magenta: "#ff00ff",
      black: "#000000",
      white: "#ffffff",
      gray: "#808080",
    };
    if (namedColors[hex.toLowerCase()]) {
      hex = namedColors[hex.toLowerCase()];
    }
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Converts HSL color values to HEX format.
   * @param {number} hue - Hue (0–360)
   * @param {number} saturation - Saturation (0–1)
   * @param {number} lightness - Lightness (0–1)
   * @returns {string} - HEX color string (e.g., "#ff00ff")
   */
  function hslToHex(hue, saturation, lightness) {
    hue = ((hue % 360) + 360) % 360;
    const hueToRgb = (min, max, hueOffset) => {
      if (hueOffset < 0) hueOffset += 1;
      if (hueOffset > 1) hueOffset -= 1;
      if (hueOffset < 1 / 6) return min + (max - min) * 6 * hueOffset;
      if (hueOffset < 1 / 2) return max;
      if (hueOffset < 2 / 3) return min + (max - min) * (2 / 3 - hueOffset) * 6;
      return min;
    };
    const max =
      lightness < 0.5
        ? lightness * (1 + saturation)
        : lightness + saturation - lightness * saturation;
    const min = 2 * lightness - max;
    const [r, g, b] =
      saturation === 0
        ? [lightness, lightness, lightness]
        : [
            hueToRgb(min, max, hue / 360 + 1 / 3),
            hueToRgb(min, max, hue / 360),
            hueToRgb(min, max, hue / 360 - 1 / 3),
          ];
    const toHex = (value) =>
      Math.round(value * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  CONFIG.TextEditor.enrichers.push({
    pattern: /&Languages\[([^\]]+)\]([^&]+)(?:&EndLanguages\[\1\])?/g,
    enricher: (match, options) => {
      const language = match[1];
      const text = match[2];
      const languagesData =
        game.settings.get(MODULE_ID, "availableLanguages") || {};
      const langData = languagesData[language] || {
        key: "abcdefghijklmnopqrstuvwxyz",
      };
      const encryptedText = encryptText(text, language);
      const span = document.createElement("span");
      span.classList.add("language-text");
      span.dataset.language = language;
      span.dataset.originalText = text; // Stocker le texte original
      span.dataset.encryptedText = encryptedText; // Stocker le texte chiffré
      span.textContent = encryptedText;
      if (typeof langData === "object" && langData.font) {
        const langId = language.toLowerCase().replace(/\s+/g, "-");
        span.classList.add(`lang-font-${langId}`);
      }
      const tooltip = document.createElement("div");
      tooltip.classList.add("language-tooltip");
      tooltip.textContent = language;
      span.appendChild(tooltip);
      span.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
      });
      span.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
      return span;
    },
  });

  CONFIG.TextEditor.enrichers.push({
    pattern:
      /<div[^>]*class="language-container"[^>]*data-language="([^"]+)"[^>]*>.*?<span[^>]*class="language-content"[^>]*>(.*?)<\/span>.*?<\/div>/gs,
    enricher: (match) => {
      const language = match[1];
      const text = match[2];
      const languagesData =
        game.settings.get(MODULE_ID, "availableLanguages") || {};
      const langData = languagesData[language] || {
        key: "abcdefghijklmnopqrstuvwxyz",
      };
      const encryptedText = encryptText(text, language);
      const span = document.createElement("span");
      span.classList.add("language-text");
      span.dataset.language = language;
      span.dataset.originalText = text;
      span.dataset.encryptedText = encryptedText;
      span.textContent = encryptedText;
      if (typeof langData === "object" && langData.font) {
        const langId = language.toLowerCase().replace(/\s+/g, "-");
        span.classList.add(`lang-font-${langId}`);
      }
      const tooltip = document.createElement("div");
      tooltip.classList.add("language-tooltip");
      tooltip.textContent = language;
      tooltip.style.position = "absolute";
      tooltip.style.bottom = "100%";
      tooltip.style.left = "0";
      tooltip.style.backgroundColor = "rgba(0,0,0,0.8)";
      tooltip.style.color = "white";
      tooltip.style.padding = "2px 5px";
      tooltip.style.borderRadius = "3px";
      tooltip.style.fontSize = "12px";
      tooltip.style.display = "none";
      span.appendChild(tooltip);
      span.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
      });
      span.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });
      return span;
    },
  });
});
