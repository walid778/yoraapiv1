const UserProfile = require('../models/User');

const subscriptionPlans = [
  { 
    id: 1, 
    name: 'Monthly', 
    months: 1, 
    price: 9.99,
    features: ['Verified Badge'],
    productId: 'monthly_sub'
  },
  { 
    id: 2, 
    name: 'Yearly', 
    months: 12, 
    price: 99.99,
    features: ['Verified Badge', 'Exclusive Stickers', 'Priority Support'],
    productId: 'yearly_sub'
  }
];

const updateSubscription = async (req, res) => {
  try {
    const { packageId } = req.body;
    const plan = subscriptionPlans.find(p => p.id === packageId);

    if (!plan) return res.status(400).json({ success: false, message: "Invalid package" });

    const user = await UserProfile.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.subscriptionPlan = plan.name;
    user.subscriptionExpiresAt = new Date(Date.now() + plan.months * 30 * 24 * 60 * 60 * 1000);
    
    // مثال لتفعيل المميزات تلقائيًا
    user.isVerified = plan.features.includes("Verified Badge") ? true : user.isVerified;
    // لو عندك ميزات أخرى مثل Stickers أو Priority Support ممكن تخزنها في مصفوفة في الـ schema

    await user.save();

    res.status(200).json({
      success: true,
      message: `Subscription updated to ${plan.name}`,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      features: plan.features,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyPurchase = async (req, res) => {
try {
      const { packageId, purchaseToken, productId, platform } = req.body;
      const userId = req.user.id;

      // التحقق من وجود packageId
      if (!packageId) {
        return res.status(400).json({ 
          success: false, 
          message: "Package ID is required" 
        });
      }

      // البحث عن الخطة المناسبة
      const plan = subscriptionPlans.find(p => p.id === parseInt(packageId));
      
      if (!plan) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid subscription package" 
        });
      }

      // التحقق من تطابق productId مع الخطة
      if (productId && productId !== plan.productId) {
        return res.status(400).json({ 
          success: false, 
          message: "Product ID doesn't match the selected package" 
        });
      }

      // التحقق من صحة عملية الشراء (في حالة وجود purchaseToken)
      if (purchaseToken) {
        const isValidPurchase = await InAppPurchase.verifyPurchase({
          purchaseToken,
          productId: plan.productId,
          platform: platform || 'google' // 'google' أو 'apple'
        });

        if (!isValidPurchase) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid purchase token" 
          });
        }
      }

      // العثور على المستخدم
      const user = await UserProfile.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // حساب تاريخ الانتهاء
      const now = new Date();
      let subscriptionExpiresAt;
      
      if (user.subscriptionExpiresAt && user.subscriptionExpiresAt > now) {
        // إذا كان هناك اشتراك نشط، نضيف المدة الجديدة
        subscriptionExpiresAt = new Date(user.subscriptionExpiresAt);
        subscriptionExpiresAt.setMonth(subscriptionExpiresAt.getMonth() + plan.months);
      } else {
        // إذا لم يكن هناك اشتراك نشط، نبدأ من الآن
        subscriptionExpiresAt = new Date();
        subscriptionExpiresAt.setMonth(subscriptionExpiresAt.getMonth() + plan.months);
      }

      // تحديث معلومات الاشتراك
      user.subscriptionPlan = plan.name;
      user.subscriptionExpiresAt = subscriptionExpiresAt;
      
      // تفعيل المميزات
      if (plan.features.includes("Verified Badge")) {
        user.isVerified = true;
        user.verificationExpiresAt = subscriptionExpiresAt;
      }

      // تخزين معلومات الشراء
      user.purchaseHistory = user.purchaseHistory || [];
      user.purchaseHistory.push({
        packageId: plan.id,
        productId: plan.productId,
        purchaseToken,
        purchaseDate: new Date(),
        amount: plan.price,
        platform
      });

      await user.save();

      // إرجاع معلومات الاشتراك
      res.status(200).json({
        success: true,
        message: `Subscription activated successfully: ${plan.name}`,
        subscription: {
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          features: plan.features,
          isActive: true,
          daysRemaining: Math.ceil((subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
        }
      });

    } catch (err) {
      console.error('Subscription verification error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error while processing subscription' 
      });
    }
  };

