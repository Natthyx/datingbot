import User from '../models/User.js';
import { displayMenu } from './botFunctions.js';

export let userProfiles = {};

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

// Handle text messages for registration
export const handleMessages = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Check if the message is a command (e.g., /start) and ignore it if not needed for the current step
    if (msg.text && msg.text.startsWith('/')) {
      return;
    }

    // Registration steps based on the current state
    if (userProfiles[chatId]?.step === 'name') {
      if (typeof msg.text !== 'string' || !msg.text.trim()) {
        bot.sendMessage(chatId, 'Invalid name. Please enter a valid name.');
        return;
      }
      userProfiles[chatId].name = msg.text;
      userProfiles[chatId].step = 'gender';
      updateUserMessage(chatId, 'Please select your gender:', bot, [
        [{ text: 'Male', callback_data: 'Male' }],
        [{ text: 'Female', callback_data: 'Female' }],
      ]);
    } 
    else if (userProfiles[chatId]?.step === 'bio') {
      if (typeof msg.text !== 'string' || !msg.text.trim()) {
        bot.sendMessage(chatId, 'Invalid bio. Please enter a short bio.');
        return;
      }
      userProfiles[chatId].bio = msg.text;
      userProfiles[chatId].step = 'images';
      bot.sendMessage(chatId, 'Please upload up to 3 images (you can send them together or one by one).');
    } 
    else if (userProfiles[chatId]?.step === 'images') {
      if (!msg.photo) {
        bot.sendMessage(chatId, 'Invalid input. Please send an image.');
        return;
      }
      
      if (!userProfiles[chatId].images) {
        userProfiles[chatId].images = [];
      }

      const imageId = msg.photo[msg.photo.length - 1].file_id;
      if (!userProfiles[chatId].images.includes(imageId)) {
        if (userProfiles[chatId].images.length < 3) {
          userProfiles[chatId].images.push(imageId);
        }
      }

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
  });
};

// Save user profile and handle image uploads
export const saveUserProfile = async (chatId, bot, callbackQuery = null) => {
  try {
    const contact = callbackQuery ? callbackQuery.from.id : chatId;
    const username = callbackQuery ? callbackQuery.from.username : null;
    const newUser = new User({
      telegramId: chatId,
      name: userProfiles[chatId].name,
      gender: userProfiles[chatId].gender,
      bio: userProfiles[chatId].bio,
      batchYear: userProfiles[chatId].batchYear,
      images: userProfiles[chatId].images || [],
      contact,
      username,
    });

    await newUser.save();

    let profileMessage = `Your profile is successfully registered:\n\n` +
      `Name: ${newUser.name}\n` +
      `Gender: ${newUser.gender}\n` +
      `Bio: ${newUser.bio}\n` +
      `Batch of Year: ${newUser.batchYear}\n`;

    if (newUser.images.length > 0) {
      await bot.sendMediaGroup(chatId, newUser.images.map((imageId, index) => ({
        type: 'photo',
        media: imageId,
        caption: index === 0 ? profileMessage : '',
      })));
    } else {
      bot.sendMessage(chatId, profileMessage);
    }
    displayMenu(bot, chatId);
  } catch (error) {
    console.error('Error saving user:', error);
    bot.sendMessage(chatId, 'Error saving your profile. Please try again.');
  }
};

// Update user messages (edit or send a new message)
export const updateUserMessage = async (chatId, text, bot, inlineKeyboard = null) => {
  const options = inlineKeyboard
    ? { reply_markup: { inline_keyboard: inlineKeyboard } }
    : {};

  if (userProfiles[chatId]?.messageId) {
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

// Handle edit profile
export const handleEditProfile = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text === 'Edit Profile') {
      const user = await User.findOne({ telegramId: chatId });
      if (!user) bot.sendMessage(chatId, 'You are not registered. Please register first.');
    }
  });
};

export const handleEditMessages = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ telegramId: chatId });

    if (userProfiles[chatId]?.step === 'edit_name') {
      const newName = msg.text;
      if (!newName || newName.startsWith('/')) {
        bot.sendMessage(chatId, 'Invalid name. Please enter your new name without commands.');
        return;
      }
      await User.findOneAndUpdate({ telegramId: chatId }, { name: newName });
      bot.sendMessage(chatId, `Name updated to: ${newName}`);
      userProfiles[chatId] = {};
    } else if (userProfiles[chatId]?.step === 'edit_bio') {
      const newBio = msg.text;
      if (!newBio || newBio.startsWith('/')) {
        bot.sendMessage(chatId, 'Invalid bio. Please enter a valid bio.');
        return;
      }
      await User.findOneAndUpdate({ telegramId: chatId }, { bio: newBio });
      bot.sendMessage(chatId, `Bio updated to: ${newBio}`);
      userProfiles[chatId] = {};
    }
  });
};

// Handle edit profile callbacks
export const handleEditProfileCallbacks = (bot) => {
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    const user = await User.findOne({ telegramId: chatId });

    if (data === 'edit_name') {
      userProfiles[chatId] = { step: 'edit_name' };
      bot.sendMessage(chatId, 'Please enter your new name:');
    } else if (data === 'edit_bio') {
      userProfiles[chatId] = { step: 'edit_bio' };
      bot.sendMessage(chatId, 'Please enter your new bio:');
    } else if (data === 'cancel_edit') {
      bot.sendMessage(chatId, 'Edit cancelled.');
      userProfiles[chatId] = {};
    }
  });
};
