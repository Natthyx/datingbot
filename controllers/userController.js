import User from '../models/User.js';
// Like a profile
export const likeProfile = async (bot, chatId, userIdToLike) => {
    try {
      // Get the current user's data
      const currentUser = await User.findOne({ telegramId: chatId });
      
      if (!currentUser) {
        bot.sendMessage(chatId, "Please register first using /start.");
        return;
      }
  
      // Check if the user already liked the profile
      if (currentUser.likes.includes(userIdToLike)) {
        bot.sendMessage(chatId, "You already liked this profile.");
        return;
      }
  
      // Update the current user's likes
      currentUser.likes.push(userIdToLike);
      await currentUser.save();
  
      // Update the liked user's likedBy array
      await User.updateOne({ telegramId: userIdToLike }, { $addToSet: { likedBy: chatId } });
  
      bot.sendMessage(chatId, `You liked the profile of user ID: ${userIdToLike}.`);
    } catch (error) {
      console.error('Error liking profile:', error);
      bot.sendMessage(chatId, 'Error liking the profile. Please try again.');
    }
  };
  