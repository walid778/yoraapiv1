const axios = require('axios');
const { google } = require('googleapis');
const path = require('path');

class InAppPurchaseService {
  // ======= Google Play subscription verification =======
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

    console.log('Google subscription response:', JSON.stringify(subscription, null, 2));

    // تحقق من حالة الاشتراك
    const isActive = subscription.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';

    // العثور على lineItem الصحيح
    const lineItem = subscription.lineItems?.find(item => item.productId === productId);
    const expiryTime = lineItem?.expiryTime ? new Date(lineItem.expiryTime) : null;

    return { isActive, expiryTime };
  } catch (error) {
    console.error(
      'Google Play subscription verification error:',
      error.response?.data || error.message
    );
    return null;
  }
}

  // ======= Apple verification =======
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
