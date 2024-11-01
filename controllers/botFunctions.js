import User from '../models/User.js';
import { saveUserProfile, userProfiles, updateUserMessage } from './registration.js';

// Display menu for match searching
export const displayMenu = (bot, chatId) => {
  bot.sendMessage(chatId, 'Please choose an option:', {
    reply_markup: {
      keyboard: [
        [{ text: 'Look for matches', callback_data: 'look_for_matches' }],
        [{ text: 'Check matches', callback_data: 'check_matches' }],
        [{ text: 'Edit Profile', callback_data: 'edit_profile' }], // Added Edit Profile
        [{ text: 'My Profile', callback_data: 'my_profile' }], // Added Show Profile
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
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
    if (data.startsWith('next_page_')) {
      const page = parseInt(data.split('_')[2]);
      await checkMatches(bot, chatId, page); // Fetch the next page of profiles
    }

    if (data.startsWith('prev_page_')) {
      const page = parseInt(data.split('_')[2]);
      await checkMatches(bot, chatId, page); // Fetch the previous page of profiles
    }
  });
};

// Function to display the user's own profile with photo and info as caption
export const myProfile = async (bot, chatId) => {
    // Fetch the user's profile from the database
    const user = await User.findOne({ telegramId: chatId });

    // Send profile summary
    let profileMessage = `Your profile\n\n` +
      `Name: ${user.name}\n` +
      `Gender: ${user.gender}\n` +
      `Bio: ${user.bio}\n` +
      `Batch of Year: ${user.batchYear}\n`;

    // Send images with captioned profile data
    if (user.images.length > 0) {
      await bot.sendMediaGroup(chatId, user.images.map((imageId, index) => ({
        type: 'photo',
        media: imageId,
        caption: index === 0 ? profileMessage : '', // Send profile details with the first image only
      })));
    } else {
      bot.sendMessage(chatId, profileMessage);
    }
};

// Function to find matches
export const lookForMatches = async (bot, chatId) => {
  const user = await User.findOne({ telegramId: chatId });

  if (!user) {
    bot.sendMessage(chatId, 'Please complete your registration first.');
  } else {
    const targetGender = user.gender === 'Male' ? 'Female' : 'Male';
    let matches = await User.find({
      gender: targetGender,
      telegramId: { $ne: user.telegramId }, // Exclude the user themselves
    });

    if (matches.length > 0) {
      displayRandomizedProfiles(bot, chatId, matches);
    } else {
      bot.sendMessage(chatId, 'No matches found at the moment.');
    }
  }
};

// Function to display profiles in a new randomized order each loop
const displayRandomizedProfiles = (bot, chatId, matches) => {
  const shuffledMatches = shuffleArray([...matches]); // Shuffle matches each loop
  showNextProfile(bot, chatId, shuffledMatches, 0); // Start at index 0
};

// Recursive function to display profiles one by one
const showNextProfile = async (bot, chatId, matches, index) => {
  if (index >= matches.length) {
    displayRandomizedProfiles(bot, chatId, matches); // Start a new loop
    return;
  }

  const match = matches[index];

  // Profile details message
  const matchMessage = 
    `Possible Match!\n\n` +
    `Name: ${match.name}\n` +
    `Bio: ${match.bio}\n` +
    `Gender: ${match.gender}\n` +
    `Batch of Year: ${match.batchYear}\n`;

  // Send images with the profile details
  await bot.sendMediaGroup(chatId, match.images.map((imageId, idx) => ({
    type: 'photo',
    media: imageId,
    caption: idx === 0 ? matchMessage : '', // Only include profile info in the first image caption
  })));

  // Send like and next buttons
  bot.sendMessage(chatId, 'Do you like this profile?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '❤️', callback_data: `like_${match.telegramId}_${index}` }],
        [{ text: '👎', callback_data: `next_${index}` }]
      ],
    },
  });

  // Remove previous listener to avoid duplicate callback handling
  bot.removeAllListeners('callback_query');

  // Listen for the callback only once
  bot.once('callback_query', async (query) => {
    if (query.data === `next_${index}`) {
      // Display the next profile
      showNextProfile(bot, chatId, matches, index + 1);
    } else if (query.data.startsWith('like_')) {
      // Handle the like action here if needed
      bot.sendMessage(chatId, "You liked this profile!");
      // You can also proceed to the next profile if desired
      showNextProfile(bot, chatId, matches, index + 1);
    }

    // Answer the callback to remove the loading state
    bot.answerCallbackQuery(query.id);
  });
};

