
import React from 'react';
import ReactDOM from 'react-dom/client';

// Internal, reliable UUIDv4 generator. No external dependency needed.
const uuidv4 = () => {
  // FIX: Operator '+' cannot be applied to types 'number[]' and 'number'. Explicitly convert array to string.
  return (String([1e7])+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

// --- START OF TYPES ---
const ItemCategory = {
  Login: "Login/Senha",
  CreditCard: "Cartão de Crédito",
  WiFi: "Wi-Fi",
  Note: "Nota Secreta",
  Other: "Outros",
};

// --- START OF CRYPTO SERVICE ---
const ALGO = "AES-GCM";
const KEY_ALGO = "PBKDF2";
const HASH = "SHA-256";
const ITERATIONS = 100000;

function strToBuf(str) {
  return new TextEncoder().encode(str);
}

function bufToStr(buf) {
  return new TextDecoder().decode(buf);
}

function bufToB64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64) {
  const str = atob(b64);
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}

async function getKey(pin, salt) {
  const pinBuf = strToBuf(pin);
  const baseKey = await crypto.subtle.importKey("raw", pinBuf, KEY_ALGO, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: KEY_ALGO, salt, iterations: ITERATIONS, hash: HASH, },
    baseKey,
    { name: ALGO, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

async function encryptVault(items, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(pin, salt);
  const dataToEncrypt = strToBuf(JSON.stringify(items));
  const encryptedData = await crypto.subtle.encrypt({ name: ALGO, iv }, key, dataToEncrypt);
  return { iv: bufToB64(iv), salt: bufToB64(salt), data: bufToB64(encryptedData) };
}

async function decryptVault(storedVault, pin) {
    try {
        const salt = b64ToBuf(storedVault.salt);
        const iv = b64ToBuf(storedVault.iv);
        const data = b64ToBuf(storedVault.data);
        const key = await getKey(pin, salt);
        const decryptedData = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
        const decryptedString = bufToStr(decryptedData);
        return JSON.parse(decryptedString);
    } catch(e) {
        console.error("Decryption failed", e);
        throw new Error("Invalid PIN or corrupted data.");
    }
}

// --- START OF STORAGE SERVICE ---
const VAULT_KEY = 'miniCofreVault';

function saveVault(vault) {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  } catch (error) {
    console.error("Could not save vault to local storage", error);
  }
}

function loadVault() {
  try {
    const data = localStorage.getItem(VAULT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Could not load vault from local storage", error);
    return null;
  }
}

function hasVault() {
  return localStorage.getItem(VAULT_KEY) !== null;
}

// --- START OF USEVAULT HOOK ---
const useVault = () => {
  const [items, setItems] = React.useState([]);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [hasPin, setHasPin] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    try {
      setHasPin(hasVault());
    } catch (e) {
      setError("Could not access storage.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lock = () => {
    setItems([]);
    setIsUnlocked(false);
    setError(null);
  };
  
  const setupPin = async (pin) => {
    setIsLoading(true);
    setError(null);
    try {
      const newVault = await encryptVault([], pin);
      saveVault(newVault);
      setHasPin(true);
      setIsUnlocked(true);
      setItems([]);
    } catch (e) {
      setError(e.message || "Failed to set up PIN.");
    } finally {
      setIsLoading(false);
    }
  };

  const unlock = async (pin) => {
    setIsLoading(true);
    setError(null);
    try {
      const storedVault = loadVault();
      if (!storedVault) throw new Error("Vault not found.");
      const decryptedItems = await decryptVault(storedVault, pin);
      setItems(decryptedItems);
      setIsUnlocked(true);
    } catch (e) {
      setError(e.message || "Failed to unlock vault.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveItems = React.useCallback(async (pin, newItems) => {
    try {
      // CRITICAL: Verify PIN by decrypting first to prevent data corruption.
      const storedVault = loadVault();
      if (storedVault) {
        await decryptVault(storedVault, pin); // This will throw if PIN is wrong
      } else {
        throw new Error("Cannot save: vault not found.");
      }
      
      // If decryption is successful, proceed to encrypt and save
      const encrypted = await encryptVault(newItems, pin);
      saveVault(encrypted);
      setItems(newItems);
    } catch (e) {
      console.error("Save failed:", e);
      throw e; // Re-throw to inform caller of failure
    }
  }, []);
  
  const addItem = React.useCallback(async (item, pin) => {
    const newItem = { ...item, id: uuidv4() };
    const currentItems = items; // Capture current items from state
    await saveItems(pin, [...currentItems, newItem]);
  }, [items, saveItems]);

  const updateItem = React.useCallback(async (updatedItem, pin) => {
    const currentItems = items; // Capture current items from state
    const newItems = currentItems.map((item) => item.id === updatedItem.id ? updatedItem : item);
    await saveItems(pin, newItems);
  }, [items, saveItems]);

  const deleteItem = React.useCallback(async (id, pin) => {
    const currentItems = items; // Capture current items from state
    const newItems = currentItems.filter((item) => item.id !== id);
    await saveItems(pin, newItems);
  }, [items, saveItems]);
  
  return { items, isUnlocked, hasPin, error, isLoading, lock, setupPin, unlock, addItem, updateItem, deleteItem };
};

// --- START OF ICONS ---
const LockIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>);
const EyeOpenIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>);
const EyeClosedIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>);
const PlusIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>);
const SearchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>);
const DeleteIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>);
const BackIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>);
const CheckIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>);
const CopyIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>);
const EditIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>);
const BackspaceIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 002.828 0L21 12M3 12l6.414-6.414a2 2 0 012.828 0L21 12" /></svg>);
const WifiIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.556A5.5 5.5 0 0112 15a5.5 5.5 0 013.889 1.556M12 12v.01M4.889 12.444A9.5 9.5 0 0112 9a9.5 9.5 0 017.111 3.444" /></svg>);

