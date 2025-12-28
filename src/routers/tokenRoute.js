const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');

router.post('/token/refresh', tokenController.refreshAccessToken);
router.post('/token/rotate', tokenController.rotateRefreshToken);

module.exports = router;
