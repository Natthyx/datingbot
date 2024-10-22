import express from 'express';
import { startCommand, handleMessages } from '../controllers/registration.js';  
import { handleCallbackQuery, lookForMatches, handleProfileActions, checkMatches } from '../controllers/botFunctions.js';  

const router = express.Router();

export default (bot) => {
    startCommand(bot);          // Handle /start command and registration flow
    handleMessages(bot);        // Handle text messages for registration
    handleCallbackQuery(bot);   // Handle general bot-related callback queries
    handleProfileActions(bot);  // Handle like/dislike actions

    // Handle callback queries for match actions like 'look_for_matches'
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        

        if (msg.text === 'Look for matches') {
            lookForMatches(bot, chatId);  // Initiate the match-finding process
        }
        // Check matches option
    if (msg.text === 'Check matches') {
        checkMatches(bot, chatId, 0);  // Initiate the check match list process
      }
    });

    

    return router;
};
