import { sessions } from '../index.js';
import { checkGroupAndAdmin } from './check/admin.js';

export async function banCommand(ctx) {
    // Check if user is admin and command is sent in admin group
    if (!checkGroupAndAdmin(ctx)) {
        return;
    }

    const id = ctx.match;
    if (id.length == 0 || ctx.message.text.split(" ").length > 2) {
        await ctx.reply("Please provide a valid user id to ban. Correct usage: <code>/ban [user id]</code>");
        return;
    }
    // check if id is a number
    if (isNaN(id)) {
        await ctx.reply("Please provide a valid user id to ban. Correct usage: <code>/ban [user id]</code>");
        return;
    }

    // Check if user is already banned or not registered
    const banned = await sessions.findOne({ key: id });
    if (banned == null) {
        await ctx.reply("User is not registered.");
        return;
    }
    if (banned["value"]['__d']["banned"]) {
        await ctx.reply("User is already banned.");
        return;
    }

    // Finally, ban the user
    await sessions.updateOne({ key: id }, { $set: { "value.__d.banned": true, "value.__d.user_answers": {}, "value.__d.accepted": false }});
    await ctx.reply("User banned successfully.");
}