// --- START OF VIRTUALKEYBOARD COMPONENT ---
// FIX: Add explicit props type to allow 'key' prop, which is used to reset component state.
const VirtualKeyboard: React.FC<{ onKeyPress: (newPin: string) => void }> = ({ onKeyPress }) => {
  const [currentPin, setCurrentPin] = React.useState("");
  const handlePress = (key: string) => {
    let newPin;
    if (key === "backspace") {
      newPin = currentPin.slice(0, -1);
    } else {
      if (currentPin.length >= 6) return;
      newPin = currentPin + key;
    }
    setCurrentPin(newPin);
    onKeyPress(newPin);
  };
  // FIX: Correctly type the Key component props, making 'label' optional to fix missing property errors.
  const Key = ({ value, label }: {value: string, label?: React.ReactNode}) => (<button onClick={() => handlePress(value)} className="text-2xl font-light text-gray-200 bg-white/5 rounded-lg h-16 flex items-center justify-center transition-colors duration-200 hover:bg-white/10">{label || value}</button>);
  return (<div className="grid grid-cols-3 gap-3"><Key value="1" /><Key value="2" /><Key value="3" /><Key value="4" /><Key value="5" /><Key value="6" /><Key value="7" /><Key value="8" /><Key value="9" /><div /><Key value="0" /><Key value="backspace" label={<BackspaceIcon />} /></div>);
};

