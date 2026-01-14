const UserProfile = require('../models/User');
const { InAppPurchase } = require('../services/inAppPurchaseService');

const subscriptionPlans = [
  { 
    id: 1, 
    name: 'Monthly', 
    months: 1, 
    price: 9.99,
    features: ['Verified Badge'],
    productId: 'com.raven.yora.subscription.monthly',
    platform: 'both',
    type: 'renewable'
  },
  { 
    id: 2, 
    name: 'Yearly', 
    months: 12, 
    price: 99.99,
    features: ['Verified Badge', 'Exclusive Stickers', 'Priority Support'],
    productId: 'com.raven.yora.subscription.yearly',
    platform: 'both',
    type: 'renewable'
  }
];

const verifyPurchase = async (req, res) => {
  try {
    const { productId, purchaseToken, platform, receiptData } = req.body;
    const userId = req.user.id;

    const plan = subscriptionPlans.find(p => p.productId === productId);
    if (!plan) return res.status(400).json({ success: false, message: "Invalid product ID" });

    let purchaseData = null;

    if (platform === 'google') {
      purchaseData = await InAppPurchase.verifyGooglePlayPurchase(
        purchaseToken,
        productId,
        process.env.ANDROID_PACKAGE_NAME || 'com.raven.yora'
      );
    } else if (platform === 'apple') {
      const isValid = await InAppPurchase.verifyApplePurchase(receiptData || purchaseToken, productId);
      if (!isValid) return res.status(400).json({ success: false, message: "Invalid purchase token" });
      purchaseData = { isActive: true, expiryTime: null }; // Apple non-expiring for now
    }

    // DEV mode bypass
    if (process.env.NODE_ENV === 'development') {
      console.log('DEV MODE: Skipping purchase validation');
      purchaseData = { isActive: true, expiryTime: null };
    }

    if (!purchaseData || !purchaseData.isActive) {
      return res.status(400).json({ success: false, message: "Invalid purchase token" });
    }

    // تحديث الاشتراك
    const user = await UserProfile.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.subscription = {
      plan: plan.name,
      expiresAt: purchaseData.expiryTime,
      isActive: purchaseData.isActive
    };

    user.purchaseHistory = user.purchaseHistory || [];
    user.purchaseHistory.push({
      productId: plan.productId,
      purchaseToken,
      purchaseDate: new Date(),
      amount: plan.price,
      platform,
      verified: true,
      expiresAt: purchaseData.expiryTime
    });

    await user.save();

    res.status(200).json({
      success: true,
      subscription: {
        plan: plan.name,
        expiresAt: purchaseData.expiryTime,
        isActive: purchaseData.isActive,
        features: plan.features,
      },
    });
  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = { verifyPurchase };
