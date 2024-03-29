import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { configuration, messages, types } from "../config.ts";
import { cancelMenu } from "../menus.ts";
import { Pastee } from "../pastee.ts";
import { BotConversation, BotContext, users } from "../index.ts";
import { format } from "https://deno.land/x/format@1.0.1/mod.ts";
import { testString } from "../gibberish.ts";

export async function work(conversation: BotConversation, ctx: BotContext) {
    const chatId = ctx.chat!.id;
    const key = await users.findOne({ user_id: ctx.from?.id }).then((user) => user?.in_progress!);
    if (key == null) {
        console.log(`!!! [WORK] ${ctx.from?.id} tried to work but the current key is null`);
        return;
    }
    const answers: string[] = [];
    const questions = types[key]['questions'];

    console.log(`[WORK] ${ctx.from?.id} is working on ${key}`);
    
    for (const questionKey in questions) {
        const questionData = questions[questionKey];

        const questionName = questionData['name'];
        const questionType = questionData['type'];
        // const questionRequired = questionData['required'];
        const questionMinLength = questionData['min_length'];
        const questionMaxLength = questionData['max_length'];
        const currentQuestion = (Object.keys(questions).indexOf(questionKey) + 1).toString();

        const questionMessage = (messages['question_template']).replace('{message}', questionName).replace('{number}', currentQuestion);
        await ctx.reply(questionMessage, { reply_markup: cancelMenu });

        let answerIsValid = false;
        while (!answerIsValid) {
            const reply = await conversation.waitFor(':text');

            if (reply == null) {
                // This technically should never happen, but just in case
                continue;
            }

            const replyText = reply.message?.text!;
            if (questionType === 'number') {
                const numberReply: number = parseInt(replyText);
                if (isNaN(numberReply)) {
                    await ctx.reply(messages['only_numbers_answer']);
                    continue;
                }
                answers.push(replyText);
                break;
            }
            if (replyText == null) {
                await ctx.reply(messages['answer_not_valid'].replace('{type}', questionType));
                continue;
            }
            if (configuration["gibberish_detection"] && !testString(replyText)) {
                await ctx.reply(messages["gibberish_detected"]);
                continue;
            }
            if ((replyText.length < questionMinLength) || (replyText.length > questionMaxLength)) {
                const message = messages['invalid_length']
                    .replace('{min}', questionMinLength.toString())
                    .replace('{max}', questionMaxLength.toString())
                    .replace('{length}', replyText.length.toString());
                await ctx.reply(message);
                continue;
            }
            answerIsValid = true;

            answers.push(replyText);
        }

    }

    const messageId = (await ctx.api.sendMessage(chatId, messages['sending_answers'])).message_id;
    await conversation.external(() => {
        users.updateOne({ user_id: ctx.from?.id }, {
            $set: {
                answers: {
                    [key]: answers
                },
                in_progress: null,
            }
        }).then(async () => {
            await sendAnswersToAdmin(ctx, key);
            console.log(`[WORK] ${ctx.from?.id} finished working on ${key}`);
        });
    }).then(async () => {
        await ctx.api.editMessageText(chatId, messageId, messages['work_done']);
    }).catch(async (err) => {
        await ctx.api.editMessageText(chatId, messageId, messages['error_while_working']);
        conversation.error("Error while sending answers to admin", err);

        // revert changes to the db
        await users.updateOne({ user_id: ctx.from?.id }, {
            $set: {
                answers: {},
                in_progress: null,
            }
        });
    });

    return;
}

const applicationKey = Deno.env.get("PASTEE_KEY")!;
const logGroupId = Deno.env.get("LOG_GROUP_ID")!;

async function sendAnswersToAdmin(ctx: BotContext, key: string) {
    const userId = ctx.from?.id;
    const userName = ctx.from?.first_name;
    const userAnswers = await users.findOne({ user_id: ctx.from?.id }).then((user) => user?.answers!);

    let answersStr = "";
    userAnswers[key].forEach((element, index) => {
        const properQuestion = types[key]['questions'][++index];
        const questionName = properQuestion['name'];
        answersStr += `Question ${index + 1} - ${questionName} \n` +
            `Answer:${element}` +
            `\n\n--------------------------------\n\n`;
    });

    const pasteJson = await new Pastee(answersStr, applicationKey, "text", `${userName} (${key}) application - ${new Date().toLocaleDateString()}`, "main", true).createPaste();
    const link = `https://paste.ee/r/${pasteJson['id']}`;
    const message = format(messages['new_application'], {
        userId: userId,
        userName: userName,
        link: link,
        type: key
    });
    await ctx.api.sendMessage(logGroupId, message, { disable_web_page_preview: true });
}