const getCurrentSubscription = async (req, res) => {
    try {
      const user = await UserProfile.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const now = new Date();
      const isActive = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now;
      const plan = subscriptionPlans.find(p => p.name === user.subscriptionPlan);

      res.status(200).json({
        success: true,
        subscription: {
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          isActive,
          features: plan ? plan.features : [],
          daysRemaining: isActive 
            ? Math.ceil((user.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
            : 0
        }
      });

    } catch (err) {
      console.error('Get subscription error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }

 const cancelSubscription = async (req, res) => {
    try {
      const user = await UserProfile.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // حفظ الاشتراك السابق
      user.previousSubscription = {
        plan: user.subscriptionPlan,
        expiresAt: user.subscriptionExpiresAt,
        cancelledAt: new Date()
      };

      // إلغاء الاشتراك
      user.subscriptionPlan = null;
      user.subscriptionExpiresAt = null;
      user.isVerified = false;
      user.verificationExpiresAt = null;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Subscription cancelled successfully"
      });

    } catch (err) {
      console.error('Cancel subscription error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  } 

const renewSubscription = async (req, res) => {
    try {
      const { packageId } = req.body;
      const user = await UserProfile.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      // التحقق إذا كان هناك اشتراك سابق
      if (!user.previousSubscription) {
        return res.status(400).json({ 
          success: false, 
          message: "No previous subscription found" 
        });
      }

      const plan = subscriptionPlans.find(p => p.id === parseInt(packageId));
      
      if (!plan) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid subscription package" 
        });
      }

      // حساب تاريخ الانتهاء الجديد
      const now = new Date();
      const subscriptionExpiresAt = new Date();
      subscriptionExpiresAt.setMonth(subscriptionExpiresAt.getMonth() + plan.months);

      // تحديث معلومات الاشتراك
      user.subscriptionPlan = plan.name;
      user.subscriptionExpiresAt = subscriptionExpiresAt;
      
      // تفعيل المميزات
      if (plan.features.includes("Verified Badge")) {
        user.isVerified = true;
        user.verificationExpiresAt = subscriptionExpiresAt;
      }

      // مسح الاشتراك السابق
      user.previousSubscription = null;

      await user.save();

      res.status(200).json({
        success: true,
        message: `Subscription renewed successfully: ${plan.name}`,
        subscription: {
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          features: plan.features,
          isActive: true,
          daysRemaining: Math.ceil((subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
        }
      });

    } catch (err) {
      console.error('Renew subscription error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }

  const getSubscriptionStatus = async (req, res) => {
    try {
      const user = await UserProfile.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const now = new Date();
      const isActive = user.subscriptionExpiresAt && user.subscriptionExpiresAt > now;
      const plan = subscriptionPlans.find(p => p.name === user.subscriptionPlan);

      res.status(200).json({
        success: true,
        status: {
          hasSubscription: !!user.subscriptionPlan,
          isActive,
          currentPlan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          isVerified: user.isVerified,
          verificationExpiresAt: user.verificationExpiresAt,
          features: plan ? plan.features : [],
          canRenew: !!user.previousSubscription,
          daysRemaining: isActive 
            ? Math.ceil((user.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
            : 0
        }
      });

    } catch (err) {
      console.error('Get subscription status error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }

  const getAvailablePlans = async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        plans: subscriptionPlans.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          months: plan.months,
          features: plan.features,
          productId: plan.productId,
          description: plan.months === 1 
            ? 'Billed monthly' 
            : `Billed yearly - Save ${Math.round((1 - (plan.price / (12 * 9.99))) * 100)}%`
        }))
      });

    } catch (err) {
      console.error('Get plans error:', err);
      res.status(500).json({ 
        success: false, 
        message: 'Server error' 
      });
    }
  }

module.exports = 
{ 
    updateSubscription,
    verifyPurchase,
    getCurrentSubscription,
    cancelSubscription,
    renewSubscription,
    getSubscriptionStatus,
    getAvailablePlans,
};
