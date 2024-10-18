import express from 'express';
import { startCommand, handleMessages } from '../controllers/registration.js';  // Import registration logic
import { handleCallbackQuery, lookForMatches } from '../controllers/botFunctions.js';  // Import general bot functionalities
import { handleProfileActions } from '../controllers/matchmaking.js'; // Import matchmaking actions

const router = express.Router();

export default (bot) => {
    // Register the bot commands for user interactions
    startCommand(bot);          // Handle /start command and registration flow
    handleMessages(bot);        // Handle text messages for registration
    handleCallbackQuery(bot);   // Handle general bot-related callback queries
    handleProfileActions(bot);  // Handle profile like/dislike actions

    // Handle callback queries for specific actions like looking for matches
    bot.on('callback_query', (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        // Handle 'look_for_matches' and 'check_matches' queries
        if (data === 'look_for_matches') {
            lookForMatches(bot, chatId);    // Function to look for matches
        } else if (data === 'check_matches') {
            checkMatches(bot, chatId);      // Function to check matched profiles
        }
    });

    return router;
};
