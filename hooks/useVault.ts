import { useState, useEffect, useCallback } from "react";
import { VaultItem, StoredVault } from "../types";
import { encryptVault, decryptVault } from "../services/cryptoService";
import * as storageService from "../services/storageService";
import { v4 as uuidv4 } from 'uuid';

const useVault = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    try {
      const vaultExists = storageService.hasVault();
      setHasPin(vaultExists);
    } catch (e) {
      console.error("Failed to check local storage:", e);
      setError("Could not access storage. Please enable cookies/site data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lock = () => {
    setItems([]);
    setIsUnlocked(false);
    setError(null);
  };
  
  const setupPin = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const newVault = await encryptVault([], pin);
      storageService.saveVault(newVault);
      setHasPin(true);
      setIsUnlocked(true);
      setItems([]);
    } catch (e: any) {
      console.error("PIN setup failed", e);
      setError(e.message || "Failed to set up PIN.");
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const storedVault = storageService.loadVault();
      if (!storedVault) {
        throw new Error("Vault not found.");
      }
      const decryptedItems = await decryptVault(storedVault, pin);
      setItems(decryptedItems);
      setIsUnlocked(true);
    } catch (e: any) {
      console.error("Unlock failed", e);
      setError(e.message || "Failed to unlock vault. Check your PIN.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveItems = async (pin: string, newItems: VaultItem[]) => {
    try {
      const encrypted = await encryptVault(newItems, pin);
      storageService.saveVault(encrypted);
      setItems(newItems);
    } catch (e) {
      console.error("Failed to save items:", e);
      setError("Could not save changes to your vault.");
    }
  };
  
  const addItem = (item: Omit<VaultItem, 'id'>, pin: string) => {
    const newItem = { ...item, id: uuidv4() };
    const newItems = [...items, newItem];
    saveItems(pin, newItems);
  };

  const updateItem = (updatedItem: VaultItem, pin: string) => {
    const newItems = items.map((item) =>
      item.id === updatedItem.id ? updatedItem : item
    );
    saveItems(pin, newItems);
  };

  const deleteItem = (id: string, pin: string) => {
    const newItems = items.filter((item) => item.id !== id);
    saveItems(pin, newItems);
  };
  

  return {
    items,
    isUnlocked,
    hasPin,
    error,
    isLoading,
    lock,
    setupPin,
    unlock,
    addItem,
    updateItem,
    deleteItem,
  };
};

export default useVault;