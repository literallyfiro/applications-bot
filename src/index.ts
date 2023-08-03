import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { Bot, Context, session, SessionFlavor } from "https://deno.land/x/grammy@v1.15.3/mod.ts";
import { run } from "https://deno.land/x/grammy_runner@v2.0.3/mod.ts";
import { Conversation, ConversationFlavor, conversations, createConversation } from "https://deno.land/x/grammy_conversations@v1.1.2/mod.ts";
import { hydrateReply, parseMode } from "https://deno.land/x/grammy_parse_mode@1.7.1/mod.ts";
import { ParseModeFlavor } from "https://deno.land/x/grammy_parse_mode@1.7.1/mod.ts";
import { autoRetry } from "https://esm.sh/@grammyjs/auto-retry@1.1.1";
import { MongoClient, ObjectId } from "https://deno.land/x/mongo@v0.31.2/mod.ts";
import { cancelMenu, homeMenu, createChooserMenu, cancelTrainMenu, trainMenu } from "./menus.ts";
import { work } from "./conversations/application.ts";
import { configuration, messages } from "./config.ts";
import { acceptCommand } from "./commands/accept.ts";
import { banCommand } from "./commands/ban.ts";
import { unbanCommand } from "./commands/unban.ts";
import { reloadModel } from "./gibberish.ts";
import { training_mode } from "./conversations/training.ts";

export type BotContext = Context & ConversationFlavor & SessionFlavor<Context>;
export type BotConversation = Conversation<BotContext>;

export interface UserSchema {
    _id: ObjectId;
    user_id: number;
    answers: {
        [key: string]: string[];
    };
    status: {
        is_banned: boolean;
        is_accepted: boolean;
    };
    created_at: Date;
    in_progress: string | null;
}


export const users = await setupDatabase();
const bot = setupBot();

async function setupDatabase() {
    console.log("Connecting to database...");

    const client = new MongoClient();
    await client.connect(Deno.env.get("MONGODB_URI")!);
    const db = client.database("applications-bot");
    return db.collection<UserSchema>("users")
}

function setupBot() {
    const bot = new Bot<ParseModeFlavor<BotContext>>(Deno.env.get("BOT_TOKEN")!);

    // Install parse mode plugin
    bot.use(hydrateReply);
    // Install session plugin
    bot.use(session({ initial() { return {} } }));
    // Install conversations plugin
    bot.use(conversations());

    // Retry API Requests if they fail for some reason
    bot.api.config.use(autoRetry());
    // Use HTML as default parse mode
    bot.api.config.use(parseMode("HTML"));

    bot.catch((err) => {
        console.error(`Error while handling update ${err.ctx.update.update_id}:`, err.error);
    });

    setupPrivateActions(bot);
    setupGroupActions(bot);

    return bot;
}


function setupPrivateActions(bot: Bot<ParseModeFlavor<BotContext>>) {
    const privateChatType = bot.chatType("private");

    // Banned users can't do anything in private, so we filter them out
    privateChatType
        .filter(async (ctx) => {
            // check if user is banned
            const userInDb = await users.findOne({ user_id: ctx.from?.id });
            return userInDb!.status.is_banned;
        })
        .on(["msg", "callback_query", "inline_query", ":file", "edit"], (ctx) => {
            console.log("User " + ctx.from.id + " is banned. Ignoring message.");
            ctx.reply("You are banned. You can't use this bot.");
        });

    privateChatType.use(cancelMenu);
    privateChatType.use(createConversation<BotContext>(work));
    privateChatType.use(homeMenu);
    privateChatType.use(createChooserMenu());

    privateChatType.command("start", async (ctx) => {
        // check if user is in db. if not, add him
        const userId = ctx.from.id;
        const userInDb = await users.findOne({ user_id: userId });
        if (!userInDb) {
            await users.insertOne({
                user_id: userId,
                answers: {},
                status: {
                    is_banned: false,
                    is_accepted: false,
                },
                created_at: new Date(),
                in_progress: null,
            });
        }

        await ctx.reply(messages['start'], { reply_markup: homeMenu });
    });
}


function setupGroupActions(bot: Bot<ParseModeFlavor<BotContext>>) {
    const groupChatType = bot.chatType(["group", "supergroup"]);

    if (configuration['gibberish_detection']) {
        groupChatType.use(cancelTrainMenu);
        groupChatType.use(createConversation<BotContext>(training_mode, "train"));
        groupChatType.use(trainMenu);
        groupChatType.command("train", async (ctx) => await ctx.reply(messages['train_menu'], {reply_markup: trainMenu}));
    }

    // Generic command layout for banning, unbanning and accepting users
    const layout = groupChatType.on("::bot_command")
        .filter((ctx) => {
            const command = ctx.message!.text?.split(" ")[0];
            return command == "/ban" || command == "/unban" || command == "/accept";
        })
        .filter(async (ctx) => {
            const user = await ctx.getAuthor();
            return user.status === "creator" || user.status === "administrator";
        })
        .filter((ctx) => ctx.chat?.id.toString() == Deno.env.get("ADMIN_GROUP_ID"))
        .filter((ctx) => {
            const text = ctx.message!.text!;
            const command: string[] = text.split(" ");
            // check if id is provided
            if (command.length != 2) {
                ctx.reply(`Please provide a valid user id to ${command[0].replace('/', '')}. Correct usage: <code>${command[0]} [user id]</code>`);
                return false;
            }
            // check if id is a number
            const id: number = parseInt(command[1]);
            if (isNaN(id)) {
                ctx.reply("Please provide a valid user id. Correct usage: <code>" + command[0] + " [user id]</code>");
                return false;
            }
            return true;
        });

    layout.command("ban", (ctx) => banCommand(ctx));
    layout.command("unban", (ctx) => unbanCommand(ctx));
    layout.command("accept", (ctx) => acceptCommand(ctx));
}

async function loadGibberishModel() {
    try {
        await reloadModel("gibberish/gib_model.json");
    } catch (_error) {
        console.log("No gibberish model found. Using default model.");
        await reloadModel("gibberish/defaults/gib_model.json");
        return;
    }
}

if (configuration['gibberish_detection']) {
    await loadGibberishModel();
}
console.log("Bot is now running");
run(bot);