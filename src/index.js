import { config } from 'dotenv';
config();

import { Bot, session } from "grammy";
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { limit } from "@grammyjs/ratelimiter";
import { conversations, createConversation } from "@grammyjs/conversations";
import { MongoDBAdapter } from "@grammyjs/storage-mongodb";
import { generateUpdateMiddleware } from 'telegraf-middleware-console-time';
import { homeMenu, cancelMenu, createChooserMenu } from './menus.js';
import { messages } from "./config.js";
import { work } from './work.js';
import { handleError } from './errorhandler.js';
import { MongoClient, ServerApiVersion  } from "mongodb";


async function connectMongo() {
    const username = encodeURIComponent(process.env.MONGODB_USER);
    const password = encodeURIComponent(process.env.MONGODB_PASSWORD);
    const uri = process.env.MONGODB_URI.replace("<username>", username).replace("<password>", password);
    console.log("Connecting to MongoDB...");
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    await client.connect();
    return client;
}


async function bootstrap() {
    const bot = new Bot(process.env.BOT_TOKEN);
    bot.api.config.use(parseMode('HTML'));

    const mongoClient = await connectMongo();
    const db = mongoClient.db('mtg24');
    const sessions = db.collection('sessions');

    // Session management
    bot.use(session({
        initial() {
            return {
                user_answers: {},
                in_progress: String
            }
        },
        storage: new MongoDBAdapter({ collection: sessions }),
    }));

    // Error handling
    bot.catch((err) => handleError(err));

    // General grammy plugins
    bot.use(hydrateReply);
    bot.use(limit());
    bot.use(conversations());
    bot.use(generateUpdateMiddleware());

    // Custom menus and conversations
    bot.use(cancelMenu);
    bot.use(createConversation(work));
    bot.use(homeMenu);
    bot.use(createChooserMenu());

    // Commands
    bot.command("start", (ctx) => ctx.reply(messages.start, { reply_markup: homeMenu }));

    console.log("Waiting for updates...");
    bot.start();
}



bootstrap();






