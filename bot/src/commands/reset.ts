import { messages } from "../config.ts";
import { BotContext, users } from "../index.ts";

export async function resetCommand(ctx: BotContext) {
    const userId = Number(ctx.match?.toString());

    await users.findOne({user_id: userId}).then(async (user) => {
        if (user == null) {
            await ctx.reply(messages['user_not_registered']);
            return;
        }
        await users.updateOne({user_id: userId}, {
            $set: {
                answers: {},
                status: {
                    is_banned: false,
                    is_accepted: false
                },
                in_progress: null,
            }
        }).then(async () => {
            await ctx.reply("👍");
        });
    });
}