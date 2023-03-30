import { sessions } from '../index.js';
import { checkGroupAndAdmin } from './check/admin.js';

export async function unbanCommand(ctx) {
    // Check if user is admin and command is sent in admin group
    if (!checkGroupAndAdmin(ctx)) {
        return;
    }

    const id = ctx.match;
    if (id.length == 0 || ctx.message.text.split(" ").length > 2) {
        await ctx.reply("Please provide a valid user id to unban. Correct usage: <code>/unban [user id]</code>");
        return;
    }
    // check if id is a number
    if (isNaN(id)) {
        await ctx.reply("Please provide a valid user id to unban. Correct usage: <code>/unban [user id]</code>");
        return;
    }

    // Check if user is already unbanned or not registered
    const banned = await sessions.findOne({ key: id });
    if (banned == null) {
        await ctx.reply("User is not registered.");
        return;
    }
    if (!banned["value"]['__d']["banned"]) {
        await ctx.reply("User is already not banned.");
        return;
    }

    // Finally, ban the user
    await sessions.updateOne({ key: id }, { $set: { "value.__d.banned": false, "value.__d.user_answers": {} }});
    await ctx.reply("User unbanned successfully.");
}