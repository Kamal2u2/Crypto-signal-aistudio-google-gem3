
import React, { useState, useRef, useEffect } from 'react';
import { SYMBOLS } from '../constants';
import type { CryptoSymbol } from '../types';

interface SymbolSelectorProps {
  selectedSymbol: CryptoSymbol;
  onSelect: (symbol: CryptoSymbol) => void;
}

const SymbolSelector: React.FC<SymbolSelectorProps> = ({ selectedSymbol, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (symbol: CryptoSymbol) => {
    onSelect(symbol);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-md px-3 py-1.5 text-sm font-medium hover:bg-dark-border focus:outline-none focus:ring-2 focus:ring-accent-blue"
      >
        <span>{selectedSymbol}</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 bg-dark-card border border-dark-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {SYMBOLS.map(symbol => (
            <button
              key={symbol}
              onClick={() => handleSelect(symbol)}
              className={`w-full text-left px-4 py-2 text-sm ${selectedSymbol === symbol ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-dark-border'}`}
            >
              {symbol}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymbolSelector;