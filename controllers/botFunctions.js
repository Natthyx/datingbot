import User from '../models/User.js';
import { saveUserProfile, userProfiles, updateUserMessage } from './registration.js';

// Display menu for match searching
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

// Handles various callback queries such as match actions (like/dislike)
export const handleCallbackQuery = (bot) => {
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (data === 'show_menu') {
      displayMenu(bot, chatId);
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'gender') {
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
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'batchYear') {
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
// Function to find matches
export const lookForMatches = async (bot, chatId) => {
  const user = await User.findOne({ telegramId: chatId });

  if (!user) {
    bot.sendMessage(chatId, 'Please complete your registration first.');
  } else {
    const targetGender = user.gender === 'Male' ? 'Female' : 'Male';
    const matches = await User.find({
      gender: targetGender,
      telegramId: { $ne: user.telegramId }, // Use telegramId, not _id
    });

    if (matches.length > 0) {
      showNextProfile(bot, chatId, matches, 0); // Start showing profiles one by one
    } else {
      bot.sendMessage(chatId, 'No matches found at the moment.');
    }
  }
};
// Recursive function to display profiles one by one
const showNextProfile = async (bot, chatId, matches, index) => {
  if (index < matches.length) {
    const match = matches[index];
    const matchMessage = `Match found!\n\n` +
      `Name: ${match.name}\n` +
      `Bio: ${match.bio}\n` +
      `Gender: ${match.gender}\n` +
      `Batch of Year: ${match.batchYear}\n`;

    // Send images with the profile details
    await bot.sendMediaGroup(chatId, match.images.map((imageId, idx) => ({
      type: 'photo',
      media: imageId,
      caption: idx === 0 ? matchMessage : '', // Send profile details with the first image only
    })));

    // Send like and dislike buttons for the current profile
    bot.sendMessage(chatId, 'Do you like this profile?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Like', callback_data: `like_${match.telegramId}_${index}` }], // Use telegramId
          [{ text: 'Dislike', callback_data: `dislike_${match.telegramId}_${index}` }]
        ],
      },
    });
  } else {
    bot.sendMessage(chatId, "No more profiles to show.");
  }
};
// Handle the like and dislike actions
export const handleProfileActions = (bot) => {
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Extract action, profileId (the liked or disliked user), and index from callback data
    const [action, profileId, index] = data.split('_');

    // Handle like
    if (action === 'like') {
      await handleLike(bot, chatId, profileId);
      
      const nextIndex = parseInt(index) + 1;
      const matches = await User.find({
        telegramId: { $ne: chatId },  // Ensure not the same user
      });
      showNextProfile(bot, chatId, matches, nextIndex); // Show the next profile
    }

    // Handle dislike
    if (action === 'dislike') {
      const nextIndex = parseInt(index) + 1;
      const matches = await User.find({
        telegramId: { $ne: chatId },
      });
      showNextProfile(bot, chatId, matches, nextIndex); // Move to the next profile
    }

    // Handle like back (when both users like each other)
    if (action === 'likeback') {
      const likedTelegramId = profileId;  // The profile that this user liked

      try {
        const likingUser = await User.findOne({ telegramId: chatId });
        const likedUser = await User.findOne({ telegramId: likedTelegramId });

        if (likingUser && likedUser) {
          // Send usernames/contact to both users
          bot.sendMessage(likingUser.telegramId, `It's a match! You can contact ${likedUser.name} at @${likedUser.contact}`);
          bot.sendMessage(likedUser.telegramId, `It's a match! You can contact ${likingUser.name} at @${likingUser.contact}`);
        }
      } catch (err) {
        console.error('Error in handleProfileActions (likeback):', err);
        bot.sendMessage(chatId, "An error occurred while processing the like back. Please try again.");
      }
    }
  });
};



// Example function to handle like logic
const handleLike = async (bot, chatId, profileTelegramId) => {
  try {
    // Find the user who is liking and the user being liked
    const likingUser = await User.findOne({ telegramId: chatId });
    const likedUser = await User.findOne({ telegramId: profileTelegramId });

    // Check if likedUser exists
    if (!likedUser) {
      bot.sendMessage(chatId, "The user you're trying to like doesn't exist.");
      return;
    }

    // Notify the liked user with the profile details of the person who liked them
    const likingUserProfile = `Someone liked you!\n\n` +
      `Name: ${likingUser.name}\n` +
      `Bio: ${likingUser.bio}\n` +
      `Gender: ${likingUser.gender}\n` +
      `Batch of Year: ${likingUser.batchYear}\n`;

    // Send profile details to the liked user
    await bot.sendMediaGroup(likedUser.telegramId, likingUser.images.map((imageId, idx) => ({
      type: 'photo',
      media: imageId,
      caption: idx === 0 ? likingUserProfile : '', // Send profile details with the first image only
    })));

    // Ask the liked user if they want to like the person back
    bot.sendMessage(likedUser.telegramId, `Do you like ${likingUser.name}'s profile?`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Like back', callback_data: `likeback_${likingUser.telegramId}_${likedUser.telegramId}` }],
          [{ text: 'Dislike', callback_data: `dislike_${likingUser.telegramId}_${likedUser.telegramId}` }]
        ],
      },
    });
  } catch (err) {
    console.error('Error in handleLike:', err);
    bot.sendMessage(chatId, "An error occurred while processing your request. Please try again.");
  }
};
