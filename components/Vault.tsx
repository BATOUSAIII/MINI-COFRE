import React, { useState } from "react";
import useVault from "../hooks/useVault";
import ItemList from "./ItemList";
import ItemForm from "./ItemForm";
import ViewItem from "./ViewItem";
import BackupView from "./BackupView";
import { VaultItem } from "../types";
import { LockIcon, SettingsIcon } from "./common/Icons";

interface VaultProps {
  vault: ReturnType<typeof useVault>;
}

type View = "LIST" | "ADD" | "EDIT" | "VIEW" | "BACKUP";

const Vault: React.FC<VaultProps> = ({ vault }) => {
  const [currentView, setCurrentView] = useState<View>("LIST");
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  
  const handleSelectItem = (item: VaultItem) => {
    setSelectedItem(item);
    setCurrentView("VIEW");
  };

  const handleEditItem = (item: VaultItem) => {
    setSelectedItem(item);
    setCurrentView("EDIT");
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setCurrentView("ADD");
  };

  const handleBack = () => {
    setSelectedItem(null);
    setCurrentView("LIST");
  };

  const handleSaveItem = (item: Omit<VaultItem, 'id'> | VaultItem, pin: string) => {
    if ('id' in item) {
        vault.updateItem(item, pin);
    } else {
        vault.addItem(item, pin);
    }
    handleBack();
  }

  const handleDeleteItem = (id: string, pin: string) => {
    vault.deleteItem(id, pin);
    handleBack();
  }

  const handleExport = () => {
    const data = localStorage.getItem('miniCofreVault');
    if (!data) {
      alert("Nenhum dado para exportar.");
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minicofre-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (vaultData: string) => {
    try {
      const parsed = JSON.parse(vaultData);
      if (parsed && typeof parsed.salt === 'string' && typeof parsed.iv === 'string' && typeof parsed.data === 'string') {
        localStorage.setItem('miniCofreVault', vaultData);
        window.location.reload();
      } else {
        alert("Arquivo de backup inválido.");
      }
    } catch (e) {
      alert("Erro ao ler o arquivo de backup.");
    }
  };

  const renderView = () => {
    switch (currentView) {
      case "VIEW":
        return (
          selectedItem && (
            <ViewItem
              item={selectedItem}
              onBack={handleBack}
              onEdit={() => handleEditItem(selectedItem)}
            />
          )
        );
      case "BACKUP":
        return (
          <BackupView
            onBack={handleBack}
            onExport={handleExport}
            onImport={handleImport}
          />
        );
      case "ADD":
      case "EDIT":
        return (
          <ItemForm
            item={selectedItem}
            onSave={handleSaveItem}
            onCancel={handleBack}
            onDelete={handleDeleteItem}
          />
        );
      case "LIST":
      default:
        return (
          <ItemList
            items={vault.items}
            onSelectItem={handleSelectItem}
            onAddNew={handleAddNew}
          />
        );
    }
  };

  return (
    <div className="bg-[#161b22] border border-gray-800 rounded-lg p-6 shadow-lg w-full max-w-md min-h-[600px] flex flex-col">
        <header className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
            <h1 className="text-xl font-bold">MiniCofre</h1>
            <div className="flex items-center gap-4">
              <button onClick={() => setCurrentView("BACKUP")} className="text-gray-400 hover:text-white" aria-label="Configurações e Backup">
                  <SettingsIcon />
              </button>
              <button onClick={vault.lock} className="text-gray-400 hover:text-white" aria-label="Trancar cofre">
                  <LockIcon />
              </button>
            </div>
        </header>
        <main className="flex-grow">
            {renderView()}
        </main>
    </div>
  );
};

export default Vault;