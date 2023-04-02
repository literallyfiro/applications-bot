import { messages, buttons, types } from "./config";
import { Menu } from "@grammyjs/menu";
import { BotContext } from "./index";

export const homeMenu = new Menu<BotContext>("home-menu")
    .submenu(buttons['start_button'], "chooser-menu", async (ctx) => await ctx.editMessageText(messages['chooser'])).row()
    .url(buttons['developer_button'], "https://t.me/ProtocolSupport")
    .url(buttons['source_button'], "https://github.com/ImOnlyFire/mtg24-bot/");

export const cancelMenu = new Menu<BotContext>("cancel-menu", { autoAnswer: false })
    .text(buttons['cancel'], async (ctx) => {
        if (ctx.session.in_progress == undefined) {
            await ctx.answerCallbackQuery({ text: messages['not_in_progress'], show_alert: true });
            return;
        }
        await ctx.answerCallbackQuery();
        await ctx.conversation.exit('work');
        delete ctx.session.in_progress;
        await ctx.reply(messages['work_cancelled'], { reply_markup: { remove_keyboard: true } });
    });

export function createChooserMenu() {
    const chooserMenu = new Menu<BotContext>("chooser-menu", { autoAnswer: false })
        .dynamic((ctx, range) => {
            Object.keys(types).forEach(key => {
                range
                    .submenu(types[key]['name'], 'disclaimer:' + key, async (ctx) => {
                        await ctx.answerCallbackQuery()
                        await ctx.editMessageText(messages['disclaimer'])
                    })
                    .text('ℹ', async (ctx) => {
                        await ctx.answerCallbackQuery({ text: types[key]['description'].slice(0, 200), show_alert: true });
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
        const disclaimerMenu = new Menu<BotContext>('disclaimer:' + key, { autoAnswer: false })
            .text(buttons['start_work'], async (ctx) => {
                if (ctx.session.in_progress != undefined) {
                    await ctx.answerCallbackQuery({ text: messages['already_in_progress'], show_alert: true });
                    return;
                }
                if (Object.keys(ctx.session.user_answers).length !== 0) {
                    await ctx.answerCallbackQuery({ text: messages['already_sent'], show_alert: true });
                    return;
                }
                const questionSize = Object.keys(types[key]['questions']).length;
                if (questionSize === 0) {
                    await ctx.answerCallbackQuery({ text: messages['work_with_no_question'], show_alert: true });
                    return;
                }
                await ctx.answerCallbackQuery();
                ctx.session.in_progress = key;
                await ctx.conversation.enter('work');
            })
            .row()
            .submenu(buttons['home'], "home-menu", async (ctx) => { await ctx.editMessageText(messages['start']) });
        chooserMenu.register(disclaimerMenu);
    });
    homeMenu.register(chooserMenu);
    return chooserMenu;
}