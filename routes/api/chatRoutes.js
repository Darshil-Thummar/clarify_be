const express = require("express");
const router = express.Router();
const {startChat, sendMessage} = require("../../controllers/chatController");

router.post("/start", startChat);
router.post("/send", sendMessage);

module.exports = router;
