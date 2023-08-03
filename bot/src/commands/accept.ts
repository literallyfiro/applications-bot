import { format } from "https://deno.land/x/format@1.0.1/mod.ts";
import { messages } from '../config.ts';
import { BotContext, users } from '../index.ts';

export async function acceptCommand(ctx: BotContext) {
    const userId = Number(ctx.match?.toString());

    await users.findOne({ user_id: userId }).then(async (user) => {
        if (user == null) {
            await ctx.reply(messages['user_not_registered']);
            return;
        }
        if (user.status.is_accepted) {
            await ctx.reply(messages['user_already_accepted']);
            return;
        }
        if (user.status.is_banned) {
            await ctx.reply(messages['user_accept_banned']);
            return;
        }
        if (Object.keys(user.answers).length == 0) {
            await ctx.reply(messages['user_accept_no_questions']);
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

            await ctx.reply(messages['user_accepted']);
        });
    });
}
