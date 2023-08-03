import { BotContext, users } from "../index.ts";

export async function unbanCommand(ctx: BotContext) {
    const userId = Number(ctx.match?.toString());

    await users.findOne({user_id: userId}).then(async (user) => {
        if (user == null) {
            await ctx.reply("User is not registered.");
            return;
        }
        if (!user.status.is_banned) {
            await ctx.reply("User is not banned.");
            return;
        }

        await users.updateOne({user_id: userId}, {
            $set: {
                answers: {},
                status: {
                    is_banned: false,
                    is_accepted: false
                }
            }
        }).then(async () => {
            await ctx.reply("User unbanned successfully.");
        });
    });
}