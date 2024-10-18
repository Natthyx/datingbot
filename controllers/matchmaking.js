import { userProfiles } from './registration.js'; // Import the userProfiles object

let currentProfileIndex = {}; // Store the index of the current profile for each user

export const lookForMatches = async (bot, chatId) => {
  const userProfilesArray = Object.values(userProfiles);
  
  // Get the next profile to show
  if (!currentProfileIndex[chatId]) {
      currentProfileIndex[chatId] = 0; // Initialize if not set
  }

  // Check if there are profiles available
  if (currentProfileIndex[chatId] < userProfilesArray.length) {
      const profile = userProfilesArray[currentProfileIndex[chatId]];
      const options = {
          reply_markup: {
              inline_keyboard: [
                  [{ text: 'Like', callback_data: `like_${profile.id}` }],
                  [{ text: 'Dislike', callback_data: `dislike_${profile.id}` }]
              ]
          }
      };
      bot.sendMessage(chatId, `Profile: ${profile.name}`, options);
  } else {
      bot.sendMessage(chatId, "No more options available.");
  }
};


export const handleCallbackQuery = (bot) => {
    bot.on('callback_query', async (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        // Handle like and dislike actions
        if (data.startsWith('like_')) {
            const likedProfileId = data.split('_')[1];
            const likingUser = userProfiles[chatId]; // Get the liking user's profile
            const likedProfile = userProfiles[likedProfileId]; // Get the liked profile

            if (likedProfile) {
                // Notify the liked user
                bot.sendMessage(likedProfile.telegramId, `${likingUser.name} liked your profile!`);

                // Check for mutual like
                // You can implement a simple check to see if the liked profile also liked back
                // For instance, you could maintain a 'likes' property in userProfiles.
                bot.sendMessage(chatId, `Congratulations! You have a successful match with ${likedProfile.name}!`);
                bot.sendMessage(chatId, `You can contact them at: ${likedProfile.telegramId}`);
                bot.sendMessage(likedProfile.telegramId, `You can contact them at: ${likingUser.telegramId}`);
            }
        } else if (data.startsWith('dislike_')) {
            // Just handle dislike, no notification needed
        }

        // Move to the next profile
        currentProfileIndex[chatId]++;
        lookForMatches(bot, chatId); // Call to show the next profile
    });
};

// Function to handle liking or disliking profiles
export const handleProfileActions = (bot) => {
  bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const data = callbackQuery.data;

      // Assuming data has 'like' or 'dislike' followed by userId or profileId
      if (data.startsWith('like_')) {
          const profileId = data.split('_')[1]; // Extract profile ID
          // Handle liking logic
          await handleLike(bot, chatId, profileId);
      } else if (data.startsWith('dislike_')) {
          const profileId = data.split('_')[1]; // Extract profile ID
          // Handle disliking logic
          await handleDislike(bot, chatId, profileId);
      }
  });
};

// Example function to handle likes
const handleLike = async (bot, chatId, profileId) => {
  const likerProfile = userProfiles[chatId]; // Get the current user's profile
  const likedProfile = userProfiles[profileId]; // Get the profile being liked

  // Notify the liked profile
  if (likedProfile) {
      bot.sendMessage(likedProfile.chatId, `${likerProfile.name} liked your profile!`);
  }

  // Logic for mutual match
  if (likedProfile.likes.includes(chatId)) {
      bot.sendMessage(chatId, `Congratulations! You have a successful match with ${likedProfile.name}.`);
      bot.sendMessage(chatId, `You both can contact each other using these usernames: ${likerProfile.username} and ${likedProfile.username}.`);
  }
};

// Example function to handle dislikes
const handleDislike = async (bot, chatId, profileId) => {
  // Dislike logic (no notification)
  // You can add any logic you want here if needed
};
