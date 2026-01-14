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
    const actorKnownWords = actor.getFlag(MODULE_ID, 'knownWords') || {};
    
    const languagesWithKnownWords = actorLanguages.map(lang => ({
        ...lang,
        knownWords: actorKnownWords[lang.id] || []
    }));
    
    const languageNames = Object.entries(availableLanguages).map(([id, data]) => ({ id, name: data.name }));
    const availableUnselectedLanguages = languageNames.filter(lang => 
        !actorLanguages.some(actorLang => actorLang.id === lang.id)
    );
    
    const languagesMap = {};
    languageNames.forEach(lang => {
        languagesMap[lang.id] = lang.name;
    });
    
    const allLanguagesWithKnownWords = languageNames.map(lang => ({
        id: lang.id,
        name: lang.name,
        knownWords: actorKnownWords[lang.id] || []
    }));


    const template = await renderTemplate(`modules/${MODULE_ID}/templates/languages-dialog.html`, {
        actor: actor,
        languages: languagesWithKnownWords,
        availableLanguages: languageNames,
        allLanguagesWithKnownWords: allLanguagesWithKnownWords,
        languagesMap: languagesMap,
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
            html.find('.languages-rp-tab').click(ev => {
                const tabName = $(ev.currentTarget).data('tab');
                html.find('.languages-rp-tab').removeClass('active');
                html.find('.languages-rp-tab-content').removeClass('active');
                $(ev.currentTarget).addClass('active');
                html.find(`.languages-rp-tab-content[data-tab="${tabName}"]`).addClass('active');
            });
            
            html.find('.known-words-language-select').on('change', function() {
                const selectedLangId = $(this).val();
                html.find('.known-words-list').hide();
                if (selectedLangId) {
                    html.find(`.known-words-list[data-lang-id="${selectedLangId}"]`).show();
                }
            });
            
            const firstLangId = html.find('.known-words-list').first().data('lang-id');
            if (firstLangId) {
                html.find('.known-words-language-select').val(firstLangId).trigger('change');
            }
            
            html.find('.add-language').click(ev => addLanguage(ev, html));
            html.find('.remove-language').click(ev => removeLanguage(ev));
            html.find('.add-known-word').click(ev => addKnownWord(ev, html));
            html.find('.remove-known-word').click(ev => removeKnownWord(ev));
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
        
        const selectedLangId = newLanguage.find('.language-id').val();
        if (selectedLangId) {
            const langName = languages.find(l => l.id === selectedLangId)?.name;
            const knownWordsSelect = html.find('.known-words-language-select');
            const newOption = $(`<option value="${selectedLangId}">${langName}</option>`);
            knownWordsSelect.append(newOption);
            
            if (html.find(`.known-words-list[data-lang-id="${selectedLangId}"]`).length === 0) {
                const knownWordsList = $(`
                    <div class="known-words-list" data-lang-id="${selectedLangId}" style="display: none;">
                        <div class="add-known-word-container">
                            <input type="text" class="new-known-word-input" placeholder="${game.i18n.localize("languages-rp.ui.knownWordPlaceholder")}" />
                            <button type="button" class="add-known-word"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                `);
                html.find('.known-words-container').append(knownWordsList);
                knownWordsList.find('.add-known-word').click(ev => addKnownWord(ev, html));
            }
        }
    });
}

function removeLanguage(event) {
    const languageItem = $(event.currentTarget).closest('.language-item');
    const langId = languageItem.find('.language-id').val();
    
    if (langId) {
        const form = $(event.currentTarget).closest('form');
        form.find(`.known-words-language-select option[value="${langId}"]`).remove();
        form.find(`.known-words-list[data-lang-id="${langId}"]`).remove();
        
        const select = form.find('.known-words-language-select');
        if (select.val() === langId) {
            select.val('').trigger('change');
        }
    }
    
    languageItem.remove();
}

function addKnownWord(event, html) {
    const selectedLangId = html.find('.known-words-language-select').val();
    if (!selectedLangId) {
        ui.notifications.warn(game.i18n.localize("languages-rp.ui.selectLanguageForKnownWords"));
        return;
    }
    
    const wordsList = html.find(`.known-words-list[data-lang-id="${selectedLangId}"]`);
    const input = wordsList.find('.new-known-word-input');
    const word = input.val().trim();
    
    if (!word) return;
    
    const existingWords = [];
    wordsList.find('.known-word-item .known-word-input').each((_, el) => {
        const val = $(el).val().trim();
        if (val) existingWords.push(val);
    });
    
    if (existingWords.includes(word)) {
        ui.notifications.warn(game.i18n.format("languages-rp.notifications.wordAlreadyKnown", {word: word}));
        return;
    }
    
    const wordItem = $(`
        <div class="known-word-item">
            <input type="text" class="known-word-input" value="${word}" />
            <button type="button" class="remove-known-word"><i class="fas fa-times"></i></button>
        </div>
    `);
    
    wordsList.find('.add-known-word-container').before(wordItem);
    wordItem.find('.remove-known-word').click(ev => removeKnownWord(ev));
    input.val('');
}

function removeKnownWord(event) {
    $(event.currentTarget).closest('.known-word-item').remove();
}

async function saveLanguages(html, actor) {
    const languages = [];
    const knownWords = {};
    
    html.find('.language-item').each((_, el) => {
        const id = $(el).find('.language-id').val();
        const level = $(el).find('.language-level').val();
        if (id) {
            languages.push({ id, level });
        }
    });
    
    html.find('.known-words-list').each((_, el) => {
        const langId = $(el).data('lang-id');
        if (langId) {
            const words = [];
            $(el).find('.known-word-item .known-word-input').each((_, wordEl) => {
                const word = $(wordEl).val().trim();
                if (word) words.push(word);
            });
            if (words.length > 0) {
                knownWords[langId] = words;
            }
        }
    });
    
    await actor.setFlag(MODULE_ID, 'languages', languages);
    await actor.setFlag(MODULE_ID, 'knownWords', knownWords);
} 