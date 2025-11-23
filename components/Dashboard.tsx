
import React from 'react';
import TradingChart from './TradingChart';
import SignalTimeline from './SignalTimeline';
import PerformanceAnalytics from './PerformanceAnalytics';
import type { Signal, PerformanceMetrics, CryptoSymbol, Timeframe, PriceData, CandleData } from '../types';

interface DashboardProps {
  activeSignals: Signal[];
  completedSignals: Signal[];
  performance: PerformanceMetrics;
  selectedSymbol: CryptoSymbol;
  selectedTimeframe: Timeframe;
  currentPrice: PriceData | null;
  priceHistory: number[];
  candleHistory: CandleData[];
  onRemoveSignal: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  activeSignals,
  completedSignals,
  performance,
  selectedSymbol,
  selectedTimeframe,
  currentPrice,
  priceHistory,
  candleHistory,
  onRemoveSignal,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 flex flex-col gap-6">
        <TradingChart 
          symbol={selectedSymbol} 
          timeframe={selectedTimeframe} 
          candleHistory={candleHistory}
          activeSignals={activeSignals}
        />
        <PerformanceAnalytics performance={performance} />
      </div>
      <div className="lg:col-span-4">
        <SignalTimeline 
          activeSignals={activeSignals} 
          completedSignals={completedSignals} 
          onRemoveSignal={onRemoveSignal}
        />
      </div>
    </div>
  );
};

export default Dashboard;
