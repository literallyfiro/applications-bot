import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { InputFile } from "https://deno.land/x/grammy@v1.15.3/types.deno.ts";
import { Conversation } from "https://deno.land/x/grammy_conversations@v1.1.2/conversation.ts";
import { messages } from "../config.ts";
import { BotContext } from "../index.ts";
import { cancelTrainMenu } from "../menus.ts";
import { train } from "../gibberish.ts";

export async function training_mode(conversation: Conversation<BotContext>, ctx: BotContext) {
    await ctx.reply(messages['training_first_phase'], {reply_markup: cancelTrainMenu});

    const good = await conversation.waitFor(":file");
    const goodFile = await good.getFile();
    await download(goodFile.file_path!, "gibberish/big.txt");

    await ctx.reply(messages['training_second_phase'], {reply_markup: cancelTrainMenu});
    const goodSm = await conversation.waitFor(":file");
    const goodSmFile = await goodSm.getFile();
    await download(goodSmFile.file_path!, "gibberish/good.txt");

    await ctx.reply(messages['training_final_phase'], {reply_markup: cancelTrainMenu});
    const bad = await conversation.waitFor(":file");
    const badFile = await bad.getFile();
    await download(badFile.file_path!, "gibberish/bad.txt");

    await ctx.reply(messages['training_in_progress']);

    await train("gibberish");
    await ctx.reply(messages['training_done']);
    await ctx.replyWithDocument(new InputFile("gibberish/gib_model.json"));
}

async function download(url_file_path: string, effective_file_path: string) {
    const url = `https://api.telegram.org/file/bot${Deno.env.get("BOT_TOKEN")}/${url_file_path}`;
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await Deno.writeFile(effective_file_path, new Uint8Array(buffer));
}