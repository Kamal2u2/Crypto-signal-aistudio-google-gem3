
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createChart, IChartApi, ISeriesApi, ColorType, LineStyle, AreaSeries } from 'lightweight-charts';
import type { BacktestResult, Signal } from '../types';
import { formatCurrency, formatPercentage, formatDateTime } from '../utils';

interface BacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
  runBacktest: (options?: { initialBalance?: number; riskPercentage?: number; candleLimit?: number }) => BacktestResult | null;
  symbol: string;
  timeframe: string;
  maxDataPoints?: number;
}

interface BacktestConfig {
  initialBalance: number;
  riskPercentage: number;
  candleLimit: number;
}

const BacktestModal: React.FC<BacktestModalProps> = ({ isOpen, onClose, runBacktest, symbol, timeframe, maxDataPoints = 2000 }) => {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<BacktestConfig>({
    initialBalance: 10000,
    riskPercentage: 1.0,
    candleLimit: 500
  });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  
  // Track if component is mounted to avoid state updates after unmount
  const isMounted = useRef(false);

  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; };
  }, []);

  const handleRunBacktest = () => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      // Small timeout to allow UI to render modal before heavy calculation
      setTimeout(() => {
          if (!isMounted.current || !isOpen) return;
          
          try {
              const res = runBacktest(config);
              if (isMounted.current) {
                  if (res) {
                    setResult(res);
                  } else {
                    setError("Not enough data or analysis failed. Try a shorter duration or different symbol.");
                  }
              }
          } catch (e) {
              console.error("Backtest fatal error", e);
              if (isMounted.current) setError("An unexpected error occurred during simulation.");
          } finally {
              if (isMounted.current) setIsLoading(false);
          }
      }, 100);
  };

  useEffect(() => {
    if (isOpen && !result && !isLoading && !error) {
        handleRunBacktest();
    }
  }, [isOpen]);

  // Adjust candle limit if maxDataPoints changes (e.g. more data fetched)
  useEffect(() => {
      if (maxDataPoints > config.candleLimit && config.candleLimit === 500) {
          setConfig(prev => ({ ...prev, candleLimit: Math.min(1000, maxDataPoints) }));
      }
  }, [maxDataPoints]);

  useEffect(() => {
    if (isOpen && result && chartContainerRef.current && !chartRef.current) {
        try {
            const chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: 250,
                layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8B949E' },
                grid: { vertLines: { color: '#30363D', visible: false }, horzLines: { color: '#30363D', visible: true } },
                timeScale: { borderColor: '#30363D', timeVisible: true },
                rightPriceScale: { borderColor: '#30363D' },
            });

            const areaSeries = chart.addSeries(AreaSeries, {
                lineColor: '#58A6FF',
                topColor: 'rgba(88, 166, 255, 0.4)',
                bottomColor: 'rgba(88, 166, 255, 0.0)',
            });

            areaSeries.setData(result.equityCurve);
            chart.timeScale().fitContent();

            chartRef.current = chart;
            lineSeriesRef.current = areaSeries;

            const handleResize = () => {
                if (chartRef.current && chartContainerRef.current) {
                    chartRef.current.applyOptions({ 
                        width: chartContainerRef.current.clientWidth
                    });
                }
            };
            
            window.addEventListener('resize', handleResize);
            
            // Clean up resize listener
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        } catch (err) {
            console.error("Error rendering backtest chart:", err);
        }
    }
    
    // Cleanup chart instance on unmount or result change
    return () => {
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }
    };
  }, [isOpen, result]);

  // Reset on close
  useEffect(() => {
      if (!isOpen) {
          setResult(null);
          setIsLoading(false);
          setError(null);
      }
  }, [isOpen]);

  const netProfitColor = result && result.metrics.netProfitPercent >= 0 ? 'text-accent-green' : 'text-accent-red';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-dark-card border border-dark-border rounded-lg w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-card flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Strategy Backtest</h2>
                <p className="text-sm text-dark-text-secondary">
                    {symbol} | {timeframe}
                </p>
              </div>
              <button onClick={onClose} className="text-dark-text-secondary hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {/* Configuration Panel */}
                <div className="bg-dark-bg border border-dark-border p-4 rounded-lg mb-6 shadow-sm">
                   <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                       <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                       Configuration
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div>
                         <label className="block text-xs text-dark-text-secondary mb-1">Initial Balance ($)</label>
                         <input 
                            type="number" 
                            min="100"
                            step="100"
                            value={config.initialBalance}
                            onChange={(e) => setConfig({...config, initialBalance: Number(e.target.value)})}
                            className="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-sm text-white focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all"
                         />
                      </div>
                      <div>
                         <label className="block text-xs text-dark-text-secondary mb-1">Risk per Trade (%)</label>
                         <input 
                            type="number" 
                            step="0.1"
                            max="10"
                            min="0.1"
                            value={config.riskPercentage}
                            onChange={(e) => setConfig({...config, riskPercentage: Number(e.target.value)})}
                            className="w-full bg-dark-card border border-dark-border rounded px-3 py-2 text-sm text-white focus:border-accent-blue focus:outline-none focus:ring-1 focus:ring-accent-blue transition-all"
                         />
                      </div>
                      <div className="flex flex-col">
                         <div className="flex justify-between mb-1">
                             <label className="block text-xs text-dark-text-secondary">Duration (Candles)</label>
                             <span className="text-xs text-accent-blue font-mono">{config.candleLimit} / {maxDataPoints}</span>
                         </div>
                         <input 
                            type="range" 
                            min="100" 
                            max={maxDataPoints} 
                            step="50"
                            value={config.candleLimit}
                            onChange={(e) => setConfig({...config, candleLimit: Number(e.target.value)})}
                            className="w-full h-2 bg-dark-card rounded-lg appearance-none cursor-pointer accent-accent-blue"
                         />
                      </div>
                   </div>
                   <div className="mt-4 flex justify-end">
                      <button 
                        onClick={handleRunBacktest}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-accent-blue text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-accent-blue/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent-blue/20"
                      >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Simulating...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                Run Simulation
                            </>
                        )}
                      </button>
                   </div>
                </div>

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4 opacity-50">
                         <div className="w-12 h-12 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-red/10 text-accent-red mb-4">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">Backtest Failed</h3>
                        <p className="text-dark-text-secondary max-w-xs mx-auto">{error}</p>
                    </div>
                ) : result ? (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
                                <div className="text-sm text-dark-text-secondary">Net Profit</div>
                                <div className={`text-2xl font-bold ${netProfitColor}`}>{formatPercentage(result.metrics.netProfitPercent)}</div>
                            </div>
                            <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
                                <div className="text-sm text-dark-text-secondary">Win Rate</div>
                                <div className={`text-2xl font-bold ${result.metrics.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'}`}>{formatPercentage(result.metrics.winRate)}</div>
                            </div>
                             <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
                                <div className="text-sm text-dark-text-secondary">Profit Factor</div>
                                <div className="text-2xl font-bold text-white">{result.metrics.profitFactor.toFixed(2)}</div>
                            </div>
                             <div className="bg-dark-bg p-4 rounded-lg border border-dark-border">
                                <div className="text-sm text-dark-text-secondary">Total Trades</div>
                                <div className="text-2xl font-bold text-white">{result.metrics.totalTrades}</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-dark-bg p-3 rounded border border-dark-border text-center">
                                <div className="text-xs text-dark-text-secondary">Wins</div>
                                <div className="text-lg font-semibold text-accent-green">{result.metrics.wins}</div>
                            </div>
                            <div className="bg-dark-bg p-3 rounded border border-dark-border text-center">
                                <div className="text-xs text-dark-text-secondary">Losses</div>
                                <div className="text-lg font-semibold text-accent-red">{result.metrics.losses}</div>
                            </div>
                             <div className="bg-dark-bg p-3 rounded border border-dark-border text-center">
                                <div className="text-xs text-dark-text-secondary">Max Drawdown</div>
                                <div className="text-lg font-semibold text-accent-red">{formatPercentage(result.metrics.maxDrawdown)}</div>
                            </div>
                            <div className="bg-dark-bg p-3 rounded border border-dark-border text-center">
                                <div className="text-xs text-dark-text-secondary">Expected Value</div>
                                <div className="text-lg font-semibold text-accent-blue">
                                    {result.metrics.totalTrades > 0 
                                        ? formatPercentage(result.metrics.netProfitPercent / result.metrics.totalTrades) 
                                        : '0%'}
                                </div>
                            </div>
                        </div>

                        {/* Equity Curve */}
                        <div className="bg-dark-bg border border-dark-border rounded-lg p-4">
                             <h3 className="text-sm font-medium text-dark-text-secondary mb-4">Equity Curve (Account Growth)</h3>
                             <div ref={chartContainerRef} className="w-full" />
                        </div>

                        {/* Recent Trades List */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Trade Log</h3>
                            <div className="bg-dark-bg border border-dark-border rounded-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-dark-border text-dark-text-secondary font-medium">
                                        <tr>
                                            <th className="p-3">Time</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3 hidden sm:table-cell">Strategy</th>
                                            <th className="p-3">Entry</th>
                                            <th className="p-3">Result</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-border">
                                        {result.trades.map((trade) => (
                                            <tr key={trade.id} className="hover:bg-dark-card/50 transition-colors">
                                                <td className="p-3 text-dark-text-secondary">{formatDateTime(trade.createdAt)}</td>
                                                <td className={`p-3 font-bold ${trade.type === 'BUY' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                    {trade.type}
                                                </td>
                                                 <td className="p-3 hidden sm:table-cell">
                                                    <span className="text-xs bg-dark-card border border-dark-border px-2 py-1 rounded">
                                                        {trade.strategy?.replace('_', ' ')}
                                                    </span>
                                                 </td>
                                                <td className="p-3">{formatCurrency(trade.entryPrice, symbol)}</td>
                                                <td className={`p-3 font-bold ${trade.outcome === 'WIN' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                    {trade.outcome} ({trade.pnl?.toFixed(2)}%)
                                                </td>
                                            </tr>
                                        ))}
                                        {result.trades.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-dark-text-secondary">
                                                    No trades generated with current strategy parameters in the selected period.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-dark-text-secondary py-10">Ready to run backtest simulation.</div>
                )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BacktestModal;
