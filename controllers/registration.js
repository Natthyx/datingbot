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
      
      // Send welcome back message and display menu
      bot.sendMessage(chatId, `Welcome back, ${existingUser.name}! You are already registered.`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Menu', callback_data: 'show_menu' }],
          ],
        },
      });
    } else {
      // For new users, proceed with registration
      bot.sendMessage(chatId, 'Welcome to the Dating Bot! What\'s your name?');
      userProfiles[chatId] = { step: 'name' };
    }
  });
};

// Handle text messages for registration
export const handleMessages = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Proceed with registration based on the current step
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
      bot.sendMessage(chatId, 'Please upload up to 3 images (you can send them together or one by one).');
    } 
    else if (userProfiles[chatId] && userProfiles[chatId].step === 'images') {
      if (msg.photo) {
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
    }
  });
};

// Save user profile and handle image uploads
export const saveUserProfile = async (chatId, bot, callbackQuery = null) => {
  try {
    const contact = callbackQuery ? callbackQuery.from.id : chatId;  // Fallback to chatId if callbackQuery is undefined
    const username = callbackQuery ? callbackQuery.from.username : null ;
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

    // Send profile summary
    let profileMessage = `Your profile is successfully registered:\n\n` +
      `Name: ${newUser.name}\n` +
      `Gender: ${newUser.gender}\n` +
      `Bio: ${newUser.bio}\n` +
      `Batch of Year: ${newUser.batchYear}\n`;

    // Send images with captioned profile data
    if (newUser.images.length > 0) {
      await bot.sendMediaGroup(chatId, newUser.images.map((imageId, index) => ({
        type: 'photo',
        media: imageId,
        caption: index === 0 ? profileMessage : '', // Send profile details with the first image only
      })));
    } else {
      bot.sendMessage(chatId, profileMessage);
    }
    // Display menu after registration
    displayMenu(bot, chatId);
  } catch (error) {
    console.error('Error saving user:', error);
    bot.sendMessage(chatId, 'Error saving your profile. Please try again. Press /start');
  }
};

// Update user messages (edit or send a new message)
export const updateUserMessage = async (chatId, text, bot, inlineKeyboard = null) => {
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
