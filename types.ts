export enum ItemCategory {
  Login = "Login/Senha",
  CreditCard = "Cartão de Crédito",
  WiFi = "Wi-Fi",
  Note = "Nota Secreta",
  Other = "Outros",
}

export interface VaultItem {
  id: string;
  title: string;
  category: ItemCategory;
  primaryField: string;
  secondaryField?: string;
  notes?: string;
}

export interface StoredVault {
  iv: string;
  salt: string;
  data: string;
}

// FIX: Added GoogleUser interface to resolve import error.
export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}
