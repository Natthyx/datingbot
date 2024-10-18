import User from '../models/User.js';
import { saveUserProfile, userProfiles, updateUserMessage } from './registration.js';

// Display menu
export const displayMenu = (bot, chatId) => {
  bot.sendMessage(chatId, 'Please choose an option:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Look for matches', callback_data: 'look_for_matches' }],
        [{ text: 'Check matches', callback_data: 'check_matches' }],
      ],
    },
  });
};

export const handleCallbackQuery = (bot) => {
    bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;
  
      // Initialize user profile if it doesn't exist
      if (!userProfiles[chatId]) {
        userProfiles[chatId] = { step: 'gender' }; // Initialize profile with first step
      }
  
      if (data === 'show_menu') {
        displayMenu(bot, chatId);
      } else if (userProfiles[chatId].step === 'gender') {
        userProfiles[chatId].gender = data;
        userProfiles[chatId].step = 'batchYear';
        updateUserMessage(chatId, 'What is your batch year?', bot, [
          [{ text: '2012', callback_data: '2012' }],
          [{ text: '2013', callback_data: '2013' }],
          [{ text: '2014', callback_data: '2014' }],
          [{ text: '2015', callback_data: '2015' }],
          [{ text: '2016', callback_data: '2016' }],
          [{ text: '2017', callback_data: '2017' }],
        ]);
      } else if (userProfiles[chatId].step === 'batchYear') {
        userProfiles[chatId].batchYear = data;
        userProfiles[chatId].step = 'bio';
        updateUserMessage(chatId, 'Tell us a little about yourself (a short bio).', bot);
      } else if (data === 'done_images') {
        userProfiles[chatId].step = 'finish';
        bot.sendMessage(chatId, 'You\'ve finished uploading images.');
        saveUserProfile(chatId, bot, callbackQuery);
      }
    });
  };
  

// Match functionality
export const lookForMatches = async (bot, chatId) => {
  const user = await User.findOne({ telegramId: chatId });

  if (!user) {
    bot.sendMessage(chatId, 'Please complete your registration first.');
  } else {
    const targetGender = user.gender === 'Male' ? 'Female' : 'Male';

    bot.sendMessage(chatId, `Looking for matches of gender: ${targetGender}...`);

    const matches = await User.find({
      gender: targetGender,
      _id: { $ne: user._id },
    });

    if (matches.length > 0) {
      for (const match of matches) {
        const matchMessage = `Match found!\n\n` +
          `Name: ${match.name}\n` +
          `Bio: ${match.bio}\n` +
          `Gender: ${match.gender}\n` +
          `Batch of Year: ${match.batchYear}\n`;

        await bot.sendMediaGroup(chatId, match.images.map((imageId, index) => ({
          type: 'photo',
          media: imageId,
          caption: index === 0 ? matchMessage : '', // Send profile details with the first image only
        })));
      }
    } else {
      bot.sendMessage(chatId, 'No matches found at the moment.');
    }
  }
};
