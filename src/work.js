import { messages, types } from "./config.js";
import { cancelMenu } from "./menus.js";
import { Pastee } from "./pastee.js";
import { format } from "util";

import { config } from 'dotenv';
config();

const applicationKey = process.env.PASTEE_KEY;
const logGroupId = process.env.LOG_GROUP_ID;


export async function work(conversation, ctx) {
    const key = conversation.session.in_progress;
    const answers = [];

    for (const questionKey in types[key]['questions']) {
        const questionData = types[key]['questions'][questionKey];
        const questionName = questionData['name'];
        const questionType = questionData['type'];
        // const questionRequired = questionData['required'];
        const questionMinLength = questionData['min_length'];
        const questionMaxLength = questionData['max_length'];
        const currentQuestion = Object.keys(types[key]['questions']).indexOf(questionKey) + 1;

        const questionMessage = (messages['question_template']).replace('{message}', questionName).replace('{number}', currentQuestion);

        let answerIsValid = false;
        while (!answerIsValid) {
            ctx.reply(questionMessage, { reply_markup: cancelMenu });
            const reply = await conversation.waitFor(':text');
            const replyText = reply.message?.text;
            if (questionType === 'number') {
                if (isNaN(replyText)) {
                    ctx.reply(messages['only_numbers_answer']);
                    continue;
                }
                answers.push(replyText);
                conversation.session.user_answers[key] = answers;
                break;
            }
            if (replyText == null) {
                ctx.reply(messages['answer_not_valid'].replace('{type}', questionType));
                continue;
            }
            if ((replyText.length < questionMinLength) || (replyText.length > questionMaxLength)) {
                const message = messages['invalid_length']
                    .replace('{min}', questionMinLength)
                    .replace('{max}', questionMaxLength)
                    .replace('{length}', replyText.length);
                ctx.reply(message);
                continue;
            }
            answerIsValid = true;

            answers.push(replyText);
            conversation.session.user_answers[key] = answers;
        }

    }

    await conversation.external(() => sendAnswersToAdmin(conversation, ctx));
    ctx.reply(messages['work_done']);
    delete conversation.session.in_progress;
}

async function sendAnswersToAdmin(conversation, ctx) {
    const key = conversation.session.in_progress;
    const userAnswers = conversation.session.user_answers;
    const userId = ctx.from.id;
    const userName = ctx.from.first_name;

    let answersStr = "";
    userAnswers[key].forEach((element, index) => {
        const properQuestion = types[key]['questions'][++index];
        const questionName = properQuestion['name'];
        answersStr += `Domanda ${index + 1} - ${questionName} \n` +
            `Risposta:${element}` +
            `\n\n--------------------------------\n\n`;
    });

    const pasteJson = await new Pastee(answersStr, applicationKey, "text", `Provino di ${userName} - ${new Date().toLocaleDateString()}`, "main", true).createPaste();
    const link = `https://paste.ee/r/${pasteJson['id']}`;
    const message = format(messages['new_application'], userId, userName, userId, link);

    await ctx.api.sendMessage(logGroupId, message, { link_preview: false });
}