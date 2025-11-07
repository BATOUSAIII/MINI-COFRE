import React, { useState, useEffect } from "react";
import { VaultItem, ItemCategory } from "../types";
import { BackIcon, EditIcon, CopyIcon, EyeOpenIcon, EyeClosedIcon } from "./common/Icons";

interface ViewItemProps {
  item: VaultItem;
  onBack: () => void;
  onEdit: (item: VaultItem) => void;
}

const Field: React.FC<{ label: string; value?: string; isSecret?: boolean }> = ({
  label,
  value,
  isSecret = false,
}) => {
  const [revealed, setRevealed] = useState(!isSecret);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (revealed && isSecret) {
      const timerId = setTimeout(() => setRevealed(false), 5000);
      return () => clearTimeout(timerId);
    }
  }, [revealed, isSecret]);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!value) return null;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
      <div className="flex items-center space-x-2">
        <div className="flex-grow bg-[#0d1117] border border-gray-700 rounded-md p-3">
            <span className={revealed ? 'text-white' : 'text-transparent bg-gray-600 rounded-sm'}>
                {isSecret && !revealed ? '************' : value}
            </span>
        </div>
        {isSecret && (
          <button onClick={() => setRevealed(!revealed)} className="p-2 text-gray-400 hover:text-white">
            {revealed ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        )}
        <button onClick={handleCopy} className={`p-2 ${copied ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}>
          <CopyIcon />
        </button>
      </div>
    </div>
  );
};

const ViewItem: React.FC<ViewItemProps> = ({ item, onBack, onEdit }) => {
  
  const getPrimaryLabel = () => {
    switch (item.category) {
      case ItemCategory.CreditCard: return "Número do Cartão";
      case ItemCategory.WiFi: return "Nome da Rede (SSID)";
      default: return "Usuário / E-mail";
    }
  };

  const getSecondaryLabel = () => {
    switch (item.category) {
      case ItemCategory.CreditCard: return "CVV";
      case ItemCategory.WiFi: return "Senha";
      default: return "Senha";
    }
  };
    
  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <BackIcon />
        </button>
        <h2 className="text-lg font-bold truncate">{item.title}</h2>
        <button onClick={() => onEdit(item)} className="p-2 -mr-2 text-gray-400 hover:text-white">
            <EditIcon />
        </button>
      </header>

      <div className="space-y-4">
        <Field label={getPrimaryLabel()} value={item.primaryField} isSecret />
        <Field label={getSecondaryLabel()} value={item.secondaryField} isSecret />
        
        {item.notes && (
            <div>
                 <label className="block text-sm font-medium text-gray-400 mb-1">Notas</label>
                 <div className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-3 whitespace-pre-wrap text-gray-300">
                    {item.notes}
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ViewItem;