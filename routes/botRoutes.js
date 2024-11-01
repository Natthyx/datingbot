import express from 'express';
import { startCommand, handleMessages, handleEditProfile,handleEditProfileCallbacks, handleEditMessages } from '../controllers/registration.js';  
import { handleCallbackQuery, lookForMatches, handleProfileActions, checkMatches, myProfile } from '../controllers/botFunctions.js';  

const router = express.Router();

export default (bot) => {
    startCommand(bot);          // Handle /start command and registration flow
    handleMessages(bot);        // Handle text messages for registration
    handleCallbackQuery(bot);   // Handle general bot-related callback queries
    handleProfileActions(bot);  // Handle like/dislike actions
    handleEditProfile(bot);     // Handle profile edit requests
    handleEditProfileCallbacks(bot); // Handle callback queries for edit profile
    handleEditMessages(bot);
    


    // Handle menu actions based on user message input
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;

        if (msg.text === 'My Profile') {
            myProfile(bot, chatId);  // Initiate the match-finding process
        }
        else if (msg.text === 'Look for matches') {
            lookForMatches(bot, chatId);  // Initiate the match-finding process
        }
        // Check matches option
        else if (msg.text === 'Check matches') {
            checkMatches(bot, chatId, 0);  // Initiate the check match list process
        }
        else if (msg.text === 'Edit Profile') {
            bot.sendMessage(chatId, 'What would you like to edit?', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Name', callback_data: 'edit_name' }],
                        [{ text: 'Bio', callback_data: 'edit_bio' }],
                        [{ text: 'Cancel', callback_data: 'cancel_edit' }],
                    ],
                },
            });
        }
    });

    return router;
};
