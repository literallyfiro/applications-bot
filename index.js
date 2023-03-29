import { config } from 'dotenv';
config();

import { Bot, session, MemorySessionStorage } from "grammy";
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { limit } from "@grammyjs/ratelimiter";
import { GrammyError, HttpError } from "grammy";
import { Menu } from "@grammyjs/menu";
import { messages, buttons, types } from "./config.js";
import { conversations, createConversation } from "@grammyjs/conversations";
import { FileAdapter } from "@grammyjs/storage-file";
import { generateUpdateMiddleware } from 'telegraf-middleware-console-time';
import { work } from './work.js';


const bot = new Bot(process.env.BOT_TOKEN);

bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});


bot.use(session({
    initial() {
        return {
            user_answers: {},
            in_progress: String
        }
    },
    storage: new FileAdapter({
        dirName: "sessions",
    }),
}));
bot.use(hydrateReply);
bot.use(limit());
bot.use(conversations());
bot.use(generateUpdateMiddleware());

bot.api.config.use(parseMode('HTML'));

const homeMenu = new Menu("home-menu")
    .submenu(buttons['start_button'], "chooser-menu", (ctx) => { ctx.editMessageText(messages['chooser']) }).row()
    .url(buttons['developer_button'], "https://t.me/ProtocolSupport");
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
export const cancelMenu = new Menu("cancel-menu", { autoAnswer: false })
    .text(buttons['cancel'], async (ctx) => {
        if (!ctx.session.in_progress[ctx.from.id]) {
            ctx.answerCallbackQuery({ text: messages['not_in_progress'], show_alert: true });
            return;
        }
        ctx.answerCallbackQuery();
        await ctx.conversation.exit('work');
        delete ctx.session.in_progress[ctx.from.id];
        ctx.reply(messages['work_cancelled'], { reply_markup: { remove_keyboard: true } });
    });

bot.use(cancelMenu);
bot.use(createConversation(work));


Object.keys(types).forEach(key => {
    const disclaimerMenu = new Menu('disclaimer:' + key)
        .text(buttons['start_work'], async (ctx) => {
            if (ctx.session.in_progress != undefined) {
                ctx.answerCallbackQuery({ text: messages['already_in_progress'], show_alert: true });
                return;
            }
            ctx.session.in_progress = key;
            await ctx.conversation.enter('work');
        })
        .row()
        .submenu(buttons['home'], "home-menu", (ctx) => { ctx.editMessageText(messages['start']) });
    chooserMenu.register(disclaimerMenu);
});

bot.use(homeMenu)
homeMenu.register(chooserMenu)

bot.command("start", (ctx) => ctx.reply(messages.start, { reply_markup: homeMenu }));

console.log("Waiting for updates...");
bot.start();

