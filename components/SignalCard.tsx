
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Signal, TechnicalIndicators } from '../types';
import { SignalType, SignalStatus } from '../types';
import { formatCurrency, formatTime, timeSince, getPnlColor, formatDateTime } from '../utils';
import { getAIPoweredAnalysis, getMarketSentiment } from '../services/geminiService';

const StrengthIndicator: React.FC<{ strength: Signal['strength'] }> = ({ strength }) => {
    const strengthMap = {
        STRONG: { color: 'bg-accent-green', text: 'STRONG' },
        MEDIUM: { color: 'bg-accent-blue', text: 'MEDIUM' },
        WEAK: { color: 'bg-accent-yellow', text: 'WEAK' },
        LEAN: { color: 'bg-gray-500', text: 'LEAN' },
    };
    const { color, text } = strengthMap[strength];
    return <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${color}`}>{text}</span>;
};


const IndicatorDisplay: React.FC<{ indicators: TechnicalIndicators }> = ({ indicators }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-dark-text-secondary">
            <div className="bg-dark-bg p-2 rounded">
                <div className="font-bold">RSI</div>
                <div>{isNaN(indicators.RSI) ? 'N/A' : indicators.RSI.toFixed(2)}</div>
            </div>
            <div className="bg-dark-bg p-2 rounded">
                <div className="font-bold">MACD Hist</div>
                <div>{isNaN(indicators.MACD.histogram) ? 'N/A' : indicators.MACD.histogram.toFixed(4)}</div>
            </div>
             <div className="bg-dark-bg p-2 rounded">
                <div className="font-bold">StochRSI (K/D)</div>
                <div>
                    {isNaN(indicators.StochRSI?.k) ? 'N/A' : `${indicators.StochRSI.k.toFixed(0)} / ${indicators.StochRSI.d.toFixed(0)}`}
                </div>
            </div>
            <div className="bg-dark-bg p-2 rounded">
                <div className="font-bold">BB Width</div>
                <div>{isNaN(indicators.BollingerBandwidth) ? 'N/A' : indicators.BollingerBandwidth.toFixed(4)}</div>
            </div>
        </div>
    );
};


const SignalCard: React.FC<{ signal: Signal; onDelete?: () => void }> = ({ signal, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [marketSentiment, setMarketSentiment] = useState<string | null>(null);
    const [isLoadingSentiment, setIsLoadingSentiment] = useState(false);

    const isBuy = signal.type === SignalType.BUY;
    const isActive = signal.status === SignalStatus.ACTIVE;

    const priceDifference = signal.targetPrice - signal.entryPrice;
    const progress = isActive && priceDifference !== 0
      ? Math.min(100, Math.max(0, ((signal.currentPrice - signal.entryPrice) / priceDifference) * 100))
      : (signal.outcome === 'WIN' ? 100 : 0);

    const handleAiAnalysis = async () => {
        if (aiAnalysis) {
            setIsExpanded(!isExpanded);
            return;
        }
        setIsLoadingAi(true);
        if (!isExpanded) setIsExpanded(true);
        const analysis = await getAIPoweredAnalysis(signal);
        setAiAnalysis(analysis);
        setIsLoadingAi(false);
    };
    
    const handleSentiment = async () => {
        if (marketSentiment) {
            setIsExpanded(!isExpanded);
            return;
        }
        setIsLoadingSentiment(true);
        if (!isExpanded) setIsExpanded(true);
        const sentiment = await getMarketSentiment(signal.symbol);
        setMarketSentiment(sentiment);
        setIsLoadingSentiment(false);
    }

    const cardBg = isActive ? "bg-dark-card hover:bg-dark-border/40" : "bg-dark-card/50";
    let statusColor = 'border-dark-border';
    if (signal.status === SignalStatus.COMPLETED) {
        statusColor = signal.outcome === 'WIN' ? 'border-accent-green/50' : 'border-accent-red/50';
    } else if (signal.status === SignalStatus.EXPIRED) {
        statusColor = 'border-accent-yellow/50';
    }

    return (
        <div className={`border ${statusColor} rounded-lg p-3 transition-colors duration-200 ${cardBg} relative group`}>
            {/* Delete Button (Visible on Hover) */}
            {onDelete && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute top-2 right-2 text-dark-text-secondary hover:text-accent-red opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-dark-card/80 rounded"
                    title="Delete Signal"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            )}

            {/* Header */}
            <div className="flex justify-between items-start pr-6">
                <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-sm font-bold ${isBuy ? 'text-accent-green' : 'text-accent-red'}`}>
                            {signal.type} {signal.symbol}
                        </span>
                         {/* Enhanced Timeframe Badge */}
                        <span className="text-xs font-bold font-mono text-accent-blue bg-accent-blue/10 border border-accent-blue/30 px-1.5 py-0.5 rounded">
                            {signal.timeframe}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                         <StrengthIndicator strength={signal.strength} />
                        {signal.strategy && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-dark-border text-dark-text-secondary bg-dark-bg">
                                {signal.strategy.replace('_', ' ')}
                            </span>
                        )}
                        {signal.riskAnalysis && (
                             <span className={`text-[10px] px-1.5 py-0.5 rounded border border-dark-border ${
                                 signal.riskAnalysis.riskLevel === 'Conservative' ? 'text-accent-green bg-accent-green/10' :
                                 signal.riskAnalysis.riskLevel === 'Moderate' ? 'text-accent-yellow bg-accent-yellow/10' :
                                 'text-accent-red bg-accent-red/10'
                             }`}>
                                {signal.riskAnalysis.riskLevel} Risk
                             </span>
                        )}
                    </div>
                    <div className="text-xs text-dark-text-secondary mt-1">
                        {isActive ? `Opened ${timeSince(signal.createdAt)}` : 
                         signal.status === SignalStatus.EXPIRED ? `Expired ${timeSince(signal.completedAt!)}` :
                         `Closed at ${formatDateTime(signal.completedAt!)}`}
                    </div>
                </div>
                 <div className="text-right">
                    <div className="font-mono text-sm">{formatCurrency(isActive ? signal.currentPrice : signal.entryPrice, signal.symbol)}</div>
                    {!isActive && signal.pnl !== undefined ? (
                        <div className={`text-xs font-bold ${getPnlColor(signal.pnl)}`}>
                           {signal.outcome || signal.status}: {signal.pnl.toFixed(2)}%
                        </div>
                    ) : isActive && signal.pnl !== undefined ? (
                        <div className={`text-xs font-bold ${getPnlColor(signal.pnl)}`}>
                            PNL: {signal.pnl.toFixed(2)}%
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Progress Bar */}
            {isActive && (
                <div className="my-3">
                    <div className="h-2 w-full bg-dark-bg rounded-full overflow-hidden">
                        <div
                            className={`h-full ${isBuy ? 'bg-accent-green' : 'bg-accent-red'}`}
                            style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-dark-text-secondary mt-1">
                        <span>{formatCurrency(signal.stopLoss, signal.symbol)}</span>
                        <span>{formatCurrency(signal.targetPrice, signal.symbol)}</span>
                    </div>
                </div>
            )}

            {/* Footer and Actions */}
            <div className="flex justify-between items-center mt-2">
                 <div className="text-xs text-dark-text-secondary">
                    Confidence: {signal.confidence.toFixed(1)}%
                 </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleSentiment} disabled={isLoadingSentiment} className="text-xs bg-accent-yellow/20 text-accent-yellow px-2 py-1 rounded hover:bg-accent-yellow/40 disabled:opacity-50">
                        {isLoadingSentiment ? '...' : marketSentiment ? 'Sentiment' : 'Get Sentiment'}
                    </button>
                    <button onClick={handleAiAnalysis} disabled={isLoadingAi} className="text-xs bg-accent-blue/20 text-accent-blue px-2 py-1 rounded hover:bg-accent-blue/40 disabled:opacity-50">
                        {isLoadingAi ? '...' : aiAnalysis ? 'Analysis' : 'AI Analysis'}
                    </button>
                     <button onClick={() => setIsExpanded(!isExpanded)} className="text-dark-text-secondary hover:text-white p-1">
                        <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 mt-3 border-t border-dark-border space-y-3">
                             {/* Risk Management Block */}
                            {signal.riskAnalysis && (
                                <div className="bg-dark-bg/50 border border-dark-border p-2 rounded-lg">
                                    <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1">
                                        <svg className="w-3 h-3 text-accent-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        Risk Management
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-dark-text-secondary">RR Ratio</span>
                                            <span className={`font-bold ${signal.riskAnalysis.riskRewardRatio >= 2 ? 'text-accent-green' : 'text-accent-yellow'}`}>
                                                1:{signal.riskAnalysis.riskRewardRatio.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-dark-text-secondary">Stop Loss %</span>
                                            <span className="text-accent-red">-{signal.riskAnalysis.stopLossPercent}%</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-dark-text-secondary">Rec. Position</span>
                                            <span className="text-white">${signal.riskAnalysis.recommendedPositionSizeUsd.toLocaleString()}</span>
                                            <span className="text-[9px] text-dark-text-secondary leading-none mt-0.5">(Risking 1%)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {marketSentiment && (
                                <div>
                                    <h4 className="text-xs font-bold text-dark-text mb-1">Market Sentiment</h4>
                                    <p className="text-sm p-2 bg-dark-bg rounded">{marketSentiment}</p>
                                </div>
                            )}
                            {aiAnalysis && (
                                <div>
                                    <h4 className="text-xs font-bold text-dark-text mb-1">AI Analysis</h4>
                                    <p className="text-sm text-dark-text-secondary p-2 bg-dark-bg rounded">{aiAnalysis}</p>
                                </div>
                            )}
                            <div>
                                <h4 className="text-xs font-bold text-dark-text mb-1">Technical Confluence</h4>
                                <p className="text-xs text-dark-text-secondary mb-2">{signal.reasoning}</p>
                                <IndicatorDisplay indicators={signal.indicators} />
                            </div>
                            <div className="text-xs grid grid-cols-3 gap-2">
                                <div className="bg-dark-bg p-2 rounded">
                                    <div className="font-bold">Entry</div>
                                    <div>{formatCurrency(signal.entryPrice, signal.symbol)}</div>
                                </div>
                                <div className="bg-dark-bg p-2 rounded">
                                    <div className="font-bold text-accent-green">Target</div>
                                    <div>{formatCurrency(signal.targetPrice, signal.symbol)}</div>
                                </div>
                                <div className="bg-dark-bg p-2 rounded">
                                    <div className="font-bold text-accent-red">Stop Loss</div>
                                    <div>{formatCurrency(signal.stopLoss, signal.symbol)}</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SignalCard;