import { format } from "https://deno.land/x/format@1.0.1/mod.ts";
import { messages } from '../config.ts';
import { BotContext, users } from '../index.ts';

export async function acceptCommand(ctx: BotContext) {
    const userId = Number(ctx.match?.toString());

    await users.findOne({ user_id: userId }).then(async (user) => {
        if (user == null) {
            await ctx.reply("User is not registered.");
            return;
        }
        if (user.status.is_accepted) {
            await ctx.reply("User is already accepted.");
            return;
        }
        if (user.status.is_banned) {
            await ctx.reply("User is banned. You can't accept him.");
            return;
        }
        if (Object.keys(user.answers).length == 0) {
            await ctx.reply("User has not answered any questions yet.");
            return;
        }

        await users.updateOne({ user_id: userId }, {
            $set: {
                answers: {},
                status: {
                    is_banned: false,
                    is_accepted: true
                }
            }
        }).then(async () => {
            const chatInvite = await ctx.createChatInviteLink({ member_limit: 1 });
            const link = chatInvite.invite_link;
            const message = format(messages['accepted'], { link: link });
            await ctx.api.sendMessage(userId, message, { disable_web_page_preview: true });

            await ctx.reply("User accepted successfully.");
        });
    });
}
