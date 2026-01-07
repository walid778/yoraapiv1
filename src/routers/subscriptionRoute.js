
const express = require('express');
const router = express.Router();
const subController = require('../services/SupscriptionController');
const verifyToken = require('../middlewares/verifyToken');

//router.post('/subscribe', verifyToken, subController.updateSubscription);

router.post('/verify-purchase', verifyToken, subController.verifyPurchase);
/*router.get('/current', verifyToken, subController.getCurrentSubscription);

// إلغاء الاشتراك
router.post('/cancel', verifyToken, subController.cancelSubscription);

// تجديد الاشتراك
router.post('/renew', verifyToken, subController.renewSubscription);

// التحقق من حالة الاشتراك
router.get('/status', verifyToken, subController.getCurrentSubscription);*/

module.exports = router;