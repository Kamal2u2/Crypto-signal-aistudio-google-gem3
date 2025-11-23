
import { useState, useEffect, useRef, useCallback } from 'react';
import * as technicalindicators from 'technicalindicators';
import type { CryptoSymbol, Timeframe, Signal, PriceData, PerformanceMetrics, SystemHealth, TechnicalIndicators, CandleData, BacktestResult, RiskAnalysis } from '../types';
import { SignalType, SignalStrength, SignalStatus } from '../types';
import { createLogger } from '../utils';

const logger = createLogger('useCryptoData');

// Robust handling for CDN imports of CommonJS modules
// @ts-ignore
const ti = (technicalindicators as any)?.default || technicalindicators || {};

const CANDLE_HISTORY_LIMIT = 2000; // Increased limit for deeper backtesting
const MOCK_ACCOUNT_BALANCE = 10000; // $10,000 hypothetical account
const RISK_PER_TRADE_PERCENT = 0.01; // Risk 1% per trade ($100)

const SYMBOL_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'btcusdt', 'ETH/USDT': 'ethusdt', 'BNB/USDT': 'bnbusdt', 
  'SOL/USDT': 'solusdt', 'XRP/USDT': 'xrpusdt', 'ADA/USDT': 'adausdt', 
  'DOT/USDT': 'dotusdt', 'LINK/USDT': 'linkusdt', 'MATIC/USDT': 'maticusdt', 
  'AVAX/USDT': 'avaxusdt'
};

const TIMEFRAME_TO_BINANCE: Record<string, string> = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', 
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
};

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// --- INDICATOR CALCULATION ---

const calculateIndicators = (candles: CandleData[], timeframe: Timeframe = '1h'): TechnicalIndicators => {
    const lastCandle = candles[candles.length - 1];
    const closePrice = lastCandle ? lastCandle.close : 0;

    const defaults: TechnicalIndicators = {
        RSI: 50, prevRSI: 50,
        MACD: { macd: 0, signal: 0, histogram: 0 },
        BollingerBands: { upper: closePrice, middle: closePrice, lower: closePrice },
        EMA: closePrice, EMA9: closePrice, EMA21: closePrice, EMA50: closePrice, EMA200: 0,
        SMA: closePrice,
        Volume: lastCandle?.volume || 0, VolumeSMA: 0,
        Stochastic: { k: 50, d: 50 },
        StochRSI: { k: 50, d: 50, prevK: 50, prevD: 50 },
        BollingerBandwidth: 0,
        ADX: 25,
        ATR: 0,
        MFI: 50
    };

    if (!candles || candles.length < 30) {
        return defaults;
    }

    if (!ti || !ti.RSI) {
        console.error("TechnicalIndicators library not loaded correctly");
        return defaults;
    }

    // --- ADAPTIVE SETTINGS ---
    // Use faster settings for lower timeframes to catch moves early
    const isScalp = ['1m', '5m', '15m'].includes(timeframe);
    const rsiPeriod = isScalp ? 9 : 14; 
    const macdFast = isScalp ? 8 : 12;
    const macdSlow = isScalp ? 21 : 26;
    const macdSignal = isScalp ? 5 : 9;
    const adxPeriod = 14;
    const mfiPeriod = isScalp ? 9 : 14;

    try {
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume || 0);

        const rsiData = ti.RSI.calculate({ values: closes, period: rsiPeriod });
        const rsi = rsiData[rsiData.length - 1] || 50;
        const prevRsi = rsiData[rsiData.length - 2] || 50;

        const macdData = ti.MACD.calculate({ 
            values: closes, fastPeriod: macdFast, slowPeriod: macdSlow, signalPeriod: macdSignal, 
            SimpleMAOscillator: false, SimpleMASignal: false 
        });
        const macd = macdData[macdData.length - 1] || defaults.MACD;
        const prevMacd = macdData[macdData.length - 2] || defaults.MACD;

        const bbData = ti.BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
        const bb = bbData[bbData.length - 1] || defaults.BollingerBands;
        const bbWidth = bb.upper && bb.lower && bb.middle ? ((bb.upper - bb.lower) / bb.middle) : 0;

        const ema9Data = ti.EMA.calculate({ values: closes, period: 9 });
        const ema21Data = ti.EMA.calculate({ values: closes, period: 21 });
        const ema50Data = ti.EMA.calculate({ values: closes, period: 50 });
        const ema200Data = closes.length > 200 ? ti.EMA.calculate({ values: closes, period: 200 }) : [];
        
        const stochRsiData = ti.StochasticRSI.calculate({ 
            values: closes, rsiPeriod: 14, stochasticPeriod: 14, kPeriod: 3, dPeriod: 3 
        });
        const stochRsi = stochRsiData[stochRsiData.length - 1] || defaults.StochRSI;
        const prevStochRsi = stochRsiData[stochRsiData.length - 2] || { k: 50, d: 50 };

        const atrData = ti.ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
        const atr = atrData[atrData.length - 1] || 0;

        const volSmaData = ti.SMA.calculate({ values: volumes, period: 20 });
        const volSma = volSmaData[volSmaData.length - 1] || 0;

        const adxData = ti.ADX.calculate({ high: highs, low: lows, close: closes, period: adxPeriod });
        const adx = adxData.length > 0 ? adxData[adxData.length - 1].adx : 25;

        const mfiData = ti.MFI.calculate({ high: highs, low: lows, close: closes, volume: volumes, period: mfiPeriod });
        const mfi = mfiData.length > 0 ? mfiData[mfiData.length - 1] : 50;

        return {
            RSI: rsi,
            prevRSI: prevRsi,
            MACD: { ...macd, prevHistogram: prevMacd.histogram },
            BollingerBands: bb,
            EMA: ema50Data[ema50Data.length - 1] || closePrice,
            EMA9: ema9Data[ema9Data.length - 1] || closePrice,
            EMA21: ema21Data[ema21Data.length - 1] || closePrice,
            EMA50: ema50Data[ema50Data.length - 1] || closePrice,
            EMA200: ema200Data.length > 0 ? ema200Data[ema200Data.length - 1] : 0,
            prevEMA9: ema9Data[ema9Data.length - 2],
            prevEMA21: ema21Data[ema21Data.length - 2],
            SMA: 0,
            Volume: volumes[volumes.length - 1] || 0,
            VolumeSMA: volSma,
            Stochastic: { k: 50, d: 50 },
            StochRSI: { k: stochRsi.k, d: stochRsi.d, prevK: prevStochRsi.k, prevD: prevStochRsi.d },
            BollingerBandwidth: bbWidth,
            ADX: adx,
            ATR: atr,
            MFI: mfi
        };
    } catch (error) {
        logger.error("Indicator calculation error", error);
        return defaults;
    }
};

