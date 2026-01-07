const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');

class InAppPurchaseService {
  static async verifyGooglePlayPurchaseV1(purchaseToken, productId, packageName) {
    try {
      const keyFilePath = path.join(__dirname, 'service-account.json');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });

      const authClient = await auth.getClient();
      const androidPublisher = google.androidpublisher({
        version: 'v3',
        auth: authClient,
      });

      const response = await androidPublisher.purchases.products.get({
        packageName: packageName,
        productId: productId,
        token: purchaseToken,
      });

      const purchase = response.data;
      
      // التحقق من الحالات المختلفة
      const isValid = purchase.purchaseState === 0; // 0 = تم الشراء
      const isAcknowledged = purchase.acknowledgementState === 1; // 1 = تم التأكيد
      
      return isValid && isAcknowledged;
      
    } catch (error) {
      console.error('Google Play verification error:', error.message);
      return false;
    }
  }


  static async verifyGooglePlayPurchase(purchaseToken, productId, packageName) {
  try {
    const keyFilePath = path.join(__dirname, 'service-account.json');

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const authClient = await auth.getClient();
    const androidPublisher = google.androidpublisher({
      version: 'v3',
      auth: authClient,
    });

    const response = await androidPublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });

    const subscription = response.data;

    /*
      subscription.state:
      ACTIVE
      EXPIRED
      CANCELED
    */

    const isActive = subscription.state === 'ACTIVE';

    return isActive;
  } catch (error) {
    console.error(
      'Google Play subscription verification error:',
      error.response?.data || error.message
    );
    return false;
  }
}


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
        if (!isSandbox) {
          return this.verifyApplePurchase(receiptData, productId, true);
        }
        return false;
      }

      // البحث عن المنتج في الإيصال
      const receipt = response.data.receipt;
      const inAppPurchases = receipt.in_app || [];
      
      return inAppPurchases.some(purchase => 
        purchase.product_id === productId && 
        !purchase.cancellation_date
      );
    } catch (error) {
      console.error('Apple verification error:', error.message);
      return false;
    }
  }
}
module.exports = { InAppPurchase: InAppPurchaseService };