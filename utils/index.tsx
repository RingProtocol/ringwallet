const selectedChain = useReadChain();
import { useCallback, useEffect, useState } from 'react';

/**
 * 从localStorage读取链信息的Hook
 * @returns 当前选择的链信息，默认为'ethereum'
 */
export function useReadChain(): 'ethereum' | 'solana' | 'bitcoin' | 'sepolia' {
    const savedChain = useReadLocalStorage('selectedChain');
    return (savedChain as 'ethereum' | 'solana' | 'bitcoin' | 'sepolia') || 'ethereum';
}

export function useReadLocalStorage(key: string): string | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }
    try {
        // Get from local storage by key
        const item = window.localStorage.getItem(key);
        console.log("local read: ", item)
        // Parse stored json or if none return initialValue
        return item === null ? undefined : item;
    } catch (error) {
        // If error also return initialValue
        console.log(error);
    }
    return undefined;
}

export function useSaveLocalStorage(key: string, value: string) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        // Get from local storage by key
        window.localStorage.setItem(key, value);
        console.log("local:save chain=", value)
        // Parse stored json or if none return initialValue
    } catch (error) {
        // If error also return initialValue
        console.log(error);
    }
    return;
}
