
import { GoogleGenAI, Type, Chat } from "@google/genai";
import type { CryptoSymbol, Signal, Timeframe } from "../types";
import { createLogger } from "../utils";

const logger = createLogger('geminiService');

const getGenAI = () => {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        throw new Error("API_KEY is not available. Please ensure it is correctly configured in the environment.");
    }
    return new GoogleGenAI({ apiKey });
}

export const getAIPoweredAnalysis = async (signal: Signal): Promise<string> => {
  try {
    const ai = getGenAI();
    
    const prompt = `
      You are a world-class cryptocurrency trading analyst.
      Provide a concise, expert analysis for the following trading signal.
      Focus on potential confirmations, risks, and a brief market context.
      Do not give financial advice. Keep the analysis to 2-3 short sentences.

      **Signal Details:**
      - **Pair:** ${signal.symbol}
      - **Timeframe:** ${signal.timeframe}
      - **Direction:** ${signal.type}
      - **Strength:** ${signal.strength}
      - **Confidence:** ${signal.confidence.toFixed(0)}%
      - **Entry Price:** ${signal.entryPrice}
      - **Target Price:** ${signal.targetPrice}
      - **Stop Loss:** ${signal.stopLoss}
      
      **Key Indicators at Signal Generation:**
      - **RSI:** ${signal.indicators.RSI.toFixed(2)}
      - **Stochastic RSI:** K:${signal.indicators.StochRSI.k.toFixed(2)} D:${signal.indicators.StochRSI.d.toFixed(2)}
      - **MACD Histogram:** ${signal.indicators.MACD.histogram.toFixed(4)}
      - **Bollinger Bandwidth:** ${signal.indicators.BollingerBandwidth.toFixed(4)}
      - **Position vs Bollinger Bands:** Price is near the ${signal.currentPrice > signal.indicators.BollingerBands.middle ? 'upper' : 'lower'} band.
      
      **Reasoning Provided:** ${signal.reasoning}

      **Your Analysis:**
    `;

    logger.log('Sending AI analysis prompt:', { model: 'gemini-2.5-flash', contents: prompt });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    logger.log('Received AI analysis response:', { text: response.text });
    return response.text;
  } catch (error) {
    logger.error("Error fetching AI analysis:", error);
    return "Failed to fetch AI analysis. Please try again later.";
  }
};

export const getMarketSentiment = async (symbol: CryptoSymbol): Promise<string> => {
  try {
    const ai = getGenAI();

    const prompt = `
      You are a market analyst specializing in cryptocurrency sentiment.
      Provide a very concise, one-word sentiment (Bullish, Bearish, or Neutral) for ${symbol} right now.
      Do not add any additional explanation or phrases, just the sentiment word.
      Sentiment for ${symbol}:
    `;

    logger.log('Sending AI sentiment prompt:', { model: 'gemini-2.5-flash', contents: prompt });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const sentiment = response.text.trim();
    logger.log('Received AI sentiment response:', { text: sentiment });
    if (['Bullish', 'Bearish', 'Neutral'].includes(sentiment)) {
      return sentiment;
    } else {
      logger.warn(`Unexpected sentiment response for ${symbol}: "${sentiment}". Defaulting to Neutral.`);
      return 'Neutral'; 
    }
  } catch (error) {
    logger.error(`Error fetching market sentiment for ${symbol}:`, error);
    return "Neutral (API Error)"; 
  }
};

export const createChat = (symbol: CryptoSymbol, timeframe: Timeframe): Chat => {
  const ai = getGenAI();
  const systemInstruction = `You are "Signal Pro AI", an expert crypto trading analyst. You are helpful, concise, and you never give direct financial advice. Your knowledge is focused on the user's current context: the ${symbol} trading pair on the ${timeframe} timeframe. When asked about market conditions or news, be factual and cite potential trends. When asked about trading concepts, explain them simply. Do not recommend buying or selling. Respond using markdown for formatting when appropriate.`;
  
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });
  return chat;
};
