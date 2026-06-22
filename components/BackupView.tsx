import React, { useRef } from "react";
import { DownloadIcon, UploadIcon, BackIcon } from "./common/Icons";

interface BackupViewProps {
  onBack: () => void;
  onImport: (vaultData: string) => void;
  onExport: () => void;
}

const BackupView: React.FC<BackupViewProps> = ({ onBack, onImport, onExport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImport(content);
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <header className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
          aria-label="Voltar"
        >
          <BackIcon />
        </button>
        <h2 className="text-lg font-semibold text-white">Backup e Restaurar</h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <div className="flex-1 flex flex-col gap-6">
        <p className="text-gray-400 text-sm">
          Exporte seus dados criptografados para salvar um backup, ou importe um backup anterior para restaurar seu cofre.
        </p>

        <button
          onClick={onExport}
          className="flex items-center gap-4 p-4 w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-xl transition-colors text-left"
        >
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
            <DownloadIcon />
          </div>
          <div>
            <div className="text-white font-medium text-lg">Exportar Backup</div>
            <div className="text-gray-400 text-sm">Salvar dados no dispositivo</div>
          </div>
        </button>

        <button
          onClick={handleImportClick}
          className="flex items-center gap-4 p-4 w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-xl transition-colors text-left"
        >
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg">
            <UploadIcon />
          </div>
          <div>
            <div className="text-white font-medium text-lg">Importar Backup</div>
            <div className="text-gray-400 text-sm">Restaurar dados de um arquivo</div>
          </div>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        </button>
      </div>
    </div>
  );
};

export default BackupView;
