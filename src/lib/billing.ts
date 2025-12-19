'use client';

/**
 * Digital Goods API Service for Google Play Billing
 * 
 * This service handles in-app purchases for PWAs distributed via Google Play Store (TWA).
 * It uses the Digital Goods API which is the web standard for Play Store purchases.
 * 
 * @see https://developer.chrome.com/docs/android/trusted-web-activity/receive-payments-play-billing
 */

// Product IDs must match exactly what's in Play Console
export const PRODUCT_IDS = {
    SUPERMAN_CHEST: 'program_superman_chest',
    SIXPACK_SHREDDER: 'program_sixpack_shredder',
    ARM_BLASTER: 'program_arm_blaster',
} as const;

export type ProductId = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

// Map program IDs to Play Store product IDs
export const PROGRAM_TO_PRODUCT: Record<string, ProductId> = {
    'superman-chest-6week': PRODUCT_IDS.SUPERMAN_CHEST,
    'sixpack-shredder-6week': PRODUCT_IDS.SIXPACK_SHREDDER,
    'arm-blaster-6week': PRODUCT_IDS.ARM_BLASTER,
};

export interface ProductDetails {
    itemId: string;
    title: string;
    description: string;
    price: {
        currency: string;
        value: string;
    };
}

export interface PurchaseDetails {
    itemId: string;
    purchaseToken: string;
}

/**
 * Check if Digital Goods API is available (only in TWA context on Android)
 */
export function isDigitalGoodsApiAvailable(): boolean {
    return 'getDigitalGoodsService' in window;
}

/**
 * Get the Digital Goods service for Play Store
 */
async function getDigitalGoodsService(): Promise<any> {
    if (!isDigitalGoodsApiAvailable()) {
        throw new Error('Digital Goods API is not available');
    }

    try {
        // @ts-ignore - Digital Goods API types not in standard TypeScript
        const service = await window.getDigitalGoodsService('https://play.google.com/billing');
        return service;
    } catch (error) {
        console.error('Failed to get Digital Goods service:', error);
        throw error;
    }
}

/**
 * Get details for available products from Play Store
 */
export async function getProductDetails(productIds: ProductId[]): Promise<ProductDetails[]> {
    if (!isDigitalGoodsApiAvailable()) {
        console.log('Digital Goods API not available - running outside TWA');
        return [];
    }

    try {
        const service = await getDigitalGoodsService();
        const details = await service.getDetails(productIds);
        return details.map((item: any) => ({
            itemId: item.itemId,
            title: item.title,
            description: item.description,
            price: {
                currency: item.price.currency,
                value: item.price.value,
            },
        }));
    } catch (error) {
        console.error('Failed to get product details:', error);
        return [];
    }
}

/**
 * Get list of products the user has already purchased
 */
export async function getPurchasedProducts(): Promise<PurchaseDetails[]> {
    if (!isDigitalGoodsApiAvailable()) {
        console.log('Digital Goods API not available - running outside TWA');
        return [];
    }

    try {
        const service = await getDigitalGoodsService();
        const purchases = await service.listPurchases();
        return purchases.map((item: any) => ({
            itemId: item.itemId,
            purchaseToken: item.purchaseToken,
        }));
    } catch (error) {
        console.error('Failed to get purchased products:', error);
        return [];
    }
}

/**
 * Check if a specific product has been purchased
 */
export async function isProductPurchased(productId: ProductId): Promise<boolean> {
    const purchases = await getPurchasedProducts();
    return purchases.some(p => p.itemId === productId);
}

/**
 * Check if a program has been purchased (using program ID)
 */
export async function isProgramPurchased(programId: string): Promise<boolean> {
    const productId = PROGRAM_TO_PRODUCT[programId];
    if (!productId) {
        // Program doesn't require purchase (e.g., free program)
        return true;
    }
    return isProductPurchased(productId);
}

/**
 * Initiate a purchase flow for a product
 * Uses the Payment Request API with Play Billing payment method
 */
export async function purchaseProduct(productId: ProductId): Promise<{ success: boolean; error?: string }> {
    if (!isDigitalGoodsApiAvailable()) {
        return { success: false, error: 'Purchases are only available in the Android app' };
    }

    try {
        // Get product details first
        const details = await getProductDetails([productId]);
        if (details.length === 0) {
            return { success: false, error: 'Product not found' };
        }

        const product = details[0];

        // Create Payment Request
        const paymentMethods = [{
            supportedMethods: 'https://play.google.com/billing',
            data: {
                sku: productId,
            },
        }];

        const paymentDetails = {
            total: {
                label: product.title,
                amount: {
                    currency: product.price.currency,
                    value: product.price.value,
                },
            },
        };

        const request = new PaymentRequest(paymentMethods, paymentDetails);

        // Show payment UI
        const response = await request.show();

        // Complete the payment
        await response.complete('success');

        // Acknowledge the purchase
        const service = await getDigitalGoodsService();
        const purchases = await service.listPurchases();
        const purchase = purchases.find((p: any) => p.itemId === productId);

        if (purchase) {
            await service.consume(purchase.purchaseToken);
        }

        return { success: true };
    } catch (error: any) {
        console.error('Purchase failed:', error);

        if (error.name === 'AbortError') {
            return { success: false, error: 'Purchase cancelled' };
        }

        return { success: false, error: error.message || 'Purchase failed' };
    }
}

/**
 * Get all purchased program IDs
 */
export async function getPurchasedProgramIds(): Promise<string[]> {
    const purchases = await getPurchasedProducts();
    const purchasedProductIds = new Set(purchases.map(p => p.itemId));

    const purchasedProgramIds: string[] = [];
    for (const [programId, productId] of Object.entries(PROGRAM_TO_PRODUCT)) {
        if (purchasedProductIds.has(productId)) {
            purchasedProgramIds.push(programId);
        }
    }

    return purchasedProgramIds;
}
