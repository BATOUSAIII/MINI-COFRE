import React from "react";
import { BackspaceIcon } from "./common/Icons";

interface VirtualKeyboardProps {
  onKeyPress: (value: string) => void;
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ onKeyPress }) => {
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
  
  // FIX: Replaced JSX.Element with React.ReactNode to resolve missing namespace error.
  const Key = ({ value, label }: { value: string, label?: string | React.ReactNode }) => (
    <button
      onClick={() => handlePress(value)}
      className="text-2xl font-light text-gray-200 bg-white/5 rounded-lg h-16 flex items-center justify-center transition-colors duration-200 hover:bg-white/10"
    >
      {label || value}
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      <Key value="1" />
      <Key value="2" />
      <Key value="3" />
      <Key value="4" />
      <Key value="5" />
      <Key value="6" />
      <Key value="7" />
      <Key value="8" />
      <Key value="9" />
      <div />
      <Key value="0" />
      <Key value="backspace" label={<BackspaceIcon />} />
    </div>
  );
};

export default VirtualKeyboard;