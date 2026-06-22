import React, { useState } from "react";
import { VaultItem, ItemCategory } from "../types";
import { PlusIcon, SearchIcon, WifiIcon } from "./common/Icons";

interface ItemListProps {
  items: VaultItem[];
  onSelectItem: (item: VaultItem) => void;
  onAddNew: () => void;
}

const CategoryIcon: React.FC<{ category: ItemCategory }> = ({ category }) => {
  const getIcon = () => {
    switch (category) {
      case ItemCategory.Login:
        return "👤";
      case ItemCategory.CreditCard:
        return "💳";
      case ItemCategory.WiFi:
        return <div className="w-6 h-6"><WifiIcon /></div>;
      case ItemCategory.Note:
        return "📝";
      default:
        return "📦";
    }
  };
  return <div className="text-2xl mr-4 flex items-center justify-center w-8 h-8">{getIcon()}</div>;
};

const ItemList: React.FC<ItemListProps> = ({
  items,
  onSelectItem,
  onAddNew,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Pesquisar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon />
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        {filteredItems.length > 0 ? (
          <ul>
            {filteredItems.map((item) => (
              <li
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="flex items-center p-3 mb-2 rounded-md cursor-pointer hover:bg-gray-800 transition-colors"
              >
                <CategoryIcon category={item.category} />
                <div>
                  <p className="font-semibold">{item.title}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-gray-500 py-10">
            <p>Nenhum item encontrado.</p>
            <p>Clique no '+' para adicionar.</p>
          </div>
        )}
      </div>
      <div className="mt-auto pt-4 flex justify-end">
        <button
          onClick={onAddNew}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Add new item"
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
};

export default ItemList;