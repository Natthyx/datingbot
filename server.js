import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import connectDB from "./services/database.js";
import registrationRoutes from "./routes/botRoutes.js";

dotenv.config();

// Initialize Express app
const app = express();
app.use(express.json());

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log("Database connected");
    // Initialize Telegram Bot
    const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
    // Set the bot's webhook URL
    const url = process.env.WEBHOOK_URL || "https://aastucupid.onrender.com";

    bot.setWebHook(`${url}/bot${process.env.TELEGRAM_TOKEN}`);

    // Define a route to receive webhook updates
    app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });
    // Use the registration route and pass the bot instance
    registrationRoutes(bot);
    // Start listening for incoming requests
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });
