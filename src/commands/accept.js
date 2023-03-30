import { sessions } from '../index.js';
import { messages } from '../config.js';
import { checkGroupAndAdmin } from './check/admin.js';
import { format } from "util";

export async function acceptCommand(ctx) {
    // Check if user is admin and command is sent in admin group
    if (!checkGroupAndAdmin(ctx)) {
        return;
    }

    const id = ctx.match;
    // check if id is a number
    if (isNaN(id)) {
        await ctx.reply("Please provide a valid user id to. Correct usage: <code>/accept [user id]</code>");
        return;
    }

    // Check if user is registered and has answered any questions yet (and is not banned)
    const user = await sessions.findOne({ key: id });
    if (user == null) {
        await ctx.reply("User is not registered.");
        return;
    }
    if (user["value"]["user_answers"] == {}) {
        await ctx.reply("User has not answered any questions yet.");
        return;
    }
    if (user["value"]["banned"]) {
        await ctx.reply("User is banned. You can't accept him.");
        return;
    }


    // Finally, accept the user and send him a message with the link to the staff group
    await sessions.updateOne({ key: id }, { $set: { "value.user_answers": {}, "value.accepted": true }});

    const chatInvite = await ctx.createChatInviteLink({chat_id: ctx.chat.id, member_limit: 1});
    const link = chatInvite.invite_link;
    const message = format(messages['accepted'], link);
    await ctx.api.sendMessage(id, message, { link_preview: false });

    await ctx.reply("User accepted successfully.");
}