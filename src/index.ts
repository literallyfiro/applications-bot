import { config } from 'dotenv';
config();

import { Bot, Context, session, SessionFlavor, enhanceStorage } from "grammy";
import { ParseModeFlavor, hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { limit } from "@grammyjs/ratelimiter";
import { ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";
import { generateUpdateMiddleware } from 'telegraf-middleware-console-time';
import { MongoDBAdapter, ISession } from "@grammyjs/storage-mongodb";
import { Collection, MongoClient, ServerApiVersion } from "mongodb";
import { homeMenu, cancelMenu, createChooserMenu } from './menus';
import { messages } from "./config";
// import { work } from './work.js';
// import { handleError } from './errorhandler.js';
// import { banCommand } from './commands/ban.js';
// import { unbanCommand } from './commands/unban.js';
import { acceptCommand } from './commands/accept.js';
import { handleError } from './errorhandler';
import { work } from './application';
import { type SessionData } from './session';

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
export let sessions: Collection<ISession>;


async function connectMongo(): Promise<MongoClient> {
    console.log("Connecting to MongoDB...");

    const username = encodeURIComponent(process.env.MONGODB_USER!);
    const password = encodeURIComponent(process.env.MONGODB_PASSWORD!);
    const uri = process.env.MONGODB_URI!.replace("<username>", username).replace("<password>", password);

    return await new MongoClient(uri, { serverApi: ServerApiVersion.v1 }).connect();
}


async function bootstrap() {
    const bot = new Bot<ParseModeFlavor<BotContext>>(process.env.BOT_TOKEN!);
    bot.api.config.use(parseMode('HTML'));

    const mongoClient = await connectMongo();
    const db = mongoClient.db('applications-bot');
    sessions = db.collection<ISession>('sessions');

    // Stores data per chat (default).
    function getSessionKey(ctx: Context): string | undefined {
        if (ctx.chat?.type === "private") {
            return ctx.from?.id.toString();
        } else {
            return undefined;
        }
    }

    function initial(): SessionData {
        return {
            user_answers: {},
            in_progress: undefined,
            banned: false,
            accepted: false,
        }
    }
    
    // Session management
    bot.use(session({
        getSessionKey: getSessionKey,
        initial: initial, 
        storage: enhanceStorage({
            storage: new MongoDBAdapter({ collection: sessions }),
            // migrations: {
            //     // new migrations go here
            //     1: first,
            // },
        }),
    }));

    // Error handling
    bot.catch((err) => handleError(err));

    // General grammy plugins
    bot.use(hydrateReply);
    bot.use(limit());
    bot.use(conversations());
    bot.use(generateUpdateMiddleware());

    bot
        .filter((ctx) => ctx.chat?.type === "private")
        .filter((ctx) => ctx.session.in_progress == undefined)
        .filter((ctx) => ctx.session.conversation === null)
        .fork((ctx) => {
            console.log("Deleting conversation from session");
            delete ctx.session.conversation;
        });

    // All private stuff
    var privateActions = () => {
        const privateTypes = bot.chatType("private")
        // Banned users can't do anything in private, so we filter them out
        privateTypes
            .filter((ctx) => ctx.session.banned)
            .on(["msg", "callback_query", "inline_query", ":file", "edit"], (ctx) => {
                console.log("User " + ctx.from.id + " is banned. Ignoring message.");
                ctx.reply("You are banned. You can't use this bot.");
            });

        // Custom menus and conversations
        privateTypes.use(cancelMenu);
        privateTypes.use(createConversation<BotContext>(work));
        privateTypes.use(homeMenu);
        privateTypes.use(createChooserMenu());
        // Commands
        privateTypes.command("start", async (ctx) => await ctx.reply(messages['start'], { reply_markup: homeMenu }));
    };


    // All group stuff
    var groupActions = () => {
        const adminGroupId: number = parseInt(process.env.ADMIN_GROUP_ID!.toString());
        const groupTypes = bot.chatType(["group", "supergroup"])
            .on("::bot_command")
            .filter((ctx) => {
                const command = ctx.message.text?.split(" ")[0];
                return command == "/ban" || command == "/unban" || command == "/accept"
            })
            .filter(async (ctx) => {
                const user = await ctx.getAuthor();
                return user.status === "creator" || user.status === "administrator";
            })
            .filter((ctx) => ctx.chat.id === adminGroupId)
            .filter((ctx) => {
                const text = ctx.message.text!;
                const command: string[] = text.split(" ");
                // check if id is provided
                if (command.length != 2) {
                    ctx.reply("Please provide a valid user id to " + command[0].replace('/', '') + ". Correct usage: <code>" + command[0] + " [user id]</code>");
                    return false;
                }
                // check if id is a number
                let id: number = parseInt(command[1]);
                if (isNaN(id)) {
                    ctx.reply("Please provide a valid user id. Correct usage: <code>" + command[0] + " [user id]</code>");
                    return false;
                }
                return true;
            });

        // groupTypes.command("ban", (ctx) => banCommand(ctx));
        // groupTypes.command("unban", (ctx) => unbanCommand(ctx));
        groupTypes.command("accept", (ctx) => acceptCommand(ctx));
    };


    // Call all functions
    privateActions();
    groupActions();


    // Start bot
    console.log("Waiting for updates...");
    bot.start();
}



bootstrap();
