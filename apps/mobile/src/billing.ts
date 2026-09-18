import { Platform } from 'react-native';
import type { PurchaseAndroid } from 'expo-iap';
import { z } from 'zod';
import { api, billingSchema, ApiError } from './api';
export const nativeBillingEnabled = Platform.OS === 'android' && process.env.EXPO_PUBLIC_GOOGLE_PLAY_ENABLED === 'true';
export async function preparePurchase(runId: string) {
  if (!nativeBillingEnabled) throw new ApiError('BILLING_NOT_READY');
  const binding = await api(`billing?id=${encodeURIComponent(runId)}`, billingSchema);
  const iap = await import('expo-iap');
  await iap.initConnection();
  if ((await iap.getStorefront()) !== 'KR') throw new ApiError('STORE_REGION_NOT_SUPPORTED');
  const products = await iap.fetchProducts({ skus: [binding.productId], type: 'in-app' });
  const product = products?.find(item => item.id === binding.productId);
  if (!product) throw new ApiError('PRODUCT_NOT_AVAILABLE');
  return { ...binding, displayPrice: product.displayPrice };
}
// Listener-based purchase flow. Server verification must precede consumption.
// Unfinished purchases stay with Play and can be recovered from this run.
export async function recoverPurchases(runId: string) {
  const binding = await api(`billing?id=${encodeURIComponent(runId)}`, billingSchema);
  const iap = await import('expo-iap');
  await iap.initConnection();
  const purchases = await iap.getAvailablePurchases();
  const owned = purchases.filter((p): p is PurchaseAndroid => 'obfuscatedProfileIdAndroid' in p).filter(p => p.productId === binding.productId && p.obfuscatedAccountIdAndroid === binding.accountId && p.obfuscatedProfileIdAndroid === binding.profileId && p.purchaseState === 'purchased');
  if (!owned.length) throw new ApiError('NO_PENDING_PURCHASE');
  for (const purchase of owned) {
    if (!purchase.purchaseToken) continue;
    await api('billing', z.object({ verified: z.literal(true) }), { analysisRunId: runId, productId: purchase.productId, purchaseToken: purchase.purchaseToken });
    await iap.finishTransaction({ purchase, isConsumable: true });
  }
}
export async function purchase(runId: string, binding: Awaited<ReturnType<typeof preparePurchase>>) {
  const iap = await import('expo-iap');
  return new Promise<void>((resolve, reject) => {
    let processing = false;
    const timer = setTimeout(() => { cleanup(); reject(new ApiError('PURCHASE_PENDING')); }, 120000);
    const success = iap.purchaseUpdatedListener(async p => {
      if (!('obfuscatedProfileIdAndroid' in p)) return;
      if (processing || p.productId !== binding.productId || p.obfuscatedProfileIdAndroid !== binding.profileId) return;
      if (p.purchaseState !== 'purchased' || !p.purchaseToken) { cleanup(); reject(new ApiError('PURCHASE_PENDING')); return; }
      processing = true;
      try {
        await api('billing', z.object({ verified: z.literal(true) }), { analysisRunId: runId, productId: p.productId, purchaseToken: p.purchaseToken });
        await iap.finishTransaction({ purchase: p, isConsumable: true });
        cleanup(); resolve();
      } catch (error) { cleanup(); reject(error); }
    });
    const failure = iap.purchaseErrorListener(error => { cleanup(); reject(error); });
    function cleanup() { clearTimeout(timer); success.remove(); failure.remove(); }
    iap.requestPurchase({ type: 'in-app', request: { google: { skus: [binding.productId], obfuscatedAccountId: binding.accountId, obfuscatedProfileId: binding.profileId } } }).catch(error => { cleanup(); reject(error); });
  });
}

