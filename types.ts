
import { SYMBOLS, TIMEFRAMES } from "./constants";

export type CryptoSymbol = typeof SYMBOLS[number];
export type Timeframe = typeof TIMEFRAMES[number];

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  WAIT = 'WAIT',
}

export enum SignalStrength {
  STRONG = 'STRONG',
  MEDIUM = 'MEDIUM',
  WEAK = 'WEAK',
  LEAN = 'LEAN',
}

export enum SignalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface TechnicalIndicators {
  RSI: number;
  prevRSI: number;
  MACD: { macd: number; signal: number; histogram: number; prevHistogram?: number };
  BollingerBands: { upper: number; middle: number; lower: number };
  EMA: number;
  EMA9: number;
  EMA21: number;
  EMA50: number;
  EMA200: number;
  prevEMA9?: number;
  prevEMA21?: number;
  SMA: number;
  Volume: number;
  VolumeSMA: number;
  Stochastic: { k: number; d: number };
  StochRSI: { k: number; d: number; prevK?: number; prevD?: number };
  BollingerBandwidth: number;
  ADX: number; // Trend Strength
  ATR: number; // Volatility
  MFI: number; // Money Flow Index
}

export interface RiskAnalysis {
  riskRewardRatio: number;
  stopLossPercent: number;
  recommendedPositionSizeUsd: number; // Based on a standard $10,000 account risking 1%
  riskPerTradeUsd: number;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
}

export interface Signal {
  id: string;
  symbol: CryptoSymbol;
  timeframe: Timeframe;
  type: SignalType;
  strength: SignalStrength;
  status: SignalStatus;
  confidence: number;
  entryPrice: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  createdAt: number;
  completedAt?: number;
  pnl?: number;
  outcome?: 'WIN' | 'LOSS';
  indicators: TechnicalIndicators;
  reasoning: string;
  strategy?: 'TREND_PULLBACK' | 'BREAKOUT_VOLATILITY' | 'MEAN_REVERSION' | 'MOMENTUM_MACD' | 'EMA_CROSS' | 'CANDLE_PATTERN';
  marketSentiment?: 'Bullish' | 'Bearish' | 'Neutral';
  riskAnalysis: RiskAnalysis;
}

export interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: number;
}

export interface PerformanceMetrics {
  winRate: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgPnlPerTrade: number;
}

export interface SystemHealth {
  connection: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  latency: number;
  healthScore: number;
  lastUpdate: number;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface BacktestResult {
  metrics: {
    totalTrades: number;
    wins: number;
    losses: number;
    winRate: number;
    netProfitPercent: number;
    profitFactor: number;
    maxDrawdown: number;
  };
  trades: Signal[];
  equityCurve: { time: number; value: number }[];
}
