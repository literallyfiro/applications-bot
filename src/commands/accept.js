import { sessions } from '../index.js';
import { messages } from '../config.js';
import { format } from "util";

export async function acceptCommand(ctx) {
    const id = ctx.match;
    // Check if user is registered and has answered any questions yet (and is not banned)
    const user = await sessions.findOne({ key: id });
    if (user == null) {
        await ctx.reply("User is not registered.");
        return;
    }
    if (user["value"]['__d']["accepted"]) {
        await ctx.reply("User is already accepted.");
        return;
    }
    if (Object.keys(user["value"]['__d']["user_answers"]).length == 0) {
        await ctx.reply("User has not answered any questions yet.");
        return;
    }
    if (user["value"]['__d']["banned"]) {
        await ctx.reply("User is banned. You can't accept him.");
        return;
    }


    // Finally, accept the user and send him a message with the link to the staff group
    await sessions.updateOne({ key: id }, { $set: { "value.__d.user_answers": {}, "value.__d.accepted": true } });

    const chatInvite = await ctx.createChatInviteLink({ chat_id: ctx.chat.id, member_limit: 1 });
    const link = chatInvite.invite_link;
    const message = format(messages['accepted'], link);
    await ctx.api.sendMessage(id, message, { disable_web_page_preview: true });

    await ctx.reply("User accepted successfully.");
}