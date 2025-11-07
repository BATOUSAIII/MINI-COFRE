import React, { useState, useEffect } from "react";
import { LockIcon } from "./common/Icons";
import VirtualKeyboard from "./VirtualKeyboard";

interface LockScreenProps {
  isLocked: boolean;
  hasPin: boolean;
  error: string | null;
  isLoading: boolean;
  setupPin: (pin: string) => void;
  unlock: (pin: string) => void;
}

const LockScreen: React.FC<LockScreenProps> = ({
  isLocked,
  hasPin,
  error,
  isLoading,
  setupPin,
  unlock,
}) => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(error);
  }, [error]);

  useEffect(() => {
    if (!isLocked) {
      setPin("");
      setConfirmPin("");
      setIsConfirming(false);
      setLocalError(null);
    }
  }, [isLocked]);
  
  const handlePinChange = (value: string) => {
    if (value.length <= 6) {
      setLocalError(null);
      if(isConfirming) {
        setConfirmPin(value);
      } else {
        setPin(value);
      }
    }
  };

  const handleContinue = () => {
    if (!hasPin) {
      if (!isConfirming) {
        if (pin.length < 4) {
          setLocalError("O PIN deve ter entre 4 a 6 dígitos.");
          return;
        }
        setIsConfirming(true);
      } else {
        if (pin !== confirmPin) {
          setLocalError("Os PINs não correspondem.");
          setConfirmPin("");
          return;
        }
        setupPin(pin);
      }
    } else {
      unlock(pin);
    }
  };

  const getSubtitle = () => {
    if (!hasPin) {
      return isConfirming ? "Confirme seu PIN." : "Crie um PIN de 4 a 6 dígitos.";
    }
    return `Digite seu PIN para desbloquear.`;
  };

  const currentPin = isConfirming ? confirmPin : pin;
  const isButtonDisabled = isLoading || (isConfirming ? confirmPin.length < 4 : pin.length < 4);

  return (
    <div className="bg-[#161b22] border border-gray-800 rounded-lg p-8 text-center shadow-lg">
      <div className="mb-6 flex justify-center">
        <LockIcon />
      </div>
      <h1 className="text-2xl font-bold mb-2">
        {hasPin ? "Bem-vindo" : "Configurar MiniCofre"}
      </h1>
      <p className="text-gray-400 mb-6">{getSubtitle()}</p>
      
      <div className="flex justify-center space-x-3 my-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 border-gray-600 ${
              currentPin.length > i ? "bg-blue-400 border-blue-400" : ""
            }`}
          ></div>
        ))}
      </div>

      {localError && <p className="text-red-400 my-4 h-6">{localError}</p>}
      {!localError && <div className="my-4 h-6"></div>}


      <VirtualKeyboard key={isConfirming ? 'confirm' : 'create'} onKeyPress={handlePinChange} />

      <button
        onClick={handleContinue}
        disabled={isButtonDisabled}
        className="w-full mt-6 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 enabled:hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
      >
        {isLoading ? (
            <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            </div>
        ) : (hasPin ? "Desbloquear" : "Continuar")}
      </button>
    </div>
  );
};

export default LockScreen;