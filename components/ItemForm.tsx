import React, { useState } from "react";
import { VaultItem, ItemCategory } from "../types";
import { BackIcon, CheckIcon, DeleteIcon } from "./common/Icons";

interface ItemFormProps {
  item: VaultItem | null;
  onSave: (item: Omit<VaultItem, "id"> | VaultItem, pin: string) => void;
  onCancel: () => void;
  onDelete: (id: string, pin: string) => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = useState({
    title: item?.title || "",
    category: item?.category || ItemCategory.Login,
    primaryField: item?.primaryField || "",
    secondaryField: item?.secondaryField || "",
    notes: item?.notes || "",
  });
  
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'delete' | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleActionAttempt = (type: 'save' | 'delete') => {
    if (type === 'save' && !formData.title) return;
    setActionType(type);
    setShowPinModal(true);
  }

  const handlePinConfirm = () => {
    if (pin.length < 4) return;

    if (actionType === 'save') {
      if (item) {
        onSave({ ...item, ...formData }, pin);
      } else {
        onSave(formData, pin);
      }
    } else if (actionType === 'delete' && item) {
      onDelete(item.id, pin);
    }
    
    resetPinModal();
  }
  
  const resetPinModal = () => {
    setShowPinModal(false);
    setPin('');
    setActionType(null);
  }

  const getPrimaryLabel = () => {
    switch (formData.category) {
      case ItemCategory.CreditCard: return "Número do Cartão";
      case ItemCategory.WiFi: return "Nome da Rede (SSID)";
      default: return "Usuário / E-mail";
    }
  };

  const getSecondaryLabel = () => {
    switch (formData.category) {
      case ItemCategory.CreditCard: return "CVV";
      case ItemCategory.WiFi: return "Senha";
      default: return "Senha";
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between mb-6">
          <button onClick={onCancel} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <BackIcon />
          </button>
          <h2 className="text-lg font-bold">{item ? "Editar Item" : "Adicionar Item"}</h2>
          <button onClick={() => handleActionAttempt('save')} className={`p-2 -mr-2 ${!formData.title ? 'text-gray-600' : 'text-blue-400 hover:text-blue-300'}`} disabled={!formData.title}>
            <CheckIcon />
          </button>
        </header>

        <form className="space-y-4 flex-grow">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-400">Título</label>
            <input
              type="text"
              name="title"
              id="title"
              value={formData.title}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-400">Categoria</label>
            <select
              name="category"
              id="category"
              value={formData.category}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(ItemCategory).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="primaryField" className="block text-sm font-medium text-gray-400">{getPrimaryLabel()}</label>
            <input
              type="text"
              name="primaryField"
              id="primaryField"
              value={formData.primaryField}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="secondaryField" className="block text-sm font-medium text-gray-400">{getSecondaryLabel()}</label>
            <input
              type="password"
              name="secondaryField"
              id="secondaryField"
              value={formData.secondaryField}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-400">Notas</label>
            <textarea
              name="notes"
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
        {item && (
          <div className="mt-auto pt-4">
            <button
              onClick={() => handleActionAttempt('delete')}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <DeleteIcon />
              <span className="ml-2">Excluir Item</span>
            </button>
          </div>
        )}
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-[#161b22] p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold text-center mb-4">Confirme seu PIN</h3>
            <p className="text-center text-gray-400 mb-4">
              Para sua segurança, por favor, insira seu PIN para {actionType === 'save' ? 'salvar' : 'excluir'}.
            </p>
            <input 
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={6}
              className="w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white text-center text-xl tracking-[.5em] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-4 mt-6">
              <button onClick={resetPinModal} className="w-full py-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600">Cancelar</button>
              <button onClick={handlePinConfirm} className="w-full py-2 px-4 bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500" disabled={pin.length < 4}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ItemForm;