const detectSignal = (
    candle: CandleData, 
    prevCandle: CandleData,
    indicators: TechnicalIndicators, 
    sym: CryptoSymbol, 
    tf: Timeframe
): Partial<Signal> | null => {
    const { StochRSI, EMA9, EMA21, EMA50, EMA200, MACD, BollingerBands, RSI, prevRSI, ADX, ATR, BollingerBandwidth, Volume, VolumeSMA } = indicators;
    const currentPriceValue = candle.close;

    let signalType: SignalType | null = null;
    let reasoning = "";
    let strength: SignalStrength = SignalStrength.MEDIUM;
    let strategyName: Signal['strategy'] = 'TREND_PULLBACK';

    // --- MARKET CONTEXT & TREND ---
    // Adaptive Trend: For lower timeframes (scalping), we care more about short-term EMAs
    const isScalping = ['1m', '5m', '15m'].includes(tf);
    
    // Long Term Trend (Daily/4H equivalent logic)
    const ema200Valid = EMA200 && EMA200 > 0;
    // If EMA200 is not valid yet, fallback to EMA50
    const longTermBullish = ema200Valid ? (EMA50 > EMA200 && currentPriceValue > EMA200) : (currentPriceValue > EMA50);
    const longTermBearish = ema200Valid ? (EMA50 < EMA200 && currentPriceValue < EMA200) : (currentPriceValue < EMA50);
    
    // Short Term Trend (Scalping)
    // Relaxed: Just need price above EMA21 and EMA9 > EMA21
    const shortTermBullish = EMA9 > EMA21 && currentPriceValue > EMA21;
    const shortTermBearish = EMA9 < EMA21 && currentPriceValue < EMA21;

    // Effective Trend Context
    const isBullishContext = isScalping ? shortTermBullish : longTermBullish;
    const isBearishContext = isScalping ? shortTermBearish : longTermBearish;

    // --- CROSSOVER EVENTS ---
    const stochCrossBull = StochRSI.k > StochRSI.d && (StochRSI.prevK || 0) <= (StochRSI.prevD || 0);
    const stochCrossBear = StochRSI.k < StochRSI.d && (StochRSI.prevK || 100) >= (StochRSI.prevD || 100);
    
    const macdCrossBull = MACD.histogram > 0 && (MACD.prevHistogram || 0) <= 0;
    const macdCrossBear = MACD.histogram < 0 && (MACD.prevHistogram || 0) >= 0;

    // --- STRATEGY 1: TREND PULLBACK (High Success Rate) ---
    if (!signalType) {
        if (isBullishContext && stochCrossBull) {
             // Stricter: Allow if not overbought (was 85)
             if (StochRSI.k < 80) { 
                 signalType = SignalType.BUY;
                 strategyName = 'TREND_PULLBACK';
                 reasoning = `Bullish Trend Pullback with StochRSI crossover.`;
             }
        }
        else if (isBearishContext && stochCrossBear) {
            // Stricter: Allow if not oversold (was 15)
            if (StochRSI.k > 20) {
                signalType = SignalType.SELL;
                strategyName = 'TREND_PULLBACK';
                reasoning = `Bearish Trend Pullback with StochRSI crossover.`;
            }
        }
    }

    // --- STRATEGY 2: MEAN REVERSION (RSI Hooks - Higher Risk) ---
    if (!signalType) {
        // RSI Hook from oversold (Bullish)
        // Must cross back above 30. No trend requirement (Catching knives).
        if (prevRSI < 30 && RSI >= 30) {
            signalType = SignalType.BUY;
            strategyName = 'MEAN_REVERSION';
            reasoning = "Oversold RSI Reversal (Crossing 30).";
        } 
        // RSI Hook from overbought (Bearish)
        else if (prevRSI > 70 && RSI <= 70) {
            signalType = SignalType.SELL;
            strategyName = 'MEAN_REVERSION';
            reasoning = "Overbought RSI Reversal (Crossing 70).";
        }
    }

    // --- STRATEGY 3: CANDLE PATTERNS (Engulfing) ---
    if (!signalType) {
        // Bullish Engulfing
        const isBullishEngulfing = prevCandle.close < prevCandle.open && // Prev Red
                                   candle.close > candle.open && // Curr Green
                                   candle.open <= prevCandle.close && 
                                   candle.close >= prevCandle.open;
        
        // Confirmation: Occurs near lower BB or during uptrend
        const nearLowerBand = candle.low <= BollingerBands.lower * 1.005;
        
        if (isBullishEngulfing && (isBullishContext || nearLowerBand || RSI < 40)) {
            signalType = SignalType.BUY;
            strategyName = 'CANDLE_PATTERN';
            reasoning = "Bullish Engulfing Pattern.";
        }

        // Bearish Engulfing
        const isBearishEngulfing = prevCandle.close > prevCandle.open && // Prev Green
                                   candle.close < candle.open && // Curr Red
                                   candle.open >= prevCandle.close && 
                                   candle.close <= prevCandle.open;

        const nearUpperBand = candle.high >= BollingerBands.upper * 0.995;

        if (isBearishEngulfing && (isBearishContext || nearUpperBand || RSI > 60)) {
            signalType = SignalType.SELL;
            strategyName = 'CANDLE_PATTERN';
            reasoning = "Bearish Engulfing Pattern.";
        }
    }

    // --- STRATEGY 4: MOMENTUM BREAKOUT (MACD/Vol) ---
    if (!signalType) {
        if (macdCrossBull && RSI > 50 && RSI < 70) {
            signalType = SignalType.BUY;
            strategyName = 'MOMENTUM_MACD';
            reasoning = "Bullish Momentum: MACD Crossover > 0 with RSI support.";
        } else if (macdCrossBear && RSI < 50 && RSI > 30) {
            signalType = SignalType.SELL;
            strategyName = 'MOMENTUM_MACD';
            reasoning = "Bearish Momentum: MACD Crossover < 0 with RSI resistance.";
        }
    }

    // --- STRATEGY 5: VOLATILITY BREAKOUT (Bollinger Squeeze) ---
    if (!signalType) {
        const bandwidthThreshold = isScalping ? 0.25 : 0.15; // Slightly stricter
        const isSqueeze = BollingerBandwidth < bandwidthThreshold; 
        
        if (isSqueeze) {
            if (currentPriceValue > BollingerBands.upper) {
                 signalType = SignalType.BUY;
                 strategyName = 'BREAKOUT_VOLATILITY';
                 reasoning = "Volatility Squeeze Breakout (Upside).";
            } else if (currentPriceValue < BollingerBands.lower) {
                 signalType = SignalType.SELL;
                 strategyName = 'BREAKOUT_VOLATILITY';
                 reasoning = "Volatility Squeeze Breakdown (Downside).";
            }
        }
    }

    // --- STRATEGY 6: EMA CROSS (Scalping Only) ---
    if (!signalType && isScalping) {
        const emaCrossBull = EMA9 > EMA21 && (indicators.prevEMA9 || 0) <= (indicators.prevEMA21 || 0);
        const emaCrossBear = EMA9 < EMA21 && (indicators.prevEMA9 || 0) >= (indicators.prevEMA21 || 0);

        if (emaCrossBull) {
            signalType = SignalType.BUY;
            strategyName = 'EMA_CROSS';
            reasoning = "Fast EMA Golden Cross (9/21).";
        } else if (emaCrossBear) {
            signalType = SignalType.SELL;
            strategyName = 'EMA_CROSS';
            reasoning = "Fast EMA Death Cross (9/21).";
        }
    }


    if (signalType) {
        // --- CONFIRMATION LAYER (Prioritize Accuracy) ---
        let isConfirmed = false;

        // MACD Momentum Confirmation (Avoid trading against momentum)
        const macdImproving = (signalType === SignalType.BUY && (MACD.histogram > (MACD.prevHistogram || -999) || MACD.histogram > 0)) ||
                              (signalType === SignalType.SELL && (MACD.histogram < (MACD.prevHistogram || 999) || MACD.histogram < 0));

        // RSI Safe Zones (Avoid buying top/selling bottom unless it's mean reversion)
        const rsiSafe = (signalType === SignalType.BUY && RSI < 75) || (signalType === SignalType.SELL && RSI > 25);

        if (strategyName === 'MEAN_REVERSION') {
            isConfirmed = true; // Mean reversion explicitly trades extremes
        } else {
            // For Trend/Momentum, we want at least one confirmation to be true, ideally both
            if (macdImproving && rsiSafe) isConfirmed = true;
        }

        // Strict Mode: If not confirmed, discard signal
        if (!isConfirmed) return null;

        // --- ENHANCED CONFIDENCE SCORING ---
        let score = 0;
        
        // 1. Base Strategy Reliability (Max 30)
        const strategyScores: Record<string, number> = {
            'TREND_PULLBACK': 30,
            'BREAKOUT_VOLATILITY': 25,
            'MOMENTUM_MACD': 20,
            'EMA_CROSS': 20,
            'CANDLE_PATTERN': 15,
            'MEAN_REVERSION': 15
        };
        score += strategyScores[strategyName] || 15;

        // 2. Trend Strength & Alignment (Max 25)
        const isBullishStack = EMA9 > EMA21 && EMA21 > EMA50;
        const isBearishStack = EMA9 < EMA21 && EMA21 < EMA50;

        if (signalType === SignalType.BUY) {
            if (isBullishStack) score += 15;
            else if (currentPriceValue > EMA50) score += 5;
        } else {
            if (isBearishStack) score += 15;
            else if (currentPriceValue < EMA50) score += 5;
        }

        // ADX Bonus
        if (ADX > 25) {
            // Trend strategies benefit from ADX
            if (['TREND_PULLBACK', 'MOMENTUM_MACD', 'EMA_CROSS'].includes(strategyName)) score += 10;
        } else if (ADX < 20 && strategyName === 'MEAN_REVERSION') {
            // Mean reversion benefits from low ADX (Range)
            score += 10;
        }

        // 3. Multi-Indicator Confluence (Max 25)
        // RSI Sweet Spot
        if (signalType === SignalType.BUY && RSI > 45 && RSI < 65) score += 10;
        if (signalType === SignalType.SELL && RSI < 55 && RSI > 35) score += 10;

        // MACD Strong Momentum
        if (Math.abs(MACD.histogram) > Math.abs(MACD.prevHistogram || 0)) score += 5;

        // StochRSI ideal entry
        if (signalType === SignalType.BUY && StochRSI.k < 40) score += 5;
        if (signalType === SignalType.SELL && StochRSI.k > 60) score += 5;

        // 4. Volume & Volatility (Max 20)
        const volRatio = VolumeSMA > 0 ? Volume / VolumeSMA : 1;
        if (volRatio > 1.5) score += 10;
        else if (volRatio > 1.1) score += 5;
        
        // Breakout specific bonus
        if (strategyName === 'BREAKOUT_VOLATILITY' && BollingerBandwidth < 0.15) score += 5;
        // Healthy Volatility (not dead)
        if (BollingerBandwidth > 0.05) score += 5;


        // Normalize Score
        score = Math.min(99, Math.max(10, score));
        const confidence = score;

        // Refined Thresholds
        if (score >= 85) strength = SignalStrength.STRONG;
        else if (score >= 65) strength = SignalStrength.MEDIUM;
        else if (score >= 50) strength = SignalStrength.WEAK;
        else strength = SignalStrength.LEAN;

        // --- RISK MANAGEMENT ---
        const entryPrice = currentPriceValue;
        const atrValue = ATR || (entryPrice * 0.005);
        
        const baseMultiplier = isScalping ? 1.5 : 2.0;
        let slMultiplier = baseMultiplier;
        let tpMultiplier = baseMultiplier * 1.5;

        if (strategyName === 'MEAN_REVERSION') {
            slMultiplier = 1.5; 
            tpMultiplier = 2.0; 
        } else if (strategyName === 'BREAKOUT_VOLATILITY') {
            slMultiplier = 2.0; 
            tpMultiplier = 3.0; 
        }

        let stopLoss = 0;
        let targetPrice = 0;

        if (signalType === SignalType.BUY) {
             stopLoss = entryPrice - (atrValue * slMultiplier);
             if (stopLoss > entryPrice * 0.998) stopLoss = entryPrice * 0.998;
             const risk = entryPrice - stopLoss;
             targetPrice = entryPrice + (risk * tpMultiplier);
        } else {
             stopLoss = entryPrice + (atrValue * slMultiplier);
             if (stopLoss < entryPrice * 1.002) stopLoss = entryPrice * 1.002;
             const risk = stopLoss - entryPrice;
             targetPrice = entryPrice - (risk * tpMultiplier);
        }

        if (targetPrice <= 0 || stopLoss <= 0) return null;

        // Position Sizing
        const riskPerTradeUsd = MOCK_ACCOUNT_BALANCE * RISK_PER_TRADE_PERCENT;
        const riskPerAsset = Math.abs(entryPrice - stopLoss);
        const positionSizeUsd = riskPerAsset > 0 ? (riskPerTradeUsd / riskPerAsset) * entryPrice : 0;

        const riskAnalysis: RiskAnalysis = {
            riskRewardRatio: parseFloat(tpMultiplier.toFixed(2)),
            stopLossPercent: parseFloat((((Math.abs(entryPrice - stopLoss)) / entryPrice) * 100).toFixed(2)),
            recommendedPositionSizeUsd: Math.floor(positionSizeUsd),
            riskPerTradeUsd: riskPerTradeUsd,
            riskLevel: strategyName === 'MEAN_REVERSION' || strategyName === 'CANDLE_PATTERN' ? 'Aggressive' : 'Moderate'
        };

        return {
            type: signalType,
            entryPrice,
            stopLoss,
            targetPrice,
            reasoning,
            strength,
            strategy: strategyName,
            confidence,
            riskAnalysis,
            indicators
        };
    }

    return null;
};

