import { MODULE_ID } from "../main.js";

Hooks.on("getProseMirrorMenuDropDowns", async (menu, config) => {
    if(!game.user.isGM) return;
    const availableLanguages = game.settings.get(MODULE_ID, 'availableLanguages') || {};
    const entries = Object.entries(availableLanguages)
        .map(([id, data]) => ({
            action: `languagesRp${id}`,
            title: data.name,
            icon: `<i class="fas fa-language"></i>`,
            cmd: async (state, dispatch, view) => {
                const { from, to } = view.state.selection;
                let selectedText = from === to ? "" : view.state.doc.textBetween(from, to, " ");
                
                selectedText = selectedText.replace(/\[\[[^\]]*\|(.*?)\]\]/g, '$1');
                
                const content = await renderTemplate(`modules/${MODULE_ID}/templates/language-editor.html`, {
                    selectedText
                });
                
                new foundry.applications.api.DialogV2({
                    window: { 
                        title: game.i18n.format("languages-rp.ui.languageEditor", {name: data.name})
                    },
                    content,
                    buttons: [
                        {
                            action: "insert",
                            label: game.i18n.localize("languages-rp.ui.insert"),
                            callback: (event, button, dialog) => {
                                const textarea = button.form.elements.texte;
                                const text = textarea.value;
                                if (text) {
                                    const formattedText = `[[${id}|${text}]]`;
                                    dispatch(view.state.tr.insertText(formattedText));
                                    view.focus();
                                }
                            },
                            default: true
                        }
                    ]
                }).render({ force: true });
                return false;
            }
        }));

    config.monMenu = {
        title: game.i18n.localize("languages-rp.ui.languagesMenu"),
        icon: `<i class="fas fa-language"></i>`,
        entries
    };
});  