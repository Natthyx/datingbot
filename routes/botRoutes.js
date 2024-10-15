import express from 'express';
import { startCommand, handleMessages, handleCallbackQuery } from '../controllers/authController.js';

const router = express.Router();

export default (bot) => {

    startCommand(bot);


    handleMessages(bot);



    handleCallbackQuery(bot);


  return router;
};
