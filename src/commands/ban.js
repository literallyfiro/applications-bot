import { sessions } from '../index.js';

export async function banCommand(ctx) {
    const id = ctx.match;
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