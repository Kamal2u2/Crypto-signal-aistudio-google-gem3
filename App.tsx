
import React, { useState } from 'react';
import { useCryptoData } from './hooks/useCryptoData';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { SYMBOLS, TIMEFRAMES } from './constants';
import type { CryptoSymbol, Timeframe } from './types';
import { SettingsProvider } from './contexts/SettingsContext';
import SettingsModal from './components/SettingsModal';
import BacktestModal from './components/BacktestModal';
import Chatbot from './components/Chatbot';
import { AnimatePresence, motion } from 'framer-motion';

const AppContent: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<CryptoSymbol>(SYMBOLS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1m');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    signals,
    performance,
    systemHealth,
    currentPrice,
    priceHistory,
    candleHistory,
    removeSignal,
    refresh,
    runBacktest
  } = useCryptoData(selectedSymbol, selectedTimeframe);

  const activeSignals = signals.filter(s => s.status === 'ACTIVE');
  const completedSignals = signals.filter(s => s.status !== 'ACTIVE');
  
  return (
    <>
      <div className="min-h-screen bg-dark-bg font-sans">
        <Header
          selectedSymbol={selectedSymbol}
          setSelectedSymbol={setSelectedSymbol}
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={setSelectedTimeframe}
          systemHealth={systemHealth}
          currentPrice={currentPrice}
          activeSignalCount={activeSignals.length}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onRefresh={refresh}
          onBacktestClick={() => setIsBacktestOpen(true)}
        />
        <main className="p-4 sm:p-6 lg:p-8">
          <Dashboard
            activeSignals={activeSignals}
            completedSignals={completedSignals}
            performance={performance}
            selectedSymbol={selectedSymbol}
            selectedTimeframe={selectedTimeframe}
            currentPrice={currentPrice}
            priceHistory={priceHistory}
            candleHistory={candleHistory}
            onRemoveSignal={removeSignal}
          />
        </main>
      </div>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <BacktestModal 
        isOpen={isBacktestOpen} 
        onClose={() => setIsBacktestOpen(false)} 
        runBacktest={runBacktest}
        symbol={selectedSymbol}
        timeframe={selectedTimeframe}
        maxDataPoints={candleHistory.length}
      />
      
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 bg-accent-blue text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-accent-blue z-50"
            aria-label="Open AI Analyst Chat"
          >
            <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>
      
      <Chatbot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        symbol={selectedSymbol}
        timeframe={selectedTimeframe}
      />
    </>
  );
};


const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

export default App;
