import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { Bot, Context, session, SessionFlavor } from "https://deno.land/x/grammy@v1.15.3/mod.ts";
import { run, sequentialize } from "https://deno.land/x/grammy_runner@v2.0.3/mod.ts";
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "https://deno.land/x/grammy_conversations@v1.1.2/mod.ts";
import { hydrateReply, parseMode } from "https://deno.land/x/grammy_parse_mode@1.7.1/mod.ts";
import { type ParseModeFlavor } from "https://deno.land/x/grammy_parse_mode@1.7.1/mod.ts";
import { autoRetry } from "https://esm.sh/@grammyjs/auto-retry@1.1.1";
import { hydrateFiles } from "https://deno.land/x/grammy_files@v1.0.4/mod.ts";
import { FileAdapter } from "https://deno.land/x/grammy_storages@v2.3.0/file/src/mod.ts";
import { type UserData } from "./session_data.ts";
import { cancelMenu, homeMenu, createChooserMenu } from "./menus.ts";
import { work } from "./conversations/application.ts";
import { messages } from "./config.ts";
import { acceptCommand } from "./commands/accept.ts";
import * as fs from "node:fs";

export type BotContext = Context & SessionFlavor<UserData> & ConversationFlavor;
export type BotConversation = Conversation<BotContext>;
export const userSessions = {}
const sessionsPath = './sessions/';

function getSessionKey(ctx: Context): string | undefined {
    return ctx.from?.id.toString();
}

const bot = new Bot<ParseModeFlavor<BotContext>>(Deno.env.get("BOT_TOKEN")!);
bot.use(hydrateReply);
bot.api.config.use(hydrateFiles(bot.token));
bot.api.config.use(autoRetry());
bot.api.config.use(parseMode("HTML"));
bot.use(sequentialize(getSessionKey));
bot.use(session({
    getSessionKey: getSessionKey,
    initial: (): UserData => ({ user_answers: {}, in_progress: undefined, banned: false, accepted: false }),
    storage: new FileAdapter({ dirName: "sessions" }),
}));
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id;
    
    // Check if session file path exists for the user ID
    if (!userSessions[userId]) {
      // Generate a unique session file name
      const sessionFileName = `session_${userId}.json`;
      
      // Create session file path
      const sessionFilePath = `${sessionsPath}${sessionFileName}`;
  
      // Create a new session file if it doesn't exist
      if (!fs.existsSync(sessionFilePath)) {
        fs.writeFileSync(sessionFilePath, '{}');
      }
  
      // Update the mapping with the session file path
      userSessions[userId] = sessionFilePath;
    }
  
    // Read the session file and parse its contents
    
  
    // Set the session data to the ctx.session property
    // sessionData = ctx.session;
  
    await next();
  
    // After handling the request, save the updated session data back to the file
    const updatedSessionData = JSON.stringify(ctx.session);
    fs.writeFileSync(userSessions[userId], updatedSessionData, 'utf8');
  });
bot.use(conversations());
bot.catch((err) => {
    const ctx = err.ctx;
    const e = err.error;
    console.error(`Error while handling update ${ctx.update.update_id}:`, e);
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
    privateTypes.command("start", async (ctx) => await ctx.reply(messages['start'], { reply_markup: homeMenu }));
};


// All group stuff
const groupActions = () => {
    const groupTypes = bot.chatType(["group", "supergroup"]);

    // if (configuration['gibberish_detection']) {
    //     groupTypes.use(cancelTrainMenu);
    //     groupTypes.use(createConversation<BotContext>(train));
    //     groupTypes.use(trainMenu);
    //     groupTypes.command("train", async (ctx) => await ctx.reply(messages['train_menu'], {reply_markup: trainMenu}));
    // }

    groupTypes.on("::bot_command")
        .filter((ctx) => {
            const command = ctx.message!.text?.split(" ")[0];
            return command == "/ban" || command == "/unban" || command == "/accept";
        })
        .filter(async (ctx) => {
            const user = await ctx.getAuthor();
            return user.status === "creator" || user.status === "administrator";
        })
        .filter((ctx) => ctx.chat?.id == Deno.env.get("ADMIN_GROUP_ID"))
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

    // groupTypes.command("ban", (ctx) => banCommand(ctx));
    // groupTypes.command("unban", (ctx) => unbanCommand(ctx));
    groupTypes.command("accept", (ctx) => acceptCommand(ctx));
};


// Call all functions
privateActions();
groupActions();

// function loadGibberishModel() {
//     let learningModel;
//     if (fs.existsSync('gibberish/model.json')) {
//         console.log("Loading gibberish model...");
//         learningModel = fs.readFileSync('gibberish/model.json');
//     } else {
//         console.log("No gibberish model found. Using default model.");
//         learningModel = fs.readFileSync('gibberish/defaults/model.json');
//     }
//     gibberish.set("model", JSON.parse(learningModel.toString()));
// }


console.log("Bot is now running");
run(bot);
