import { messages, types } from "./config.js";
import { cancelMenu } from "./index.js";

export async function work(conversation, ctx) {
    // await conversation.run(cancelMenu);
    const key = ctx.session.in_progress;
    const questionSize = Object.keys(types[key]['questions']).length;
    const answers = [];

    if (questionSize === 0) {
        ctx.reply('Questo tipo di candidatura non ha domande da rispondere.');
        return;
    }

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
                break;
            }
            if (replyText == null) {
                ctx.reply('Risposta non valida. Questa domanda accetta solo risposte di tipo ' + questionType)
                continue;
            }
            if ((replyText.length < questionMinLength) || (replyText.length > questionMaxLength)) {
                ctx.reply('La risposta non e" valida. Questa domanda deve essere lunga almeno '
                    + questionMinLength + ' caratteri e al massimo ' + questionMaxLength + ' caratteri. La tua risposta e" lunga ' + replyText.length + ' caratteri.')
                continue;
            }
            answerIsValid = true;

            answers.push(replyText);
            ctx.session.user_answers[ctx.from.id] = answers;
        }

    }

    ctx.reply(messages['work_done']);
    console.log(ctx.session.in_progress);
    ctx.session.in_progress = key;
    console.log(ctx.session.in_progress);
}