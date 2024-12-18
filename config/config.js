require("dotenv").config();
const { _isArray } = require("../utils.js");

const settings = {
  TIME_SLEEP: process.env.TIME_SLEEP ? parseInt(process.env.TIME_SLEEP) : 8,
  MAX_THEADS: process.env.MAX_THEADS ? parseInt(process.env.MAX_THEADS) : 10,
  MAX_LEVEL_TAP_UPGRADE: process.env.MAX_LEVEL_TAP_UPGRADE ? parseInt(process.env.MAX_LEVEL_TAP_UPGRADE) : 10,
  MAX_COST_UPGRADE: process.env.MAX_COST_UPGRADE ? parseInt(process.env.MAX_COST_UPGRADE) : 1000000,
  SKIP_TASKS: process.env.SKIP_TASKS ? JSON.parse(process.env.SKIP_TASKS.replace(/'/g, '"')) : [],
  AUTO_TASK: process.env.AUTO_TASK ? process.env.AUTO_TASK.toLowerCase() === "true" : false,
  AUTO_UPGRADE_TAP: process.env.AUTO_UPGRADE_TAP ? process.env.AUTO_UPGRADE_TAP.toLowerCase() === "true" : false,
  DAILY_COMBO: process.env.DAILY_COMBO ? process.env.DAILY_COMBO.toLowerCase() === "true" : false,
  CARD_COMBO: process.env.CARD_COMBO ? JSON.parse(process.env.CARD_COMBO.replace(/'/g, '"')) : [],
  AUTO_UPGRADE: process.env.AUTO_UPGRADE ? process.env.AUTO_UPGRADE.toLowerCase() === "true" : false,
  AUTO_TAP: process.env.AUTO_TAP ? process.env.AUTO_TAP.toLowerCase() === "true" : false,
  AUTO_SPIN: process.env.AUTO_SPIN ? process.env.AUTO_SPIN.toLowerCase() === "true" : false,

  AUTO_JOIN_GANG: process.env.AUTO_JOIN_GANG ? process.env.AUTO_JOIN_GANG.toLowerCase() === "true" : false,
  AUTO_PLAY_GAME_1204: process.env.AUTO_PLAY_GAME_1204 ? process.env.AUTO_PLAY_GAME_1204.toLowerCase() === "true" : false,
  CONNECT_WALLET: process.env.CONNECT_WALLET ? process.env.CONNECT_WALLET.toLowerCase() === "true" : false,
  DELAY_BETWEEN_REQUESTS: process.env.DELAY_BETWEEN_REQUESTS && _isArray(process.env.DELAY_BETWEEN_REQUESTS) ? JSON.parse(process.env.DELAY_BETWEEN_REQUESTS) : [1, 5],
  DELAY_START_BOT: process.env.DELAY_START_BOT && _isArray(process.env.DELAY_START_BOT) ? JSON.parse(process.env.DELAY_START_BOT) : [1, 15],
};

module.exports = settings;
