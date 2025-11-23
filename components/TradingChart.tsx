
import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
  IPriceLine,
  HistogramData,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';
import type { CryptoSymbol, Timeframe, CandleData, Signal } from '../types';

interface TradingChartProps {
  symbol: CryptoSymbol;
  timeframe: Timeframe;
  candleHistory: CandleData[];
  activeSignals: Signal[];
}

const TradingChart: React.FC<TradingChartProps> = ({ symbol, timeframe, candleHistory, activeSignals }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  
  const prevSymbolRef = useRef<string>(symbol);

  const processData = (data: CandleData[]) => {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const unique = sorted.filter((item, index, self) =>
      index === self.findIndex((t) => t.time === item.time)
    );
    return unique.map(c => ({
      time: (Math.floor(c.time / 1000)) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  };

  const processVolume = (data: CandleData[]) => {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const unique = sorted.filter((item, index, self) =>
      index === self.findIndex((t) => t.time === item.time)
    );
    return unique.map(c => ({
      time: (Math.floor(c.time / 1000)) as UTCTimestamp,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(63, 185, 80, 0.5)' : 'rgba(248, 81, 73, 0.5)',
    }));
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { type: ColorType.Solid, color: '#161B22' }, textColor: '#C9D1D9' },
      grid: { vertLines: { color: '#30363D' }, horzLines: { color: '#30363D' } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#30363D', timeVisible: true },
      rightPriceScale: { borderColor: '#30363D' },
    });
    chartRef.current = chart;

    // Candle Series
    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#3FB950', downColor: '#F85149',
      borderDownColor: '#F85149', borderUpColor: '#3FB950',
      wickDownColor: '#F85149', wickUpColor: '#3FB950',
    });

    // Volume Series
    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale',
    });
    
    chart.priceScale('volume_scale').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
    });

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight
        });
      }
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;

    if (!candleSeries || !volumeSeries || !chart) return;
    
    try {
        const formattedCandleData = processData(candleHistory);
        const formattedVolumeData = processVolume(candleHistory);

        candleSeries.setData(formattedCandleData);
        volumeSeries.setData(formattedVolumeData);

        if (formattedCandleData.length > 0 && prevSymbolRef.current !== symbol) {
            chart.timeScale().fitContent();
            prevSymbolRef.current = symbol;
        }
    } catch (err) {
        console.error("Error updating chart data:", err);
    }
  }, [candleHistory, symbol]); 

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    if (!candleSeries) return;

    try {
        priceLinesRef.current.forEach(line => {
            try {
                candleSeries.removePriceLine(line);
            } catch (e) {
                // ignore
            }
        });
        priceLinesRef.current = [];

        const newPriceLines = activeSignals
        .filter(signal => signal.symbol === symbol)
        .flatMap(signal => [
            candleSeries.createPriceLine({
            price: signal.targetPrice, color: '#3FB950', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'TARGET',
            }),
            candleSeries.createPriceLine({
            price: signal.entryPrice, color: '#58A6FF', lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'ENTRY',
            }),
            candleSeries.createPriceLine({
            price: signal.stopLoss, color: '#F85149', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'STOP',
            }),
        ]);

        priceLinesRef.current = newPriceLines;
    } catch (error) {
        console.error("Error updating price lines:", error);
    }
  }, [activeSignals, symbol]);

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 text-white flex items-center justify-between flex-shrink-0">
        <span>{symbol} - {timeframe} Chart</span>
      </h2>
      <div ref={chartContainerRef} className="w-full h-[350px] md:h-[500px] flex-grow" />
    </div>
  );
};

export default TradingChart;
