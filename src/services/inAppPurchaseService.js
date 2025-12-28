const axios = require('axios');

class InAppPurchaseService {
  // التحقق من شراء Google Play
  static async verifyGooglePlayPurchase(purchaseToken, productId, packageName) {
    try {
      const response = await axios.post(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`,
        {},
        {
          params: {
            access_token: process.env.GOOGLE_API_KEY
          }
        }
      );

      return response.data.purchaseState === 0; // 0 يعني تم الشراء بنجاح
    } catch (error) {
      console.error('Google Play verification error:', error.message);
      return false;
    }
  }

  // التحقق من شراء Apple App Store
  static async verifyApplePurchase(receiptData, productId, isSandbox = false) {
    try {
      const url = isSandbox
        ? 'https://sandbox.itunes.apple.com/verifyReceipt'
        : 'https://buy.itunes.apple.com/verifyReceipt';

      const response = await axios.post(url, {
        'receipt-data': receiptData,
        password: process.env.APPLE_SHARED_SECRET,
        'exclude-old-transactions': true
      });

      if (response.data.status !== 0) {
        // إذا فشل التحقق في production، جرب في sandbox
        if (!isSandbox) {
          return this.verifyApplePurchase(receiptData, productId, true);
        }
        return false;
      }

      // التحقق من أن المنتج موجود في الإيصال
      const receipt = response.data.receipt;
      const inAppPurchases = receipt.in_app || [];

      return inAppPurchases.some(purchase => 
        purchase.product_id === productId && 
        purchase.cancellation_date === null
      );
    } catch (error) {
      console.error('Apple verification error:', error.message);
      return false;
    }
  }

  // التحقق العام للـ purchase
  static async verifyPurchase({ purchaseToken, productId, platform = 'google', receiptData }) {
    try {
      if (platform === 'google') {
        return await this.verifyGooglePlayPurchase(
          purchaseToken, 
          productId, 
          process.env.ANDROID_PACKAGE_NAME
        );
      } else if (platform === 'apple') {
        return await this.verifyApplePurchase(
          receiptData || purchaseToken, 
          productId
        );
      }

      return false;
    } catch (error) {
      console.error('Purchase verification error:', error);
      return false;
    }
  }
}

module.exports = { InAppPurchase: InAppPurchaseService };