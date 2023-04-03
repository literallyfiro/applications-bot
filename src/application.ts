import { messages, types } from "./config";
import { cancelMenu } from "./menus.js";
import { Pastee } from "./pastee";
import { format } from "util";

import { config } from 'dotenv';
import { Conversation } from "@grammyjs/conversations";
import { BotContext } from "./index.js";
config();

const applicationKey = process.env.PASTEE_KEY!;
const logGroupId: number = parseInt(process.env.LOG_GROUP_ID!);


export async function work(conversation: Conversation<BotContext>, ctx: BotContext) {
    const chatId = ctx.chat!.id;
    const key = conversation.session.in_progress!;
    const answers: string[] = [];
    const questions = types[key]['questions'];

    for (const questionKey in questions) {
        const questionData = questions[questionKey];

        const questionName = questionData['name'];
        const questionType = questionData['type'];
        // const questionRequired = questionData['required'];
        const questionMinLength = questionData['min_length'];
        const questionMaxLength = questionData['max_length'];
        const currentQuestion = (Object.keys(questions).indexOf(questionKey) + 1).toString();

        const questionMessage = (messages['question_template']).replace('{message}', questionName).replace('{number}', currentQuestion);

        let answerIsValid = false;
        while (!answerIsValid) {
            await ctx.reply(questionMessage, { reply_markup: cancelMenu });
            const reply = await conversation.waitFor(':text');

            if (reply == null) {
                // This technically should never happen, but just in case
                continue;
            }

            const replyText = reply.message?.text!;
            if (questionType === 'number') {
                let numberReply: number = parseInt(replyText);
                if (isNaN(numberReply)) {
                    await ctx.reply(messages['only_numbers_answer']);
                    continue;
                }
                answers.push(replyText);
                conversation.session.user_answers[key] = answers;
                break;
            }
            if (replyText == null) {
                await ctx.reply(messages['answer_not_valid'].replace('{type}', questionType));
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
            conversation.session.user_answers[key] = answers;
        }

    }

    const messageId = (await ctx.api.sendMessage(chatId, messages['sending_answers'])).message_id;
    await conversation.external(async () => await sendAnswersToAdmin(conversation, ctx)).then(async () => {
        await ctx.api.editMessageText(chatId, messageId, messages['work_done']);
    }).catch(async (err) => {
        await ctx.api.editMessageText(chatId, messageId, messages['error_while_working']);
        console.error(err);
    });
    
    conversation.session.in_progress = undefined;
    return;
}

async function sendAnswersToAdmin(conversation: Conversation<BotContext>, ctx: BotContext) {
    const key = conversation.session.in_progress!;
    const userAnswers = conversation.session.user_answers;
    const userId = ctx.from?.id;
    const userName = ctx.from?.first_name;

    let answersStr = "";
    userAnswers[key].forEach((element, index) => {
        const properQuestion = types[key]['questions'][++index];
        const questionName = properQuestion['name'];
        answersStr += `Domanda ${index + 1} - ${questionName} \n` +
            `Risposta:${element}` +
            `\n\n--------------------------------\n\n`;
    });

    const pasteJson = await new Pastee(answersStr, applicationKey, "text", `${userName} (${key}) application - ${new Date().toLocaleDateString()}`, "main", true).createPaste();
    const link = `https://paste.ee/r/${pasteJson['id']}`;
    const message = format(messages['new_application'], userId, userName, userId, link);

    await ctx.api.sendMessage(logGroupId, message, { disable_web_page_preview: true });
}