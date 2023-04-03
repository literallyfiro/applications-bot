import { Conversation } from "@grammyjs/conversations";
import { BotContext } from "..";
import { gibberish } from "..";
import { InputFile } from "grammy";
import { download } from "../downloader";
import fs from "fs";

// TODO: Add a way to cancel the training process
// TODO: make this better in general (and also make the text better)
export async function train(conversation: Conversation<BotContext>, ctx: BotContext) {
    await ctx.reply("send good")
    const good = await conversation.waitFor(":file");
    const goodFile = await good.getFile();
    const sample_good = await download(goodFile.file_path!, "gibberish/good.txt");

    await ctx.reply("send good sm")
    const goodSm = await conversation.waitFor(":file");
    const goodSmFile = await goodSm.getFile();
    const sample_good_sm = await download(goodSmFile.file_path!, "gibberish/good_sm.txt");

    await ctx.reply("send bad")
    const bad = await conversation.waitFor(":file");
    const badFile = await bad.getFile();
    const sample_bad = await download(badFile.file_path!, "gibberish/bad.txt");

    let newModel = gibberish.train(sample_good, sample_good_sm, sample_bad);
    fs.writeFileSync("gibberish/model.json", JSON.stringify(newModel))
    const model = fs.readFileSync("gibberish/model.json", "utf-8");
    await ctx.replyWithDocument(new InputFile("gibberish/model.json"));
}