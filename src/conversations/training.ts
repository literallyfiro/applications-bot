import {Conversation} from "@grammyjs/conversations";
import {BotContext, gibberish} from "..";
import {InputFile} from "grammy";
import {download} from "../downloader";
import {messages} from "../config";
import {cancelTrainMenu} from "../menus";
import fs from "fs";

export async function train(conversation: Conversation<BotContext>, ctx: BotContext) {
    await ctx.reply(messages['training_first_phase'], {reply_markup: cancelTrainMenu});
    const good = await conversation.waitFor(":file");
    const goodFile = await good.getFile();
    const sample_good = await download(goodFile.file_path!, "gibberish/good.txt");

    await ctx.reply(messages['training_second_phase'], {reply_markup: cancelTrainMenu});
    const goodSm = await conversation.waitFor(":file");
    const goodSmFile = await goodSm.getFile();
    const sample_good_sm = await download(goodSmFile.file_path!, "gibberish/good_sm.txt");

    await ctx.reply(messages['training_final_phase'], {reply_markup: cancelTrainMenu});
    const bad = await conversation.waitFor(":file");
    const badFile = await bad.getFile();
    const sample_bad = await download(badFile.file_path!, "gibberish/bad.txt");

    await ctx.reply(messages['training_in_progress']);

    let newModel = gibberish.train(sample_good, sample_good_sm, sample_bad);
    fs.writeFileSync("gibberish/model.json", JSON.stringify(newModel))
    gibberish.set("model", newModel);

    await ctx.reply(messages['training_done']);
    await ctx.replyWithDocument(new InputFile("gibberish/model.json"));
}