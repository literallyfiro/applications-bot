import { BotContext, sessions } from '../index';
import { TempData } from '../session';

export async function unbanCommand(ctx: BotContext) {
    const id: string = ctx.match?.toString()!;

    await sessions.findOne({ key: id }).then(async (user) => {
        if (user == null) {
            await ctx.reply("User is not registered.");
            return;
        }
        const userData = (user.value as TempData).__d;
        if (userData.accepted) {
            await ctx.reply("User is already accepted.");
            return;
        }
        if (!userData.banned) {
            await ctx.reply("User is not banned.");
            return;
        }

        await sessions.updateOne({ key: id }, { $set: { "value.__d.banned": false, "value.__d.user_answers": {} } }).then(async () => {
            await ctx.reply("User unbanned successfully.");
        });
    });
}