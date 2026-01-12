import { MODULE_ID } from "./main.js";

Hooks.once("init", () => {
    console.log("[Languages-RP] Initialisation du hook getActorContextOptions");
    Hooks.on("getActorContextOptions", addActorDirectoryContextMenu);
  });

function getProficiencyLevels() {
    const proficiencyLevels= game.settings.get(MODULE_ID, 'proficiencyLevels') || {};
    return Object.entries(proficiencyLevels)
        .map(([level, data]) => ({ id: level, label: `${data.name} (${Math.round(data.value * 100)}%)`, value: data.value }))
        .sort((a, b) => a.value - b.value);
}

function addActorDirectoryContextMenu(_, contextOptions) {
    contextOptions.unshift({
        name: game.i18n.localize("languages-rp.ui.manageLanguages"),
        icon: '<i class="fas fa-language"></i>',
        condition: li => {
            const actorId = li.dataset.entryId;
            const actor = game.actors.get(actorId);
            return actor && actor.type === "character" && (game.user.isGM || actor.isOwner);
        },
        callback: li => {
            const actorId = li.dataset.entryId;
            const actor = game.actors.get(actorId);
            if (actor) {
                onLanguagesButtonClick(null, { actor: actor });
            }
        }
    });
}

export async function onLanguagesButtonClick(_, app) {
    const actor = app.actor;
    if (!actor) return;
    const availableLanguages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
    const actorLanguages = actor.getFlag(MODULE_ID, 'languages') || [];
    const languageNames = Object.entries(availableLanguages).map(([id, data]) => ({ id, name: data.name }));
    const availableUnselectedLanguages = languageNames.filter(lang => 
        !actorLanguages.some(actorLang => actorLang.id === lang.id)
    );


    const template = await renderTemplate(`modules/${MODULE_ID}/templates/languages-dialog.html`, {
        actor: actor,
        languages: actorLanguages,
        availableLanguages: languageNames,
        availableUnselectedLanguages,
        proficiencyLevels: getProficiencyLevels()
    });

    new Dialog({
        title: `${game.i18n.localize("languages-rp.ui.languageManagement")} - ${actor.name}`,
        content: template,
        buttons: {
            save: {
                icon: '<i class="fas fa-save"></i>',
                label: game.i18n.localize("languages-rp.ui.save"),
                callback: (html) => saveLanguages(html, actor)
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: game.i18n.localize("languages-rp.ui.cancel")
            }
        },
        render: (html) => {
            html.find('.add-language').click(ev => addLanguage(ev, html));
            html.find('.remove-language').click(ev => removeLanguage(ev));
        }
    }).render(true);
}

function addLanguage(_, html) {
    const availableLanguages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
    const languages = Object.entries(availableLanguages).map(([id, data]) => ({ id, name: data.name }));
    if (languages.length === 0) {
        ui.notifications.warn(game.i18n.localize("languages-rp.notifications.noLanguagesConfigured"));
        return;
    }
    const selectedLanguages = [];
    html.find('.language-item').each((_, el) => {
        const id = $(el).find('.language-id').val();
        if (id) selectedLanguages.push(id);
    });
    const availableUnselectedLanguages = languages.filter(lang => !selectedLanguages.includes(lang.id));
    if (availableUnselectedLanguages.length === 0) {
        ui.notifications.warn(game.i18n.localize("languages-rp.notifications.allLanguagesAssigned"));
        return;
    }
    let languageOptions = '';
    availableUnselectedLanguages.forEach(lang => {
        languageOptions += `<option value="${lang.id}" >${lang.name}</option>`;
    });

    let levelOptions = '';
    const sortedLevels = getProficiencyLevels();
    sortedLevels.forEach((level) => {
        levelOptions += `<option value="${level.id}">${level.label}</option>`;
    });
    
    const templateData = {
        languageOptions: languageOptions,
        levelOptions: levelOptions
    };
    
    renderTemplate(`modules/${MODULE_ID}/templates/partials/language-item.html`, templateData).then(newLanguageHtml => {
        const newLanguage = $(newLanguageHtml);
        html.find('.languages-list').append(newLanguage);
        newLanguage.find('.remove-language').click(ev => removeLanguage(ev));
    });
}

function removeLanguage(event) {
    $(event.currentTarget).closest('.language-item').remove();
}

async function saveLanguages(html, actor) {
    const languages = [];
    html.find('.language-item').each((_, el) => {
        const id = $(el).find('.language-id').val();
        const level = $(el).find('.language-level').val();
        if (id) languages.push({ id, level });
    });
    await actor.setFlag(MODULE_ID, 'languages', languages);
} 