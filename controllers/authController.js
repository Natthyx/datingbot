import User from '../models/User.js';

let userProfiles = {};

// Start command
export const startCommand = (bot) => {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Check if the user already exists in the database
    const existingUser = await User.findOne({ telegramId: chatId });

    if (existingUser) {
      bot.sendMessage(chatId, `Welcome back, ${existingUser.name}! You are already registered.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Menu', callback_data: 'show_menu' }],
          ],
        },
      });
    } else {
      bot.sendMessage(chatId, 'Welcome to the Dating Bot! What\'s your name?');
      userProfiles[chatId] = { step: 'name' };
    }
  });
};

// Handle text messages
export const handleMessages = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (userProfiles[chatId] && userProfiles[chatId].step === 'name') {
      if (msg.text.startsWith('/')) {
        bot.sendMessage(chatId, 'Invalid name, please enter your real name.');
        return;
      }
      userProfiles[chatId].name = msg.text;
      userProfiles[chatId].step = 'gender';
      updateUserMessage(chatId, 'Please select your gender:', bot, [
        [{ text: 'Male', callback_data: 'Male' }],
        [{ text: 'Female', callback_data: 'Female' }],
      ]);
    } 
    else if (userProfiles[chatId] && userProfiles[chatId].step === 'bio') {
      userProfiles[chatId].bio = msg.text;
      userProfiles[chatId].step = 'images';
      // Sending a new message for the image upload prompt
      bot.sendMessage(chatId, 'Please upload up to 3 images (you can send them together or one by one).');
    } 
    else if (userProfiles[chatId] && userProfiles[chatId].step === 'images') {
      if (msg.photo) {
        if (!userProfiles[chatId].images) {
          userProfiles[chatId].images = [];
        }
    
        // Ensure we only take the last (highest resolution) photo from each message
        const imageId = msg.photo[msg.photo.length - 1].file_id;
    
        if (!userProfiles[chatId].images.includes(imageId)) {
          if (userProfiles[chatId].images.length < 3) {
            userProfiles[chatId].images.push(imageId);
          }
        }
    
        // After all photos are processed, check if we need to send the "Done" message
        if (userProfiles[chatId].images.length < 3) {
          bot.sendMessage(chatId, 'Image uploaded! Please send another image or click "Done".', {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Done', callback_data: 'done_images' }],
              ],
            },
          });
        } else {
          userProfiles[chatId].step = 'finish';
          saveUserProfile(chatId, bot);
        }
      }
    }
    
    
  });
};

// Handle callback queries
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

// Save user profile and handle image uploads
const saveUserProfile = async (chatId, bot,callbackQuery=null) => {
  try {
    const contact = callbackQuery 
      ? callbackQuery.from.username || callbackQuery.from.id 
      : chatId;  // Fallback to chatId if callbackQuery is undefined

    const newUser = new User({
      telegramId: chatId,
      name: userProfiles[chatId].name,
      gender: userProfiles[chatId].gender,
      bio: userProfiles[chatId].bio,
      batchYear: userProfiles[chatId].batchYear,
      images: userProfiles[chatId].images || [],
      contact,
    });

    await newUser.save();

    // Send profile summary with all images together and one caption
    let profileMessage = `Your profile:\n\n` +
      `Name: ${newUser.name}\n` +
      `Gender: ${newUser.gender}\n` +
      `Bio: ${newUser.bio}\n` +
      `Batch of Year: ${newUser.batchYear}\n`;

    // Send the images in one media group with a single caption
    if (newUser.images.length > 0) {
      await bot.sendMediaGroup(chatId, newUser.images.map((imageId) => ({
        type: 'photo',
        media: imageId,
        caption:profileMessage,
      })));
    }

    displayMenu(bot, chatId);
  } catch (error) {
    console.error('Error saving user:', error);
    bot.sendMessage(chatId, 'Error saving your profile. Please try again.');
  }
};

// Update user messages (edit or send a new message)
const updateUserMessage = async (chatId, text, bot, inlineKeyboard = null) => {
  const options = inlineKeyboard
    ? { reply_markup: { inline_keyboard: inlineKeyboard } }
    : {};

  if (userProfiles[chatId] && userProfiles[chatId].messageId) {
    try {
      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: userProfiles[chatId].messageId,
        ...options,
      });
    } catch (error) {
      console.error("Error editing message:", error.message);
      bot.sendMessage(chatId, text, options).then((sentMessage) => {
        userProfiles[chatId].messageId = sentMessage.message_id;
      });
    }
  } else {
    bot.sendMessage(chatId, text, options).then((sentMessage) => {
      userProfiles[chatId].messageId = sentMessage.message_id;
    });
  }
};

// Display menu
const displayMenu = (bot, chatId) => {
  bot.sendMessage(chatId, 'Please choose an option:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Look for matches', callback_data: 'look_for_matches' }],
        [{ text: 'Check matches', callback_data: 'check_matches' }],
      ],
    },
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
      _id: { $ne: user._id }
    });

    if (matches.length > 0) {
      for (const match of matches) {
        const matchMessage = `Match found!\n\n` +
          `Name: ${match.name}\n` +
          `Bio: ${match.bio}\n` +
          `Gender: ${match.gender}\n` +
          `Batch of Year: ${match.batchYear}\n`;

        await bot.sendMediaGroup(chatId, match.images.map((imageId) => ({
          type: 'photo',
          media: imageId,
          caption:matchMessage,
        })));

        
      }
    } else {
      bot.sendMessage(chatId, 'No matches found at the moment. Please check back later.');
    }
  }
};

export const checkMatches = async (bot, chatId) => {
  bot.sendMessage(chatId, 'Fetching your matches...');
};
