import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { KeyRound, AlertTriangle, Delete, RefreshCw } from 'lucide-react';

export const PinScreen: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const setPin = useAppStore(state => state.setPin);
  const unlockApp = useAppStore(state => state.unlockApp);
  const wipeData = useAppStore(state => state.wipeData);
  const error = useAppStore(state => state.error);
  
  const isInitialSetup = !settings?.has_pin;

  const [pin, setPinState] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Use refs to avoid re-attaching listener on every keystroke
  const stateRef = useRef({ pin, confirmPin, setupStep, isInitialSetup, isWipeModalOpen });
  useEffect(() => {
    stateRef.current = { pin, confirmPin, setupStep, isInitialSetup, isWipeModalOpen };
  }, [pin, confirmPin, setupStep, isInitialSetup, isWipeModalOpen]);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { pin: currentPin, confirmPin: currentConfirmPin, setupStep: currentSetupStep, isInitialSetup: currentIsInitialSetup, isWipeModalOpen: currentIsWipeModalOpen } = stateRef.current;
      
      if (currentIsWipeModalOpen) return;

      if (e.key >= '0' && e.key <= '9') {
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (currentIsInitialSetup && currentSetupStep === 'create' && currentPin.length === 6) {
          setSetupStep('confirm');
        } else if (currentIsInitialSetup && currentSetupStep === 'confirm' && currentConfirmPin.length === 6) {
          handleSubmitSetup();
        } else if (!currentIsInitialSetup && currentPin.length === 6) {
          handleUnlockRef(currentPin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendDigit = (digit: string) => {
    setLocalError(null);
    if (isInitialSetup) {
      if (setupStep === 'create') {
        if (pin.length < 6) {
          const next = pin + digit;
          setPinState(next);
          if (next.length === 6) {
            setTimeout(() => setSetupStep('confirm'), 200);
          }
        }
      } else {
        if (confirmPin.length < 6) {
          const next = confirmPin + digit;
          setConfirmPin(next);
          if (next.length === 6) {
            handleCompleteSetup(pin, next);
          }
        }
      }
    } else {
      if (pin.length < 6) {
        const next = pin + digit;
        setPinState(next);
        if (next.length === 6) {
          handleCompleteUnlock(next);
        }
      }
    }
  };

  const handleBackspace = () => {
    setLocalError(null);
    if (isInitialSetup) {
      if (setupStep === 'create') {
        setPinState((prev) => prev.slice(0, -1));
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    } else {
      setPinState((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setLocalError(null);
    if (isInitialSetup) {
      if (setupStep === 'confirm') {
        setConfirmPin('');
      } else {
        setPinState('');
      }
    } else {
      setPinState('');
    }
  };

  const handleCompleteUnlock = async (enteredPin: string) => {
    setIsProcessing(true);
    const ok = await unlockApp(enteredPin);
    setIsProcessing(false);
    if (!ok) {
      setPinState('');
    }
  };


  const handleUnlockRef = async (currentPin: string) => {
    if (currentPin.length === 6) {
      await handleCompleteUnlock(currentPin);
    }
  };

  const handleCompleteSetup = async (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setLocalError("PINs do not match. Let's start over.");
      setPinState('');
      setConfirmPin('');
      setSetupStep('create');
      return;
    }

    setIsProcessing(true);
    try {
      await setPin(firstPin);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to set PIN');
      setPinState('');
      setConfirmPin('');
      setSetupStep('create');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitSetup = () => {
    if (confirmPin.length === 6) {
      handleCompleteSetup(pin, confirmPin);
    }
  };

  const handleWipeConfirm = async () => {
    if (wipeConfirmText !== 'WIPE DATA') {
      setLocalError('You must type "WIPE DATA" exactly to confirm.');
      return;
    }

    setIsProcessing(true);
    try {
      await wipeData();
      setIsWipeModalOpen(false);
      setWipeConfirmText('');
      setPinState('');
      setConfirmPin('');
      setSetupStep('create');
      setLocalError(null);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to wipe data');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentLength = isInitialSetup
    ? setupStep === 'create'
      ? pin.length
      : confirmPin.length
    : pin.length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 select-none text-zinc-100">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
        {/* App Logo */}
        <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center mb-5 text-purple-400 shadow-lg shadow-purple-950/50">
          <KeyRound className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Lyncost
        </h1>

        <p className="text-sm text-zinc-400 text-center mb-6">
          {isInitialSetup
            ? setupStep === 'create'
              ? 'Set your 6-digit Master PIN'
              : 'Confirm your 6-digit Master PIN'
            : 'Enter your 6-digit PIN to unlock'}
        </p>

        {/* PIN Dots display */}
        <div className="flex gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                i < currentLength
                  ? 'bg-purple-500 scale-110 shadow-sm shadow-purple-500/50'
                  : 'bg-zinc-800 border border-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Error notice */}
        {(localError || error) && (
          <div className="w-full mb-4 px-3 py-2 rounded-lg bg-red-950/60 border border-red-900/60 text-red-400 text-xs text-center font-medium">
            {localError || error}
          </div>
        )}

        {/* Numpad buttons */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isProcessing}
              onClick={() => appendDigit(num.toString())}
              className="h-14 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 text-white font-semibold text-xl border border-zinc-700/60 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleClear}
            className="h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 font-medium text-xs border border-zinc-800 transition-all flex items-center justify-center cursor-pointer"
          >
            CLEAR
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => appendDigit('0')}
            className="h-14 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 active:bg-zinc-600 text-white font-semibold text-xl border border-zinc-700/60 transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleBackspace}
            className="h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400 border border-zinc-800 transition-all flex items-center justify-center cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Step / Confirm indicator for setup */}
        {isInitialSetup && (
          <div className="w-full flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Step {setupStep === 'create' ? '1 of 2' : '2 of 2'}</span>
            {setupStep === 'confirm' && (
              <button
                type="button"
                onClick={() => {
                  setSetupStep('create');
                  setConfirmPin('');
                }}
                className="text-purple-400 hover:underline cursor-pointer"
              >
                Change PIN
              </button>
            )}
          </div>
        )}

        {/* Offline Warning & Forgot PIN Option */}
        {!isInitialSetup && (
          <button
            type="button"
            onClick={() => setIsWipeModalOpen(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-2 cursor-pointer"
          >
            Forgot your PIN?
          </button>
        )}
      </div>

      {/* Forgot PIN / Full Data Wipe Modal */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-red-950/70 border border-red-900/80 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              Forgot PIN — Full Offline Reset
            </h3>

            <div className="space-y-2 text-xs text-zinc-300 mb-4 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <p>
                <strong>Important Trade-off:</strong> Lyncost is a 100% offline personal finance application. There are no servers, no cloud accounts, and no password recovery emails.
              </p>
              <p className="text-red-400 font-medium">
                Resetting your PIN will completely wipe all accounts, transactions, and settings stored in your local database.
              </p>
            </div>

            <label className="block text-xs text-zinc-400 mb-1">
              To proceed with wiping all data, type <span className="font-mono text-white font-bold">WIPE DATA</span> below:
            </label>
            <input
              type="text"
              value={wipeConfirmText}
              onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder="Type WIPE DATA"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500 mb-4"
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsWipeModalOpen(false);
                  setWipeConfirmText('');
                }}
                className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wipeConfirmText !== 'WIPE DATA' || isProcessing}
                onClick={handleWipeConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors cursor-pointer flex items-center gap-2"
              >
                {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                Erase & Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
