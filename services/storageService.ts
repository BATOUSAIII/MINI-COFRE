import { StoredVault } from "../types";

const VAULT_KEY = 'miniCofreVault';

export function saveVault(vault: StoredVault): void {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  } catch (error) {
    console.error("Could not save vault to local storage", error);
  }
}

export function loadVault(): StoredVault | null {
  try {
    const data = localStorage.getItem(VAULT_KEY);
    return data ? (JSON.parse(data) as StoredVault) : null;
  } catch (error) {
    console.error("Could not load vault from local storage", error);
    return null;
  }
}

export function hasVault(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null;
}

export function clearVault(): void {
  localStorage.removeItem(VAULT_KEY);
}
