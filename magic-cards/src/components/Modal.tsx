import React, { useState, useEffect } from 'react';
import { Heart, X } from 'lucide-react';
import { ModalConfig } from '../types';

interface ModalProps {
  config: ModalConfig | null;
  onClose: () => void;
}

export const Modal: React.FC<ModalProps> = ({ config, onClose }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (config?.defaultValue) {
      setInputValue(config.defaultValue);
    } else {
      setInputValue('');
    }
  }, [config]);

  if (!config || !config.isOpen) return null;

  const handleConfirm = () => {
    if (config.onConfirm) {
      config.onConfirm(config.isPrompt ? inputValue : undefined);
    }
    onClose();
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900/95 border-2 border-pink-400/60 rounded-3xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-black text-pink-300 mb-2 flex items-center gap-2 font-heading">
          <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
          {config.title}
        </h3>

        <p className="text-slate-300 text-sm mb-5 leading-relaxed font-medium">
          {config.message}
        </p>

        {config.isPrompt && (
          <div className="mb-6">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
              }}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border-2 border-pink-400/50 bg-slate-950 text-white font-bold outline-none focus:ring-4 focus:ring-pink-400/40 text-sm placeholder:text-slate-400"
              placeholder="Nhập tên (tiếng Việt có dấu)..."
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          {config.showCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-all border border-slate-700 cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-black rounded-xl text-sm shadow-lg shadow-pink-500/25 transition-all cursor-pointer border border-pink-300/40"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
