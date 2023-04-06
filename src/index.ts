import fs from "fs";
import {Bot, Context, enhanceStorage, session, SessionFlavor} from "grammy";
import {hydrateReply, parseMode, ParseModeFlavor} from "@grammyjs/parse-mode";
import {limit} from "@grammyjs/ratelimiter";
import {ConversationFlavor, conversations, createConversation} from "@grammyjs/conversations";
import {ISession, MongoDBAdapter} from "@grammyjs/storage-mongodb";
import {generateUpdateMiddleware} from 'telegraf-middleware-console-time';
import {Collection, MongoClient, ServerApiVersion} from "mongodb";
import {cancelMenu, cancelTrainMenu, createChooserMenu, homeMenu, trainMenu} from './menus';
import {configuration, messages} from "./config";
import {banCommand} from './commands/ban';
import {unbanCommand} from './commands/unban';
import {acceptCommand} from './commands/accept';
import {handleError} from './errorhandler';
import {work} from './conversations/application';
import {train} from './conversations/training';
import {type SessionData} from './session';


export const gibberish = require("gibberish-detective")({useCache: false});

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
export let sessions: Collection<ISession>;


async function connectMongo(): Promise<MongoClient> {
    console.log("Connecting to MongoDB...");

    const username = encodeURIComponent(process.env.MONGODB_USER);
    const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
    const uri = process.env.MONGODB_URI.replace("<username>", username).replace("<password>", password);

    return await new MongoClient(uri, {serverApi: ServerApiVersion.v1}).connect();
}


async function bootstrap() {
    if (configuration.gibberish_detection) {
        // Load gibberish model
        loadGibberishModel();
    }

    const bot = new Bot<ParseModeFlavor<BotContext>>(process.env.BOT_TOKEN);
    bot.api.config.use(parseMode('HTML'));

    const mongoClient = await connectMongo();
    const db = mongoClient.db('applications-bot');
    sessions = db.collection<ISession>('sessions');

    // Session management (session key)
    function getSessionKey(ctx: Context): string | undefined {
        if (ctx.chat?.type === "private") {
            return ctx.from?.id.toString();
        } else {
            if (ctx.chat?.id == process.env.ADMIN_GROUP_ID) {
                return ctx.from?.id.toString();
            }
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
            storage: new MongoDBAdapter({collection: sessions}),
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
        .filter((ctx) => ctx.session.in_progress == undefined)
        .filter((ctx) => ctx.session.conversation === null)
        .fork((ctx) => {
            console.log("Deleting conversation from session");
            delete ctx.session.conversation;
        });

    // All private stuff
    const privateActions = () => {
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
        privateTypes.command("start", async (ctx) => await ctx.reply(messages['start'], {reply_markup: homeMenu}));
    };


    // All group stuff
    const groupActions = () => {
        const groupTypes = bot.chatType(["group", "supergroup"]);

        if (configuration['gibberish_detection']) {
            groupTypes.use(cancelTrainMenu);
            groupTypes.use(createConversation<BotContext>(train));
            groupTypes.use(trainMenu);
            groupTypes.command("train", async (ctx) => await ctx.reply(messages['train_menu'], {reply_markup: trainMenu}));
        }

        groupTypes.on("::bot_command")
            .filter((ctx) => {
                const command = ctx.message!.text?.split(" ")[0];
                return command == "/ban" || command == "/unban" || command == "/accept";
            })
            .filter(async (ctx) => {
                const user = await ctx.getAuthor();
                return user.status === "creator" || user.status === "administrator";
            })
            .filter((ctx) => ctx.chat?.id === process.env.ADMIN_GROUP_ID)
            .filter((ctx) => {
                const text = ctx.message!.text!;
                const command: string[] = text.split(" ");
                // check if id is provided
                if (command.length != 2) {
                    ctx.reply(`Please provide a valid user id to ${command[0].replace('/', '')}. Correct usage: <code>${command[0]} [user id]</code>`);
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

        groupTypes.command("ban", (ctx) => banCommand(ctx));
        groupTypes.command("unban", (ctx) => unbanCommand(ctx));
        groupTypes.command("accept", (ctx) => acceptCommand(ctx));
    };


    // Call all functions
    privateActions();
    groupActions();


    // Start bot
    console.log("Waiting for updates...");
    await bot.start();
}

function loadGibberishModel() {
    let learningModel;
    if (fs.existsSync('gibberish/model.json')) {
        console.log("Loading gibberish model...");
        learningModel = fs.readFileSync('gibberish/model.json');
    } else {
        console.log("No gibberish model found. Using default model.");
        learningModel = fs.readFileSync('gibberish/defaults/model.json');
    }
    gibberish.set("model", JSON.parse(learningModel.toString()));
}


bootstrap();
