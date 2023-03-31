import { sessions } from '../index.js';

export async function unbanCommand(ctx) {
    const id = ctx.match;
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
    await sessions.updateOne({ key: id }, { $set: { "value.__d.banned": false, "value.__d.user_answers": {} } });
    await ctx.reply("User unbanned successfully.");
}