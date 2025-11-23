
import React from 'react';
import type { CryptoSymbol, Timeframe, SystemHealth, PriceData } from '../types';
import SymbolSelector from './SymbolSelector';
import TimeframeSelector from './TimeframeSelector';
import SystemHealthDisplay from './SystemHealth';
import { formatCurrency, formatPercentage } from '../utils';

interface HeaderProps {
  selectedSymbol: CryptoSymbol;
  setSelectedSymbol: (symbol: CryptoSymbol) => void;
  selectedTimeframe: Timeframe;
  setSelectedTimeframe: (timeframe: Timeframe) => void;
  systemHealth: SystemHealth;
  currentPrice: PriceData | null;
  activeSignalCount: number;
  onSettingsClick: () => void;
  onRefresh: () => void;
  onBacktestClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  selectedSymbol,
  setSelectedSymbol,
  selectedTimeframe,
  setSelectedTimeframe,
  systemHealth,
  currentPrice,
  activeSignalCount,
  onSettingsClick,
  onRefresh,
  onBacktestClick
}) => {
  const priceColor = currentPrice && currentPrice.change >= 0 ? 'text-accent-green' : 'text-accent-red';

  return (
    <header className="bg-dark-card border-b border-dark-border p-3 sticky top-0 z-50">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-accent-blue" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 15V9C4 5.68629 6.68629 3 10 3H14C17.3137 3 20 5.68629 20 9V15C20 18.3137 17.3137 21 14 21H10C6.68629 21 4 18.3137 4 15Z" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 15L12 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M15 12L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <h1 className="text-xl font-bold text-white">CryptoSignal Pro</h1>
          <div className="bg-accent-blue/20 text-accent-blue text-xs font-bold px-2 py-1 rounded-full">{activeSignalCount} Active</div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <SymbolSelector selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
          <TimeframeSelector selectedTimeframe={selectedTimeframe} onSelect={setSelectedTimeframe} />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right">
            {currentPrice ? (
              <>
                <div className={`text-lg font-semibold ${priceColor}`}>{formatCurrency(currentPrice.price, selectedSymbol)}</div>
                <div className={`text-sm ${priceColor}`}>
                  {formatCurrency(currentPrice.change, selectedSymbol)} ({formatPercentage(currentPrice.changePercent)})
                </div>
              </>
            ) : (
                <div className="h-10 w-32 bg-dark-border animate-pulse rounded-md"></div>
            )}
          </div>
          <SystemHealthDisplay health={systemHealth} />
          
          <button onClick={onBacktestClick} className="flex items-center gap-1 bg-dark-bg border border-dark-border px-3 py-1 rounded text-xs font-medium text-accent-yellow hover:bg-dark-border transition-colors">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
             <span>Backtest</span>
          </button>

          <button onClick={onRefresh} className="text-dark-text-secondary hover:text-white p-1 rounded hover:bg-dark-border/50 transition-colors" title="Refresh Data" aria-label="Refresh Data">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </button>
           <button onClick={onSettingsClick} className="text-dark-text-secondary hover:text-white" aria-label="Settings">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
