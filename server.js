import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import connectDB from "./services/database.js";
import registrationRoutes from "./routes/botRoutes.js";

dotenv.config();

(async () => {
  await connectDB();
  console.log("Database connected");

  const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
  const url = process.env.WEBHOOK_URL || "https://aastucupid.onrender.com";
  await bot.setWebHook(`${url}/bot${process.env.TELEGRAM_TOKEN}`);

  const app = express();
  app.use(bodyParser.json());

  app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });

  registrationRoutes(bot);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
