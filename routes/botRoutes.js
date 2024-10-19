import express from 'express';
import { startCommand, handleMessages } from '../controllers/registration.js';  
import { handleCallbackQuery, lookForMatches, handleProfileActions } from '../controllers/botFunctions.js';  

const router = express.Router();

export default (bot) => {
    startCommand(bot);          // Handle /start command and registration flow
    handleMessages(bot);        // Handle text messages for registration
    handleCallbackQuery(bot);   // Handle general bot-related callback queries
    handleProfileActions(bot);  // Handle like/dislike actions

    // Handle callback queries for match actions like 'look_for_matches'
    bot.on('callback_query', (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        if (data === 'look_for_matches') {
            lookForMatches(bot, chatId);  // Initiate the match-finding process
        }
    });

    return router;
};
