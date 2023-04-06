import {messages} from '../config';
import {BotContext, sessions} from '../index';
import {TempData} from '../session';
import {format} from "util";

export async function acceptCommand(ctx: BotContext) {
    const id: string = ctx.match?.toString()!;

    await sessions.findOne({key: id}).then(async (user) => {
        if (user == null) {
            await ctx.reply("User is not registered.");
            return;
        }
        const userData = (user.value as TempData).__d;
        if (userData.accepted) {
            await ctx.reply("User is already accepted.");
            return;
        }
        if (Object.keys(userData.user_answers).length == 0) {
            await ctx.reply("User has not answered any questions yet.");
            return;
        }
        if (userData.banned) {
            await ctx.reply("User is banned. You can't accept him.");
            return;
        }

        await sessions.updateOne({key: id}, {
            $set: {
                "value.__d.user_answers": {},
                "value.__d.accepted": true
            }
        }).then(async () => {
            const chatInvite = await ctx.createChatInviteLink({member_limit: 1});
            const link = chatInvite.invite_link;
            const message = format(messages['accepted'], link);
            await ctx.api.sendMessage(id!, message, {disable_web_page_preview: true});

            await ctx.reply("User accepted successfully.");
        });
    });
}