// --- START OF LOCKSCREEN COMPONENT ---
const LockScreen = ({ isLocked, hasPin, error, isLoading, setupPin, unlock }) => {
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [localError, setLocalError] = React.useState(null);
  React.useEffect(() => { setLocalError(error); }, [error]);
  React.useEffect(() => { if (!isLocked) { setPin(""); setConfirmPin(""); setIsConfirming(false); setLocalError(null); } }, [isLocked]);
  const handlePinChange = (value) => { if (value.length <= 6) { setLocalError(null); if(isConfirming) { setConfirmPin(value); } else { setPin(value); } } };
  const handleContinue = () => { if (!hasPin) { if (!isConfirming) { if (pin.length < 4) { setLocalError("O PIN deve ter entre 4 a 6 dígitos."); return; } setIsConfirming(true); } else { if (pin !== confirmPin) { setLocalError("Os PINs não correspondem."); setConfirmPin(""); return; } setupPin(pin); } } else { unlock(pin); } };
  const handleBackToCreate = () => { setIsConfirming(false); setPin(""); setConfirmPin(""); setLocalError(null); };
  const getSubtitle = () => { if (!hasPin) { return isConfirming ? "Confirme seu PIN." : "Crie um PIN de 4 a 6 dígitos."; } return `Digite seu PIN para desbloquear.`; };
  const currentPin = isConfirming ? confirmPin : pin;
  const isButtonDisabled = isLoading || (isConfirming ? confirmPin.length < 4 : pin.length < 4);
  return (<div className="bg-[#161b22] border border-gray-800 rounded-lg p-8 text-center shadow-lg"><div className="mb-6 flex justify-center"><LockIcon /></div><h1 className="text-2xl font-bold mb-2">{hasPin ? "Bem-vindo" : "Configurar MiniCofre"}</h1><p className="text-gray-400 mb-6">{getSubtitle()}</p>{isConfirming && !hasPin && (<div className="mb-4"><button onClick={handleBackToCreate} className="text-blue-400 hover:underline">&larr; Voltar</button></div>)}<div className="flex justify-center space-x-3 my-4">{[...Array(6)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full border-2 border-gray-600 ${currentPin.length > i ? "bg-blue-400 border-blue-400" : ""}`}></div>))}</div>{localError && <p className="text-red-400 my-4 h-6">{localError}</p>}{!localError && <div className="my-4 h-6"></div>}<VirtualKeyboard key={isConfirming ? 'confirm' : 'create'} onKeyPress={handlePinChange} /><button onClick={handleContinue} disabled={isButtonDisabled} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 enabled:hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed">{isLoading ? <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div></div> : (hasPin ? "Desbloquear" : "Continuar")}</button></div>);
};

// --- START OF VIEWITEM COMPONENT ---
const Field = ({ label, value, isSecret = false }) => {
  const [revealed, setRevealed] = React.useState(!isSecret);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => { if (revealed && isSecret) { const timerId = setTimeout(() => setRevealed(false), 5000); return () => clearTimeout(timerId); } }, [revealed, isSecret]);
  const handleCopy = () => { if (value) { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  if (!value) return null;
  return (<div className="mb-4"><label className="block text-sm font-medium text-gray-400 mb-1">{label}</label><div className="flex items-center space-x-2"><div className="flex-grow bg-[#0d1117] border border-gray-700 rounded-md p-3"><span className={revealed ? 'text-white' : 'text-transparent bg-gray-600 rounded-sm'}>{isSecret && !revealed ? '************' : value}</span></div>{isSecret && (<button onClick={() => setRevealed(!revealed)} className="p-2 text-gray-400 hover:text-white">{revealed ? <EyeClosedIcon /> : <EyeOpenIcon />}</button>)}<button onClick={handleCopy} className={`p-2 ${copied ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}><CopyIcon /></button></div></div>);
};
const ViewItem = ({ item, onBack, onEdit }) => {
  const getPrimaryLabel = () => { switch (item.category) { case ItemCategory.CreditCard: return "Número do Cartão"; case ItemCategory.WiFi: return "Nome da Rede (SSID)"; default: return "Usuário / E-mail"; } };
  const getSecondaryLabel = () => { switch (item.category) { case ItemCategory.CreditCard: return "CVV"; case ItemCategory.WiFi: return "Senha"; default: return "Senha"; } };
  return (<div><header className="flex items-center justify-between mb-6"><button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-white"><BackIcon /></button><h2 className="text-lg font-bold truncate">{item.title}</h2><button onClick={() => onEdit(item)} className="p-2 -mr-2 text-gray-400 hover:text-white"><EditIcon /></button></header><div className="space-y-4"><Field label={getPrimaryLabel()} value={item.primaryField} isSecret /><Field label={getSecondaryLabel()} value={item.secondaryField} isSecret />{item.notes && (<div><label className="block text-sm font-medium text-gray-400 mb-1">Notas</label><div className="w-full bg-[#0d1117] border border-gray-700 rounded-md p-3 whitespace-pre-wrap text-gray-300">{item.notes}</div></div>)}</div></div>);
};

// --- START OF ITEMFORM COMPONENT ---
const ItemForm = ({ item, onSave, onCancel, onDelete }) => {
  const [formData, setFormData] = React.useState({ title: item?.title || "", category: item?.category || ItemCategory.Login, primaryField: item?.primaryField || "", secondaryField: item?.secondaryField || "", notes: item?.notes || "" });
  const [pin, setPin] = React.useState('');
  const [showPinModal, setShowPinModal] = React.useState(false);
  const [actionType, setActionType] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [pinError, setPinError] = React.useState(null);
  const [pinAttempt, setPinAttempt] = React.useState(0);

  const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); };
  
  const handleActionAttempt = (type) => { 
      if (type === 'save' && !formData.title) return; 
      setActionType(type); 
      setShowPinModal(true); 
  };

  const handlePinConfirm = async () => {
      if (pin.length < 4 || isProcessing) return;
      setIsProcessing(true);
      setPinError(null);
      try {
          if (actionType === 'save') {
              await onSave(item ? { ...item, ...formData } : formData, pin);
          } else if (actionType === 'delete' && item) {
              await onDelete(item.id, pin);
          }
          // On success, the component will unmount via parent state change, so no need to reset state here.
      } catch (e) {
          console.error("Action failed:", e);
          setPinError("Ação falhou. Verifique o PIN e tente novamente.");
          setIsProcessing(false); // Allow retry
          setPinAttempt(a => a + 1); // This will reset the VirtualKeyboard
      }
  };

  const resetPinModal = () => {
      setShowPinModal(false);
      setPin('');
      setActionType(null);
      setIsProcessing(false);
      setPinError(null);
      setPinAttempt(0);
  };

  const getPrimaryLabel = () => { switch (formData.category) { case ItemCategory.CreditCard: return "Número do Cartão"; case ItemCategory.WiFi: return "Nome da Rede (SSID)"; default: return "Usuário / E-mail"; } };
  const getSecondaryLabel = () => { switch (formData.category) { case ItemCategory.CreditCard: return "CVV"; case ItemCategory.WiFi: return "Senha"; default: return "Senha"; } };

  return (<><div className="flex flex-col h-full"><header className="flex items-center justify-between mb-6"><button onClick={onCancel} className="p-2 -ml-2 text-gray-400 hover:text-white"><BackIcon /></button><h2 className="text-lg font-bold">{item ? "Editar Item" : "Adicionar Item"}</h2><button onClick={() => handleActionAttempt('save')} className={`p-2 -mr-2 ${!formData.title ? 'text-gray-600' : 'text-blue-400 hover:text-blue-300'}`} disabled={!formData.title}><CheckIcon /></button></header><form className="space-y-4 flex-grow"><div><label htmlFor="title" className="block text-sm font-medium text-gray-400">Título</label><input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div><div><label htmlFor="category" className="block text-sm font-medium text-gray-400">Categoria</label><select name="category" id="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">{Object.values(ItemCategory).map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div><div><label htmlFor="primaryField" className="block text-sm font-medium text-gray-400">{getPrimaryLabel()}</label><input type="text" name="primaryField" id="primaryField" value={formData.primaryField} onChange={handleChange} className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label htmlFor="secondaryField" className="block text-sm font-medium text-gray-400">{getSecondaryLabel()}</label><input type="password" name="secondaryField" id="secondaryField" value={formData.secondaryField} onChange={handleChange} className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label htmlFor="notes" className="block text-sm font-medium text-gray-400">Notas</label><textarea name="notes" id="notes" rows={4} value={formData.notes} onChange={handleChange} className="mt-1 block w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></form>{item && (<div className="mt-auto pt-4"><button onClick={() => handleActionAttempt('delete')} className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"><DeleteIcon /><span className="ml-2">Excluir Item</span></button></div>)}</div>{showPinModal && (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"><div className="bg-[#161b22] p-6 rounded-lg shadow-xl w-full max-w-sm"><h3 className="text-lg font-bold text-center mb-2">Confirme seu PIN</h3><p className="text-center text-gray-400 mb-4">Para sua segurança, por favor, insira seu PIN para {actionType === 'save' ? 'salvar' : 'excluir'}.</p>{pinError && <p className="text-red-400 my-2 text-center text-sm h-5">{pinError}</p>}{!pinError && <div className="my-2 h-5"></div>}<div className="flex justify-center space-x-3 my-4">{[...Array(6)].map((_, i) => (<div key={i} className={`w-4 h-4 rounded-full border-2 border-gray-600 ${pin.length > i ? "bg-blue-400 border-blue-400" : ""}`}></div>))}</div><div className="my-4"><VirtualKeyboard key={pinAttempt} onKeyPress={(newPin) => { if (pinError) setPinError(null); setPin(newPin);}} /></div><div className="flex gap-4 mt-6"><button onClick={resetPinModal} className="w-full py-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600" disabled={isProcessing}>Cancelar</button><button onClick={handlePinConfirm} className="w-full py-2 px-4 bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 flex justify-center items-center" disabled={pin.length < 4 || isProcessing}>{isProcessing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Confirmar'}</button></div></div></div>)}</>);
};

// --- START OF ITEMLIST COMPONENT ---
const CategoryIcon = ({ category }) => {
  const getIcon = () => { switch (category) { case ItemCategory.Login: return "👤"; case ItemCategory.CreditCard: return "💳"; case ItemCategory.WiFi: return <div className="w-6 h-6"><WifiIcon /></div>; case ItemCategory.Note: return "📝"; default: return "📦"; } };
  return <div className="text-2xl mr-4 flex items-center justify-center w-8 h-8">{getIcon()}</div>;
};
const ItemList = ({ items, onSelectItem, onAddNew }) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const filteredItems = items.filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.notes?.toLowerCase().includes(searchTerm.toLowerCase()));
  return (<div className="h-full flex flex-col"><div className="relative mb-4"><input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0d1117] border border-gray-700 rounded-md py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div></div><div className="flex-grow overflow-y-auto">{filteredItems.length > 0 ? (<ul>{filteredItems.map((item) => (<li key={item.id} onClick={() => onSelectItem(item)} className="flex items-center p-3 mb-2 rounded-md cursor-pointer hover:bg-gray-800 transition-colors"><CategoryIcon category={item.category} /><div><p className="font-semibold">{item.title}</p></div></li>))}</ul>) : (<div className="text-center text-gray-500 py-10"><p>Nenhum item encontrado.</p><p>Clique no '+' para adicionar.</p></div>)}</div><div className="mt-auto pt-4 flex justify-end"><button onClick={onAddNew} className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors" aria-label="Add new item"><PlusIcon /></button></div></div>);
};

// --- START OF VAULT COMPONENT ---
const Vault = ({ vault }) => {
  const [currentView, setCurrentView] = React.useState("LIST");
  const [selectedItem, setSelectedItem] = React.useState(null);
  const handleSelectItem = (item) => { setSelectedItem(item); setCurrentView("VIEW"); };
  const handleEditItem = (item) => { setSelectedItem(item); setCurrentView("EDIT"); };
  const handleAddNew = () => { setSelectedItem(null); setCurrentView("ADD"); };
  const handleBack = () => { setSelectedItem(null); setCurrentView("LIST"); };
  const handleSaveItem = async (item, pin) => { if ('id' in item) { await vault.updateItem(item, pin); } else { await vault.addItem(item, pin); } handleBack(); }
  const handleDeleteItem = async (id, pin) => { await vault.deleteItem(id, pin); handleBack(); }
  const renderView = () => { switch (currentView) { case "VIEW": return selectedItem && <ViewItem item={selectedItem} onBack={handleBack} onEdit={() => handleEditItem(selectedItem)} />; case "ADD": case "EDIT": return <ItemForm item={selectedItem} onSave={handleSaveItem} onCancel={handleBack} onDelete={handleDeleteItem} />; case "LIST": default: return <ItemList items={vault.items} onSelectItem={handleSelectItem} onAddNew={handleAddNew} />; } };
  return (<div className="bg-[#161b22] border border-gray-800 rounded-lg p-6 shadow-lg w-full max-w-md min-h-[600px] flex flex-col"><header className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700"><h1 className="text-xl font-bold">MiniCofre</h1><button onClick={vault.lock} className="text-gray-400 hover:text-white" aria-label="Trancar cofre"><LockIcon /></button></header><main className="flex-grow">{renderView()}</main></div>);
};

// --- START OF APP COMPONENT ---
const App = () => {
  const vault = useVault();
  return (<div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4"><div className="w-full max-w-md mx-auto">{!vault.isUnlocked ? (<LockScreen isLocked={!vault.isUnlocked} hasPin={vault.hasPin} error={vault.error} setupPin={vault.setupPin} unlock={vault.unlock} isLoading={vault.isLoading} />) : (<Vault vault={vault} />)}</div></div>);
};

// --- FINAL RENDER ---
const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);
root.render(<App />);
