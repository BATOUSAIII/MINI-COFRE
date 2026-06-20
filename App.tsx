import React from "react";
import useVault from "./hooks/useVault";
import LockScreen from "./components/LockScreen";
import Vault from "./components/Vault";

const App: React.FC = () => {
  const vault = useVault();

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {!vault.isUnlocked ? (
          <LockScreen
            isLocked={!vault.isUnlocked}
            hasPin={vault.hasPin}
            error={vault.error}
            setupPin={vault.setupPin}
            unlock={vault.unlock}
            isLoading={vault.isLoading}
          />
        ) : (
          <Vault vault={vault} />
        )}
      </div>
    </div>
  );
};

export default App;