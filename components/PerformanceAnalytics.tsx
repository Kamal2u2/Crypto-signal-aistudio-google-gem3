
import React from 'react';
import type { PerformanceMetrics } from '../types';
import { formatCurrency, formatPercentage } from '../utils';

interface PerformanceAnalyticsProps {
  performance: PerformanceMetrics;
}

const StatCard: React.FC<{ title: string; value: string; color?: string; helpText?: string }> = ({ title, value, color = 'text-white', helpText }) => (
  <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium text-dark-text-secondary">{title}</h4>
      {helpText && <span className="text-xs text-dark-text-secondary cursor-help" title={helpText}>?</span>}
    </div>
    <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
  </div>
);

const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({ performance }) => {
  const pnlColor = performance.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red';
  const winRateColor = performance.winRate >= 50 ? 'text-accent-green' : 'text-accent-red';

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4">
      <h2 className="text-lg font-semibold mb-4 text-white">Performance Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total PNL" 
          value={formatCurrency(performance.totalPnl)} 
          color={pnlColor}
          helpText="Realized + Unrealized PNL"
        />
        <StatCard 
          title="Win Rate" 
          value={formatPercentage(performance.winRate)} 
          color={winRateColor}
          helpText="Percentage of winning trades"
        />
        <StatCard 
          title="Total Trades" 
          value={performance.totalTrades.toString()}
          helpText="Number of completed trades"
        />
        <StatCard 
          title="Realized PNL" 
          value={formatCurrency(performance.realizedPnl)}
          color={performance.realizedPnl > 0 ? 'text-accent-green' : 'text-accent-red'}
          helpText="PNL from closed trades"
        />
        <StatCard 
          title="Avg. PNL/Trade" 
          value={formatCurrency(performance.avgPnlPerTrade)}
          color={performance.avgPnlPerTrade > 0 ? 'text-accent-green' : 'text-accent-red'}
          helpText="Average PNL per completed trade"
        />
      </div>
    </div>
  );
};

export default PerformanceAnalytics;