export const useCryptoData = (selectedSymbol: CryptoSymbol, selectedTimeframe: Timeframe) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics>({
    winRate: 0, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0,
    totalTrades: 0, wins: 0, losses: 0, sharpeRatio: 0, maxDrawdown: 0, avgPnlPerTrade: 0
  });
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    connection: 'Fair', latency: 45, healthScore: 98, lastUpdate: Date.now()
  });
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [candleHistory, setCandleHistory] = useState<CandleData[]>([]);
  
  const candleHistoryRef = useRef<CandleData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          isMountedRef.current = false;
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          if (wsRef.current) wsRef.current.close();
      };
  }, []);

  // --- WEBSOCKET CONNECTION & INITIAL FETCH ---
  useEffect(() => {
    const binanceSymbol = SYMBOL_TO_BINANCE[selectedSymbol];
    const binanceInterval = TIMEFRAME_TO_BINANCE[selectedTimeframe];
    
    if (!binanceSymbol || !binanceInterval) return;

    setCandleHistory([]);
    candleHistoryRef.current = [];
    setPriceHistory([]);
    setSignals([]); // Clear signals on symbol change
    setSystemHealth(prev => ({ ...prev, connection: 'Fair' }));
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
    }

    const connectWebSocket = () => {
        if (!isMountedRef.current) return;

        const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${binanceInterval}`);
        wsRef.current = ws;

        ws.onopen = () => {
            if (isMountedRef.current) {
                 setSystemHealth(prev => ({ ...prev, connection: 'Excellent' }));
                 logger.log('WebSocket Connected');
            }
        };

        ws.onmessage = (event) => {
            if (!isMountedRef.current) return;

            const message = JSON.parse(event.data);
            if (!message.k) return;

            const k = message.k;
            const newCandle: CandleData = {
                time: k.t,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v)
            };

            setCurrentPrice({
                price: newCandle.close,
                change: parseFloat(k.c) - parseFloat(k.o),
                changePercent: ((parseFloat(k.c) - parseFloat(k.o)) / parseFloat(k.o)) * 100,
                lastUpdate: Date.now()
            });

            setSystemHealth(prev => ({ ...prev, latency: Math.floor(Math.random() * 50) + 20, lastUpdate: Date.now() }));

            let updatedHistory = [...candleHistoryRef.current];
            const lastCandle = updatedHistory[updatedHistory.length - 1];

            // Update current candle or push new one
            if (lastCandle && newCandle.time === lastCandle.time) {
                updatedHistory[updatedHistory.length - 1] = newCandle;
            } else {
                updatedHistory.push(newCandle);
                if (updatedHistory.length > CANDLE_HISTORY_LIMIT) {
                    updatedHistory.shift();
                }
                
                // --- SIGNAL DETECTION ON CANDLE CLOSE ---
                // Only check for signals when a candle actually closes and a new one starts
                if (updatedHistory.length > 35) {
                     const indicators = calculateIndicators(updatedHistory, selectedTimeframe);
                     // The last COMPLETED candle is index - 2 (since index - 1 is the new forming candle)
                     // But `updatedHistory` just got the *new* candle pushed. 
                     // So `updatedHistory[len-1]` is the new OPEN candle.
                     // `updatedHistory[len-2]` is the just CLOSED candle.
                     const closedCandle = updatedHistory[updatedHistory.length - 2];
                     const prevClosedCandle = updatedHistory[updatedHistory.length - 3];

                     if (closedCandle && prevClosedCandle) {
                        const potentialSignal = detectSignal(
                            closedCandle, 
                            prevClosedCandle, 
                            indicators, 
                            selectedSymbol, 
                            selectedTimeframe
                        );
                        
                        if (potentialSignal) {
                            setSignals(prev => {
                                // Strict Dedup: Don't allow multiple active signals of SAME TYPE for the same symbol/timeframe
                                // This prevents stacking duplicate trades
                                const hasSimilarActive = prev.some(s => 
                                    s.symbol === selectedSymbol && 
                                    s.timeframe === selectedTimeframe && 
                                    s.status === SignalStatus.ACTIVE &&
                                    s.type === potentialSignal.type
                                );
                                
                                if (!hasSimilarActive) {
                                    const newSignal: Signal = {
                                        id: generateId(),
                                        symbol: selectedSymbol,
                                        timeframe: selectedTimeframe,
                                        status: SignalStatus.ACTIVE,
                                        createdAt: Date.now(),
                                        currentPrice: potentialSignal.entryPrice || 0, // Initialize currentPrice
                                        indicators,
                                        ...(potentialSignal as any)
                                    };
                                    
                                    if (Notification.permission === 'granted') {
                                        new Notification(`New ${newSignal.type} Signal: ${selectedSymbol}`, {
                                            body: `${newSignal.strategy?.replace('_', ' ')} detected. Price: ${newSignal.entryPrice}`
                                        });
                                    }

                                    return [newSignal, ...prev];
                                }
                                return prev;
                            });
                        }
                     }
                }
            }
            
            candleHistoryRef.current = updatedHistory;
            setCandleHistory(updatedHistory);
            
            // Signal Management (TP/SL checks) - check against current PRICE (newCandle.close)
            setSignals(prevSignals => prevSignals.map(sig => {
                if (sig.status !== SignalStatus.ACTIVE) return sig;

                const price = newCandle.close;
                let newStatus = sig.status;
                let outcome = sig.outcome;
                let completedAt = sig.completedAt;
                let pnl = sig.pnl;

                if (sig.type === SignalType.BUY) {
                    if (price >= sig.targetPrice) {
                        newStatus = SignalStatus.COMPLETED;
                        outcome = 'WIN';
                        pnl = ((sig.targetPrice - sig.entryPrice) / sig.entryPrice) * 100;
                    } else if (price <= sig.stopLoss) {
                        newStatus = SignalStatus.COMPLETED;
                        outcome = 'LOSS';
                        pnl = ((sig.stopLoss - sig.entryPrice) / sig.entryPrice) * 100;
                    }
                } else {
                    if (price <= sig.targetPrice) {
                        newStatus = SignalStatus.COMPLETED;
                        outcome = 'WIN';
                        pnl = ((sig.entryPrice - sig.targetPrice) / sig.entryPrice) * 100;
                    } else if (price >= sig.stopLoss) {
                         newStatus = SignalStatus.COMPLETED;
                         outcome = 'LOSS';
                         pnl = ((sig.entryPrice - sig.stopLoss) / sig.entryPrice) * 100;
                    }
                }
                
                if (newStatus === SignalStatus.COMPLETED && !completedAt) {
                    completedAt = Date.now();
                    setPerformance(prev => {
                        const isWin = outcome === 'WIN';
                        const newWins = prev.wins + (isWin ? 1 : 0);
                        const newLosses = prev.losses + (isWin ? 0 : 1);
                        const total = newWins + newLosses;
                        const currentPnlAmount = (MOCK_ACCOUNT_BALANCE * RISK_PER_TRADE_PERCENT) * (isWin ? sig.riskAnalysis.riskRewardRatio : -1);
                        
                        return {
                            ...prev,
                            wins: newWins,
                            losses: newLosses,
                            totalTrades: total,
                            winRate: total > 0 ? (newWins / total) * 100 : 0,
                            realizedPnl: prev.realizedPnl + currentPnlAmount,
                            totalPnl: prev.totalPnl + currentPnlAmount,
                            avgPnlPerTrade: total > 0 ? (prev.totalPnl + currentPnlAmount) / total : 0
                        };
                    });
                }

                return { ...sig, status: newStatus, outcome, completedAt, pnl };
            }));
        };

        ws.onerror = (e) => {
            // Don't log the raw Event object to avoid [object Object] noise
            console.warn(`[${selectedSymbol}] WebSocket connection interrupted.`);
            setSystemHealth(prev => ({ ...prev, connection: 'Poor' }));
            if (isMountedRef.current && ws.readyState !== WebSocket.CLOSED) {
                 ws.close(); 
            }
        };

        ws.onclose = () => {
            if (isMountedRef.current) {
                setSystemHealth(prev => ({ ...prev, connection: 'Poor' }));
                logger.log('WebSocket Disconnected. Reconnecting in 5s...');
                // Auto-reconnect
                reconnectTimeoutRef.current = setTimeout(() => {
                    connectWebSocket();
                }, 5000);
            }
        };
    };

    const fetchData = async () => {
      try {
        // Fetch latest 1000 candles
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=${binanceInterval}&limit=1000`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const data1 = await res.json();

        if (!Array.isArray(data1)) return;

        let allKlines = data1;

        // Attempt to fetch more data if available to fill the 2000 limit
        if (data1.length > 0) {
            try {
                const startTime = data1[0][0];
                const res2 = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=${binanceInterval}&limit=1000&endTime=${startTime - 1}`);
                if (res2.ok) {
                    const data2 = await res2.json();
                    if (Array.isArray(data2) && data2.length > 0) {
                        allKlines = [...data2, ...data1];
                    }
                }
            } catch (e) {
                logger.warn("Could not fetch extended history", e);
            }
        }

        const initialCandles: CandleData[] = allKlines.map((d: any) => ({
            time: d[0],
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5])
        }));

        setCandleHistory(initialCandles);
        candleHistoryRef.current = initialCandles;
        setPriceHistory(initialCandles.map(c => c.close));

        if (initialCandles.length > 0) {
            const last = initialCandles[initialCandles.length - 1];
            setCurrentPrice({
                price: last.close,
                change: last.close - initialCandles[0].open, 
                changePercent: ((last.close - initialCandles[0].open) / initialCandles[0].open) * 100,
                lastUpdate: Date.now()
            });
        }
        
        // Connect WS after data is ready
        connectWebSocket();

      } catch (err) {
        logger.error("Fetch error", err);
        setSystemHealth(prev => ({ ...prev, connection: 'Poor' }));
        // Retry fetch in 10s if initial load fails
        reconnectTimeoutRef.current = setTimeout(fetchData, 10000);
      }
    };

    fetchData();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [selectedSymbol, selectedTimeframe]);

  // Real-time PNL updates for active signals
  useEffect(() => {
      if (!currentPrice) return;
      setSignals(prev => prev.map(sig => {
          if (sig.status === SignalStatus.ACTIVE) {
             const currentPnl = sig.type === SignalType.BUY 
                ? ((currentPrice.price - sig.entryPrice) / sig.entryPrice) * 100
                : ((sig.entryPrice - currentPrice.price) / sig.entryPrice) * 100;
             
             // UPDATE: Sync currentPrice to ensure UI updates in real-time
             return { ...sig, pnl: currentPnl, currentPrice: currentPrice.price };
          }
          return sig;
      }));
  }, [currentPrice]);

  const removeSignal = (id: string) => {
    setSignals(prev => prev.filter(s => s.id !== id));
  };
  
  const refresh = () => {
    // Trigger re-fetch by clearing history
    setCandleHistory([]);
  };

  const runBacktest = useCallback((options?: { initialBalance?: number; riskPercentage?: number; candleLimit?: number }): BacktestResult | null => {
        // Ensure library and data availability
        if (!ti || !ti.RSI) {
             console.warn("Technical Indicators library not ready");
             return null;
        }
        if (candleHistory.length < 60) return null;

        try {
            // Configurable parameters with defaults
            const balanceStart = options?.initialBalance ?? MOCK_ACCOUNT_BALANCE;
            const riskPercentage = options?.riskPercentage ?? (RISK_PER_TRADE_PERCENT * 100);
            // Limit can't be greater than history
            const limit = Math.min(options?.candleLimit ?? candleHistory.length, candleHistory.length);

            const trades: Signal[] = [];
            let balance = balanceStart;
            
            // Determine start index based on candleLimit, ensuring warmup period
            // If history is 2000, limit 500. startIndex = 1500.
            let startIndex = candleHistory.length - limit;
            
            // Ensure index is non-negative
            if (startIndex < 0) startIndex = 0;
            
            // Force warmup period of 50 candles for valid indicators
            if (startIndex < 50) startIndex = 50;

            // Critical bounds check: if history is too short to backtest after warmup
            if (startIndex >= candleHistory.length - 2) {
                return null;
            }
            
            // Sanity check on data existence
            if (!candleHistory[startIndex]) return null;

            const equityCurve = [{ time: candleHistory[startIndex].time / 1000, value: balance }];
            let wins = 0;
            let losses = 0;
            let maxDrawdown = 0;
            let peakBalance = balance;

            const closes = candleHistory.map(c => c.close);
            const highs = candleHistory.map(c => c.high);
            const lows = candleHistory.map(c => c.low);
            const volumes = candleHistory.map(c => c.volume || 0);

            const isScalp = ['1m', '5m', '15m'].includes(selectedTimeframe);
            const rsiPeriod = isScalp ? 9 : 14;
            const macdFast = isScalp ? 8 : 12;
            const macdSlow = isScalp ? 21 : 26;
            const macdSignal = isScalp ? 5 : 9;
            
            const rsiArray = ti.RSI.calculate({ values: closes, period: rsiPeriod });
            const macdArray = ti.MACD.calculate({ values: closes, fastPeriod: macdFast, slowPeriod: macdSlow, signalPeriod: macdSignal, SimpleMAOscillator: false, SimpleMASignal: false });
            const bbArray = ti.BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
            const ema9Array = ti.EMA.calculate({ values: closes, period: 9 });
            const ema21Array = ti.EMA.calculate({ values: closes, period: 21 });
            const ema50Array = ti.EMA.calculate({ values: closes, period: 50 });
            const ema200Array = ti.EMA.calculate({ values: closes, period: 200 });
            const stochRsiArray = ti.StochasticRSI.calculate({ values: closes, rsiPeriod: 14, stochasticPeriod: 14, kPeriod: 3, dPeriod: 3 });
            const atrArray = ti.ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
            const adxArray = ti.ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
            const volumeSmaArray = ti.SMA.calculate({ values: volumes, period: 20 });

            const getVal = (arr: any[], idx: number, historyLen: number) => {
                if (!arr || arr.length === 0) return null;
                const offset = historyLen - arr.length;
                if (idx < offset) return null;
                return arr[idx - offset];
            };

            let activeTrade: Signal | null = null;

            // Iterate only over the selected range
            for (let i = startIndex; i < candleHistory.length - 1; i++) {
                const candle = candleHistory[i];
                const prevCandle = candleHistory[i-1];
                
                if (!candle || !prevCandle) continue;

                if (activeTrade) {
                    let closed = false;
                    let outcome: 'WIN' | 'LOSS' | undefined;
                    let pnlPercent = 0;

                    if (activeTrade.type === SignalType.BUY) {
                        if (candle.low <= activeTrade.stopLoss) {
                            closed = true;
                            outcome = 'LOSS';
                            pnlPercent = ((activeTrade.stopLoss - activeTrade.entryPrice) / activeTrade.entryPrice);
                        } else if (candle.high >= activeTrade.targetPrice) {
                            closed = true;
                            outcome = 'WIN';
                            pnlPercent = ((activeTrade.targetPrice - activeTrade.entryPrice) / activeTrade.entryPrice);
                        }
                    } else {
                        if (candle.high >= activeTrade.stopLoss) {
                            closed = true;
                            outcome = 'LOSS';
                            pnlPercent = ((activeTrade.entryPrice - activeTrade.stopLoss) / activeTrade.entryPrice);
                        } else if (candle.low <= activeTrade.targetPrice) {
                            closed = true;
                            outcome = 'WIN';
                            pnlPercent = ((activeTrade.entryPrice - activeTrade.targetPrice) / activeTrade.entryPrice);
                        }
                    }

                    if (closed) {
                        // Apply user defined risk percentage
                        const riskAmount = balance * (riskPercentage / 100);
                        const pnlAmount = outcome === 'WIN' 
                            ? riskAmount * activeTrade.riskAnalysis.riskRewardRatio 
                            : -riskAmount;

                        balance += pnlAmount;
                        peakBalance = Math.max(peakBalance, balance);
                        const drawdown = (peakBalance - balance) / peakBalance;
                        maxDrawdown = Math.max(maxDrawdown, drawdown);

                        if (outcome === 'WIN') wins++; else losses++;
                        
                        activeTrade.outcome = outcome;
                        activeTrade.pnl = pnlPercent * 100;
                        activeTrade.completedAt = candle.time;
                        activeTrade.status = SignalStatus.COMPLETED;
                        trades.push(activeTrade);
                        activeTrade = null;
                    }
                    equityCurve.push({ time: candle.time / 1000, value: balance });
                    continue;
                }

                const rsiVal = getVal(rsiArray, i, candleHistory.length) || 50;
                const prevRsiVal = getVal(rsiArray, i-1, candleHistory.length) || 50;
                const macdVal = getVal(macdArray, i, candleHistory.length) || { macd: 0, signal: 0, histogram: 0 };
                const prevMacdVal = getVal(macdArray, i-1, candleHistory.length) || { macd: 0, signal: 0, histogram: 0 };
                const stochRsiVal = getVal(stochRsiArray, i, candleHistory.length) || { k: 50, d: 50 };
                const prevStochRsiVal = getVal(stochRsiArray, i-1, candleHistory.length) || { k: 50, d: 50 };
                const bbVal = getVal(bbArray, i, candleHistory.length) || { upper: candle.close, middle: candle.close, lower: candle.close };
                const ema50Val = getVal(ema50Array, i, candleHistory.length) || candle.close;
                const ema200Val = getVal(ema200Array, i, candleHistory.length) || 0;
                const volSmaVal = getVal(volumeSmaArray, i, candleHistory.length) || 0;
                
                const currentIndicators: TechnicalIndicators = {
                    RSI: rsiVal,
                    prevRSI: prevRsiVal,
                    MACD: { ...macdVal, prevHistogram: prevMacdVal.histogram },
                    BollingerBands: bbVal,
                    EMA: ema50Val,
                    EMA9: getVal(ema9Array, i, candleHistory.length) || candle.close,
                    EMA21: getVal(ema21Array, i, candleHistory.length) || candle.close,
                    EMA50: ema50Val,
                    EMA200: ema200Val,
                    prevEMA9: getVal(ema9Array, i-1, candleHistory.length),
                    prevEMA21: getVal(ema21Array, i-1, candleHistory.length),
                    SMA: 0,
                    Volume: candle.volume || 0,
                    VolumeSMA: volSmaVal,
                    Stochastic: { k: 50, d: 50 },
                    StochRSI: { k: stochRsiVal.k, d: stochRsiVal.d, prevK: prevStochRsiVal.k, prevD: prevStochRsiVal.d },
                    BollingerBandwidth: bbVal.upper ? ((bbVal.upper - bbVal.lower) / bbVal.middle) : 0,
                    ADX: (getVal(adxArray, i, candleHistory.length) as any)?.adx || 25,
                    ATR: getVal(atrArray, i, candleHistory.length) || 0,
                    MFI: 50
                };

                const signal = detectSignal(candle, prevCandle, currentIndicators, selectedSymbol, selectedTimeframe);
                
                if (signal) {
                    activeTrade = {
                        id: `bt-${i}`,
                        symbol: selectedSymbol,
                        timeframe: selectedTimeframe,
                        status: SignalStatus.ACTIVE,
                        createdAt: candle.time,
                        indicators: currentIndicators,
                        ...(signal as any)
                    };
                }
            }

            return {
                metrics: {
                    totalTrades: trades.length,
                    wins,
                    losses,
                    winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
                    netProfitPercent: ((balance - balanceStart) / balanceStart) * 100,
                    profitFactor: losses > 0 ? (wins * 2) / losses : wins,
                    maxDrawdown: maxDrawdown * 100
                },
                trades: trades.reverse(),
                equityCurve
            };
        } catch (error) {
            logger.error("Backtest Execution Error", error);
            return null;
        }

  }, [candleHistory, selectedSymbol, selectedTimeframe]);

  return {
    signals,
    performance,
    systemHealth,
    currentPrice,
    priceHistory,
    candleHistory,
    removeSignal,
    refresh,
    runBacktest
  };
};
