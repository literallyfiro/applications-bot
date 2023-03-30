import { messages, buttons, types } from "./config.js";
import { Menu } from "@grammyjs/menu";

export const homeMenu = new Menu("home-menu")
    .submenu(buttons['start_button'], "chooser-menu", (ctx) => ctx.editMessageText(messages['chooser'])).row()
    .url(buttons['developer_button'], "https://t.me/ProtocolSupport")
    .url(buttons['source_button'], "https://github.com/ImOnlyFire/mtg24-bot/");

export const cancelMenu = new Menu("cancel-menu", { autoAnswer: false })
    .text(buttons['cancel'], async (ctx) => {
        if (ctx.session.in_progress == undefined) {
            ctx.answerCallbackQuery({ text: messages['not_in_progress'], show_alert: true });
            return;
        }
        ctx.answerCallbackQuery();
        await ctx.conversation.exit('work');
        delete ctx.session.in_progress;
        ctx.reply(messages['work_cancelled'], { reply_markup: { remove_keyboard: true } });
    });

export function createChooserMenu() {
    const chooserMenu = new Menu("chooser-menu", { autoAnswer: false })
        .dynamic((ctx, range) => {
            Object.keys(types).forEach(key => {
                range
                    .submenu(types[key]['name'], 'disclaimer:' + key, (ctx) => {
                        ctx.answerCallbackQuery()
                        ctx.editMessageText(messages['disclaimer'])
                    })
                    .text('ℹ', (ctx) => {
                        ctx.answerCallbackQuery({ text: types[key]['description'].slice(0, 200), show_alert: true });
                    })
                    .row();
            })
            return range;
        })
        .submenu(buttons['home'], "home-menu", (ctx) => {
            ctx.answerCallbackQuery();
            ctx.editMessageText(messages['start'])
        });
    Object.keys(types).forEach(key => {
        const disclaimerMenu = new Menu('disclaimer:' + key)
            .text(buttons['start_work'], async (ctx) => {
                if (ctx.session.in_progress != undefined) {
                    ctx.answerCallbackQuery({ text: messages['already_in_progress'], show_alert: true });
                    return;
                }
                if (Object.keys(ctx.session.user_answers).length !== 0) {
                    ctx.answerCallbackQuery({ text: messages['already_sent'], show_alert: true });
                    return;
                }
                ctx.session.in_progress = key;
                await ctx.conversation.enter('work');
            })
            .row()
            .submenu(buttons['home'], "home-menu", (ctx) => { ctx.editMessageText(messages['start']) });
        chooserMenu.register(disclaimerMenu);
    });
    homeMenu.register(chooserMenu);
    return chooserMenu;
}