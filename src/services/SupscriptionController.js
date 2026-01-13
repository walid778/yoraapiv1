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
    platform: 'both', // أو 'ios', 'android'
    type: 'renewable' // 'renewable' أو 'non_renewable'
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

    // 1. البحث عن الـ plan باستخدام productId فقط
    const plan = subscriptionPlans.find(p => p.productId === productId);
    
    if (!plan) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid product ID" 
      });
    }

    // 2. التحقق من صحة الـ purchase (أهم خطوة!)
    let isValidPurchase = false;
    
    if (platform === 'google') {
      // تحقق مع Google Play Console
      isValidPurchase = await InAppPurchase.verifyGooglePlayPurchase(
        purchaseToken, 
        productId,
        process.env.ANDROID_PACKAGE_NAME || 'com.raven.yora'
      );
    } else if (platform === 'apple') {
      // تحقق مع Apple App Store
      isValidPurchase = await InAppPurchase.verifyApplePurchase(
        receiptData || purchaseToken, 
        productId
      );
    }

    // 3. لأغراض التطوير فقط - يمكن تجاوز التحقق
    if (process.env.NODE_ENV === 'development') {
      console.log('DEV MODE: Skipping purchase validation');
      isValidPurchase = true;
    }

    if (!isValidPurchase) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid purchase token" 
      });
    }

    // 4. العثور على المستخدم
    const user = await UserProfile.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // 5. حساب تاريخ الانتهاء
    let subscriptionExpiresAt = null;
let isActive = false;

// Use Google Play / Apple verification result
if (platform === 'google') {
  const purchaseData = await InAppPurchase.verifyGooglePlayPurchaseV2(
    purchaseToken,
    productId,
    process.env.ANDROID_PACKAGE_NAME || 'com.raven.yora'
  );

  if (!purchaseData) {
    return res.status(400).json({ success: false, message: "Invalid purchase token" });
  }

  const lineItem = purchaseData.lineItems?.[0];

  if (!lineItem) {
    return res.status(400).json({ success: false, message: "Invalid purchase token" });
  }

  subscriptionExpiresAt = lineItem.expiryTime ? new Date(lineItem.expiryTime) : null;
  isActive = lineItem.state === 'ACTIVE' && (!subscriptionExpiresAt || subscriptionExpiresAt > new Date());

} else if (platform === 'apple') {
  isActive = await InAppPurchase.verifyApplePurchase(receiptData || purchaseToken, productId);
  subscriptionExpiresAt = isActive ? new Date(new Date().setMonth(new Date().getMonth() + plan.months)) : null;
}

// Update user subscription
user.subscription = {
  plan: plan.name,
  expiresAt: subscriptionExpiresAt,
  isActive,
};


    // 7. حفظ سجل الشراء
     user.purchaseHistory = user.purchaseHistory || [];
    user.purchaseHistory.push({
      productId: plan.productId,
      purchaseToken,
      purchaseDate: new Date(),
      amount: plan.price,
      platform,
      verified: true,
      expiresAt: subscriptionExpiresAt
    });

    await user.save();

    // 8. الرد الناجح
  res.status(200).json({
  success: true,
  subscription: {
    plan: plan.name,
    expiresAt: subscriptionExpiresAt,
    isActive,
    features: plan.features,
  },
});



  } catch (err) {
    console.error('Subscription error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

module.exports = 
{ 
    verifyPurchase,
};
