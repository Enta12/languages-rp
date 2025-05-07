export function addActorDirectoryContextMenu(_, contextOptions) {
    contextOptions.push({
        name: "Gérer les langues",
        icon: '<i class="fas fa-language"></i>',
        condition: li => {
            const actorId = li.data("document-id");
            const actor = game.actors.get(actorId);
            return actor && game.user.isGM || actor.isOwner;
        },
        callback: li => {
            const actorId = li.data("document-id");
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
    const availableLanguages = game.settings.get('languages-rp-fork', 'availableLanguages') || {};
    const actorLanguages = actor.getFlag('languages-rp-fork', 'languages') || [];
    
    const languageNames = Object.keys(availableLanguages);
    
    const availableUnselectedLanguages = languageNames.filter(lang => 
        !actorLanguages.some(actorLang => actorLang.name === lang)
    );

    const template = await renderTemplate('modules/languages-rp-fork/templates/languages-dialog.html', {
        actor: actor,
        languages: actorLanguages,
        availableLanguages: languageNames,
        availableUnselectedLanguages: availableUnselectedLanguages
    });

    new Dialog({
        title: `Gestion des langues - ${actor.name}`,
        content: template,
        buttons: {
            save: {
                icon: '<i class="fas fa-save"></i>',
                label: 'Sauvegarder',
                callback: (html) => saveLanguages(html, actor)
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: 'Annuler'
            }
        },
        render: (html) => {
            html.find('.add-language').click(ev => addLanguage(ev, html));
            html.find('.remove-language').click(ev => removeLanguage(ev));
        }
    }).render(true);
}

function addLanguage(_, html) {
    const availableLanguages = game.settings.get('languages-rp-fork', 'availableLanguages') || {};
    const proficiencyLevels = game.settings.get('languages-rp-fork', 'proficiencyLevels') || {};
    
    const languageNames = Object.keys(availableLanguages);
    
    if (languageNames.length === 0) {
        ui.notifications.warn("Aucune langue n'est configurée. Veuillez demander au MJ de configurer les langues disponibles.");
        return;
    }
    
    const selectedLanguages = [];
    html.find('.language-item').each((_, el) => {
        const name = $(el).find('.language-name').val();
        if (name) {
            selectedLanguages.push(name);
        }
    });
    
    const availableUnselectedLanguages = languageNames.filter(lang => !selectedLanguages.includes(lang));
    if (availableUnselectedLanguages.length === 0) {
        ui.notifications.warn("Toutes les langues disponibles ont déjà été attribuées à cet acteur.");
        return;
    }
    
    let languageOptions = '';
    availableUnselectedLanguages.forEach(lang => {
        languageOptions += `<option value="${lang}">${lang}</option>`;
    });

    let levelOptions = '';
    const sortedLevels = Object.entries(proficiencyLevels)
        .sort(([, a], [, b]) => a.value - b.value);
    
    sortedLevels.forEach(([level, data]) => {
        const percentage = Math.round(data.value * 100);
        levelOptions += `<option value="${level}">${level} (${percentage}%)</option>`;
    });
    
    const newLanguage = $(`
        <div class="language-item">
            <select class="language-name">
                <option value="">Sélectionnez une langue</option>
                ${languageOptions}
            </select>
            <select class="language-level">
                ${levelOptions}
            </select>
            <button type="button" class="remove-language"><i class="fas fa-trash"></i></button>
        </div>
    `);
    
    html.find('.languages-list').append(newLanguage);
    newLanguage.find('.remove-language').click(ev => removeLanguage(ev));
}

function removeLanguage(event) {
    $(event.currentTarget).closest('.language-item').remove();
}


async function saveLanguages(html, actor) {
    const languages = [];
    html.find('.language-item').each((_, el) => {
        const name = $(el).find('.language-name').val();
        const level = $(el).find('.language-level').val();
        if (name) {
            languages.push({ name, level });
        }
    });

    await actor.setFlag('languages-rp-fork', 'languages', languages);
} 