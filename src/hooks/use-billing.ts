'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    isDigitalGoodsApiAvailable,
    getPurchasedProgramIds,
    purchaseProduct,
    getProductDetails,
    PROGRAM_TO_PRODUCT,
    type ProductId,
    type ProductDetails,
} from '@/lib/billing';

interface UseBillingReturn {
    /** Whether the Digital Goods API is available (only true in Play Store app) */
    isAvailable: boolean;
    /** Whether we're loading purchase status */
    isLoading: boolean;
    /** Set of program IDs that the user has purchased */
    purchasedProgramIds: Set<string>;
    /** Product details from Play Store (prices, titles, etc.) */
    productDetails: Map<string, ProductDetails>;
    /** Check if a specific program is purchased (or free). Pass userEmail for admin bypass. */
    isProgramOwned: (programId: string, isFree: boolean, userEmail?: string | null) => boolean;
    /** Purchase a program */
    purchaseProgram: (programId: string) => Promise<{ success: boolean; error?: string }>;
    /** Refresh purchase status */
    refreshPurchases: () => Promise<void>;
}

/**
 * Hook for managing in-app purchases via Digital Goods API
 */
export function useBilling(): UseBillingReturn {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [purchasedProgramIds, setPurchasedProgramIds] = useState<Set<string>>(new Set());
    const [productDetails, setProductDetails] = useState<Map<string, ProductDetails>>(new Map());

    // Check availability and load initial data
    useEffect(() => {
        const init = async () => {
            const available = isDigitalGoodsApiAvailable();
            setIsAvailable(available);

            if (available) {
                // Load purchased programs
                const purchased = await getPurchasedProgramIds();
                setPurchasedProgramIds(new Set(purchased));

                // Load product details
                const productIds = Object.values(PROGRAM_TO_PRODUCT);
                const details = await getProductDetails(productIds);
                const detailsMap = new Map<string, ProductDetails>();
                details.forEach(d => detailsMap.set(d.itemId, d));
                setProductDetails(detailsMap);
            }

            setIsLoading(false);
        };

        init();
    }, []);

    // Refresh purchase status
    const refreshPurchases = useCallback(async () => {
        if (!isAvailable) return;

        setIsLoading(true);
        const purchased = await getPurchasedProgramIds();
        setPurchasedProgramIds(new Set(purchased));
        setIsLoading(false);
    }, [isAvailable]);

    // Check if a program is owned (purchased or free)
    // Also includes admin bypass for developer testing
    const isProgramOwned = useCallback((programId: string, isFree: boolean, userEmail?: string | null): boolean => {
        // Free programs are always owned
        if (isFree) return true;

        // Admin bypass - developer gets all programs free
        if (userEmail === 'matthewcb4@gmail.com') return true;

        // If billing not available, treat as not owned (show "Coming Soon")
        if (!isAvailable) return false;

        // Check if purchased
        return purchasedProgramIds.has(programId);
    }, [isAvailable, purchasedProgramIds]);

    // Purchase a program
    const purchaseProgram = useCallback(async (programId: string): Promise<{ success: boolean; error?: string }> => {
        const productId = PROGRAM_TO_PRODUCT[programId];
        if (!productId) {
            console.error('Invalid program ID:', programId, 'Available:', Object.keys(PROGRAM_TO_PRODUCT));
            return { success: false, error: `Invalid program ID: ${programId}` };
        }

        const result = await purchaseProduct(productId);

        if (result.success) {
            // Refresh purchases to update state
            await refreshPurchases();
        }

        return result;
    }, [refreshPurchases]);

    return {
        isAvailable,
        isLoading,
        purchasedProgramIds,
        productDetails,
        isProgramOwned,
        purchaseProgram,
        refreshPurchases,
    };
}

/**
 * Get the display price for a program from product details
 */
export function getDisplayPrice(
    productDetails: Map<string, ProductDetails>,
    programId: string
): string | null {
    const productId = PROGRAM_TO_PRODUCT[programId];
    if (!productId) return null;

    const details = productDetails.get(productId);
    if (!details) return null;

    return `${details.price.currency} ${details.price.value}`;
}