// Helper function to shuffle an array (randomize)
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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
      // Update the liking user's likes array (store the likedUser's telegramId)
      if (!likingUser.likes.includes(likedTelegramId)) {
        likingUser.likes.push(likedTelegramId);
        await likingUser.save(); // Save the updated liking user
      }

      // Update the liked user's likedBy array (store the likingUser's telegramId)
      if (!likedUser.likedBy.includes(chatId)) {
        likedUser.likedBy.push(chatId);
        await likedUser.save(); // Save the updated liked user
      }

      // Determine contact info (use username if available, fallback to telegramId link)
      const likingUserContact = likingUser.username 
        ? `@${likingUser.username}` 
        : `<a href="tg://user?id=${likingUser.telegramId}">${likingUser.name}</a>`;
      const likedUserContact = likedUser.username 
        ? `@${likedUser.username}` 
        : `<a href="tg://user?id=${likedUser.telegramId}">${likedUser.name}</a>`;

      // Send contact info to both users
      bot.sendMessage(likingUser.telegramId, `It's a match! You can contact ${likedUser.name} at ${likedUserContact}`,{ parse_mode: 'HTML' });
      bot.sendMessage(likedUser.telegramId, `It's a match! You can contact ${likingUser.name} at ${likingUserContact}`,{ parse_mode: 'HTML' });
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
    // Update the liking user's likes array (store the likedUser's telegramId)
    if (!likingUser.likes.includes(profileTelegramId)) {
      likingUser.likes.push(profileTelegramId);
    }

    // Update the liked user's likedBy array (store the likingUser's telegramId)
    if (!likedUser.likedBy.includes(chatId)) {
      likedUser.likedBy.push(chatId);
    }

    // Save both users' data in the database
    await likingUser.save();
    await likedUser.save();

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
          [{ text: '❤️ Like Back', callback_data: `likeback_${likingUser.telegramId}_${likedUser.telegramId}` }],
          [{ text: '👎 Dislike', callback_data: `dislike_${likingUser.telegramId}_${likedUser.telegramId}` }]
        ],
      },
    });
  } catch (err) {
    console.error('Error in handleLike:', err);
    bot.sendMessage(chatId, "An error occurred while processing your request. Please try again.");
  }
};

// Check Match List Functionality with Pagination
export const checkMatches = async (bot, chatId, page = 0) => {
  try {
    // Find the user by Telegram ID
    const user = await User.findOne({ telegramId: chatId });

    if (!user) {
      bot.sendMessage(chatId, 'Please complete your registration first.');
      return;
    }

    if (user.likes.length === 0) {
      bot.sendMessage(chatId, 'You have no matches yet.');
      return;
    }

    // Find mutual matches (users who liked each other)
    const mutualMatches = await User.find({
      telegramId: { $in: user.likes },
      likes: chatId, // Ensure they also liked this user
    });

    if (mutualMatches.length === 0) {
      bot.sendMessage(chatId, 'No mutual matches found.');
      return;
    }

    // Set up pagination - show 4 profiles at a time
    const profilesPerPage = 4;
    const totalPages = Math.ceil(mutualMatches.length / profilesPerPage);
    const currentPageMatches = mutualMatches.slice(page * profilesPerPage, (page + 1) * profilesPerPage);

    for (const match of currentPageMatches) {
      const profileInfo = 
        `Name: ${match.name}\n`+
        `Bio: ${match.bio}\n`+
        `Gender: ${match.gender}\n`+
        `Batch Year: ${match.batchYear}\n`;

      const contact = match.username
        ? `@${match.username}`
        : `<a href="tg://user?id=${match.telegramId}">${match.name}</a>`;

      // Send the profile image with details (caption with first image)
      await bot.sendMediaGroup(chatId, match.images.map((imageId, idx) => ({
        type: 'photo',
        media: imageId,
        caption: idx === 0 ? `${profileInfo}\n\nYou can contact them at ${contact}` : '',
        parse_mode: 'HTML',
      })));
    }

    // Set up next/previous buttons if necessary
    const inlineKeyboard = [];

    if (page > 0) {
      inlineKeyboard.push([{ text: 'Previous', callback_data: `prev_page_${page - 1}` }]);
    }

    if (page < totalPages - 1) {
      inlineKeyboard.push([{ text: 'Next', callback_data: `next_page_${page + 1}` }]);
    }

    // Send navigation buttons
    if (inlineKeyboard.length > 0) {
      bot.sendMessage(chatId, 'Navigate profiles:', {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    }

  } catch (err) {
    console.error('Error fetching matches:', err);
    bot.sendMessage(chatId, 'An error occurred while fetching your matches.');
  }
};