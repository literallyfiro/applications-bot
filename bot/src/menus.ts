import { Menu } from "https://deno.land/x/grammy_menu@v1.2.1/mod.ts";
import { InputFile } from "https://deno.land/x/grammy@v1.17.2/types.ts";
import { buttons, messages, types } from "./config.ts";
import { BotContext, users } from "./index.ts";

export const homeMenu = new Menu<BotContext>("home-menu")
    .submenu(buttons['start_button'], "chooser-menu", async (ctx) => await ctx.editMessageText(messages['chooser'])).row()
    .url(buttons['developer_button'], "https://t.me/ProtocolSupport")
    .url(buttons['source_button'], "https://github.com/ImOnlyFire/mtg24-bot/");

export const cancelMenu = new Menu<BotContext>("cancel-menu", { autoAnswer: false })
    .text(buttons['cancel'], async (ctx) => {
        await users.findOne({ user_id: ctx.from?.id }).then(async (user) => {
            if (user == null) return;
            if (user.in_progress == null) {
                await ctx.answerCallbackQuery({ text: messages['not_in_progress'], show_alert: true });
                return;
            }

            await users.updateOne({ user_id: ctx.from?.id }, {
                $set: {
                    in_progress: null,
                    answers: {}
                }
            }).then(async () => {
                await ctx.answerCallbackQuery();
                await ctx.conversation.exit();

                await ctx.reply(messages['work_cancelled'], { reply_markup: { remove_keyboard: true } });
            });
        });
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
                        await ctx.answerCallbackQuery({
                            text: types[key]['description'].slice(0, 200),
                            show_alert: true
                        });
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
                await users.findOne({ user_id: ctx.from?.id }).then(async (user) => {
                    if (user == null) return;
                    if (user.in_progress != null) {
                        await ctx.answerCallbackQuery({ text: messages['already_in_progress'], show_alert: true });
                        return;
                    }
                    if (Object.keys(user.answers).length !== 0) {
                        await ctx.answerCallbackQuery({ text: messages['already_sent'], show_alert: true });
                        return;
                    }
                    const questionSize = Object.keys(types[key]['questions']).length;
                    if (questionSize === 0) {
                        await ctx.answerCallbackQuery({ text: messages['work_with_no_question'], show_alert: true });
                        return;
                    }

                    await users.updateOne({ user_id: ctx.from?.id }, {
                        $set: {
                            in_progress: key
                        }
                    }).then(async () => {
                        await ctx.answerCallbackQuery();
                        await ctx.conversation.enter('work');
                    });
                });
            })
            .row()
            .submenu(buttons['home'], "home-menu", async (ctx) => {
                await ctx.editMessageText(messages['start'])
            });
        chooserMenu.register(disclaimerMenu);
    });
    homeMenu.register(chooserMenu);
    return chooserMenu;
}


// Train
export const trainMenu = new Menu<BotContext>("train-menu", {autoAnswer: false})
    .text(buttons['fetch_model'], async (ctx) => {
        try {
            await ctx.replyWithDocument(new InputFile('gibberish/gib_model.json'));
        } catch (_e) {
            await ctx.replyWithDocument(new InputFile('gibberish/defaults/gib_model.json'));
        }
    }).row()
    .text(buttons['train_model'], async (ctx) => {
        await ctx.conversation.enter('train');
    });
export const cancelTrainMenu = new Menu<BotContext>("cancel-training-menu", {autoAnswer: false})
    .text(buttons['cancel'], async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.conversation.exit();
        await ctx.reply(messages['training_cancelled'], {reply_markup: {remove_keyboard: true}});
    });