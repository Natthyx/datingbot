import express from 'express';
import { startCommand, handleMessages, handleCallbackQuery, lookForMatches, checkMatches } from '../controllers/authController.js';

const router = express.Router();

export default (bot) => {
    startCommand(bot);
    handleMessages(bot);
    handleCallbackQuery(bot);

    bot.on('callback_query', (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data === 'look_for_matches') {
            lookForMatches(bot, chatId);
        } else if (data === 'check_matches') {
            checkMatches(bot, chatId);
        }
    });

    return router;
};
