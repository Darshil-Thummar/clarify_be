const express = require('express');
const router = express.Router();

const authRouter = require("./api/authRoutes");
const clarifyRouter = require("./api/clarifyRoutes");
const messageRouter = require("./api/messageRoutes");

router.use("/auth", authRouter);
router.use("/v1", clarifyRouter);
router.use("/v1", messageRouter);

module.exports = router;