import User from '../models/User.js';

let userProfiles = {};

export const startCommand = (bot) => {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Check if the user already exists in the database
    const existingUser = await User.findOne({ telegramId: chatId });

    if (existingUser) {
      bot.sendMessage(chatId, `Welcome back, ${existingUser.name}! You are already registered.`);
    } else {
      userProfiles[chatId] = { step: 'name' };
      bot.sendMessage(chatId, 'Welcome to the Dating Bot! What\'s your name?');
    }
  });
};

export const handleMessages = (bot) => {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (userProfiles[chatId] && userProfiles[chatId].step === 'name') {
      userProfiles[chatId].name = msg.text;
      userProfiles[chatId].step = 'age';
      bot.sendMessage(chatId, `Nice to meet you, ${msg.text}! How old are you?`);
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'age') {
      userProfiles[chatId].age = msg.text;
      userProfiles[chatId].step = 'gender';
      bot.sendMessage(chatId, 'Please select your gender:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Male', callback_data: 'Male' }],
            [{ text: 'Female', callback_data: 'Female' }],
            [{ text: 'Other', callback_data: 'Other' }],
          ],
        },
      });
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'bio') {
      userProfiles[chatId].bio = msg.text;
      userProfiles[chatId].step = 'classYear';
      bot.sendMessage(chatId, 'What is your class year?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Freshman', callback_data: 'Freshman' }],
            [{ text: '2nd Year', callback_data: '2nd Year' }],
            [{ text: '3rd Year', callback_data: '3rd Year' }],
            [{ text: '4th Year', callback_data: '4th Year' }],
            [{ text: 'Senior', callback_data: 'Senior' }],
          ],
        },
      });
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'images') {
      if (msg.photo) {
        const imageId = msg.photo[msg.photo.length - 1].file_id;
        if (!userProfiles[chatId].images) {
          userProfiles[chatId].images = [];
        }

        userProfiles[chatId].images.push(imageId);

        if (userProfiles[chatId].images.length < 3) {
          bot.sendMessage(chatId, 'Image uploaded! Please send another image or type "done" if finished.');
        } else {
          userProfiles[chatId].step = 'preferences';
          bot.sendMessage(chatId, 'You\'ve uploaded 3 images. What class year are you looking for?', {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Freshman', callback_data: 'FreshmanPref' }],
                [{ text: '2nd Year', callback_data: '2nd YearPref' }],
                [{ text: '3rd Year', callback_data: '3rd YearPref' }],
                [{ text: '4th Year', callback_data: '4th YearPref' }],
                [{ text: 'Senior', callback_data: 'SeniorPref' }],
              ],
            },
          });
        }
      } else if (msg.text.toLowerCase() === 'done') {
        userProfiles[chatId].step = 'preferences';
        bot.sendMessage(chatId, 'What class year are you looking for?', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Freshman', callback_data: 'FreshmanPref' }],
              [{ text: '2nd Year', callback_data: '2nd YearPref' }],
              [{ text: '3rd Year', callback_data: '3rd YearPref' }],
              [{ text: '4th Year', callback_data: '4th YearPref' }],
              [{ text: 'Senior', callback_data: 'SeniorPref' }],
            ],
          },
        });
      }
    }
  });
};

// Handle callback queries for gender, class year, preferences
export const handleCallbackQuery = (bot) => {
  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (userProfiles[chatId] && userProfiles[chatId].step === 'gender') {
      userProfiles[chatId].gender = data;
      userProfiles[chatId].step = 'bio';
      bot.sendMessage(chatId, 'Tell us a little about yourself (a short bio).');
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'classYear') {
      userProfiles[chatId].classYear = data;
      userProfiles[chatId].step = 'images';
      bot.sendMessage(chatId, 'Please upload up to 3 images (send them one by one).');
    } else if (userProfiles[chatId] && userProfiles[chatId].step === 'preferences') {
      userProfiles[chatId].preferences = data.replace('Pref', '');

      // Save user data to MongoDB
      try {
        const newUser = new User({
          telegramId: chatId,
          name: userProfiles[chatId].name,
          age: parseInt(userProfiles[chatId].age),
          gender: userProfiles[chatId].gender,
          bio: userProfiles[chatId].bio,
          classYear: userProfiles[chatId].classYear,
          images: userProfiles[chatId].images || [],
          preferences: userProfiles[chatId].preferences,
          contact: callbackQuery.from.username || callbackQuery.from.id, // Use either username or ID for contact
        });

        await newUser.save();
        bot.sendMessage(chatId, `Registration complete! Here is your profile:\n\nName: ${newUser.name}\nAge: ${newUser.age}\nGender: ${newUser.gender}\nBio: ${newUser.bio}\nClass Year: ${newUser.classYear}\nPreferences: ${newUser.preferences}`);
      } catch (error) {
        console.error('Error saving user:', error);
        bot.sendMessage(chatId, 'Error saving your profile. Please try again.');
      }
    }
  });
};
