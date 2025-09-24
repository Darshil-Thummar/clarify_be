const express = require('express');
const router = express.Router();

const authRouter = require("./api/authRoutes");
const clarifyRouter = require("./api/clarifyRoutes");

router.use("/auth", authRouter);
router.use("/v1", clarifyRouter);

module.exports = router;