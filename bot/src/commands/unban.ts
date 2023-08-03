import { messages } from "../config.ts";
import { BotContext, users } from "../index.ts";

export async function unbanCommand(ctx: BotContext) {
    const userId = Number(ctx.match?.toString());

    await users.findOne({user_id: userId}).then(async (user) => {
        if (user == null) {
            await ctx.reply(messages['user_not_registered']);
            return;
        }
        if (!user.status.is_banned) {
            await ctx.reply(messages['user_unban_not_banned']);
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
            await ctx.reply(messages['user_unbanned']);
        });
    });
}