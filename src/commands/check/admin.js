import { config } from 'dotenv';
config();

const adminGroupId = process.env.ADMIN_GROUP_ID;

export async function checkGroupAndAdmin(ctx) {
    if (ctx.chat.id != adminGroupId) {
        return false;
    }
    // Check if user is admin
    const chatAdministrators = await ctx.api.getChatAdministrators(ctx.chat.id)
    if (chatAdministrators.find(x => x.user.id == ctx.from.id) == undefined) {
        return false;
    }
}