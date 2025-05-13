export const MODULE_ID = "languages-rp";


Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "lastSeenVersion", {
    name: game.i18n.localize("languages-rp.updates.version.name"),
    hint: game.i18n.localize("languages-rp.updates.version.hint"),
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
});

Hooks.on("ready", () => {
  console.log("Languages RP is ready");
  const CURRENT_VERSION = game.modules.get(MODULE_ID).version;
  const lastVersion = game.settings.get(MODULE_ID, "lastSeenVersion");

  if (lastVersion !== CURRENT_VERSION) {
    const updateData = game.i18n.translations["languages-rp"]?.updates || {};
    let contentHTML = "";
    
    if (updateData.content && Array.isArray(updateData.content)) {
      updateData.content.forEach(section => {
        if (section.title) {
          contentHTML += `<h2>${section.title}</h2>`;
          
          if (section.list && Array.isArray(section.list)) {
            contentHTML += "<ul>";
            section.list.forEach(item => {
              contentHTML += `<li>${item}</li>`;
            });
            contentHTML += "</ul>";
          }
        }
      });
    }

    new Dialog({
      title: updateData.title || `${CURRENT_VERSION}`,
      content: contentHTML,
      buttons: {
        ok: {
          label: "OK",
          callback: () => {
            game.settings.set(MODULE_ID, "lastSeenVersion", CURRENT_VERSION);
          }
        }
      }
    }).render(true);
  }
});

