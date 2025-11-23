
import React from 'react';
import { TIMEFRAMES } from '../constants';
import type { Timeframe } from '../types';

interface TimeframeSelectorProps {
  selectedTimeframe: Timeframe;
  onSelect: (timeframe: Timeframe) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selectedTimeframe, onSelect }) => {
  return (
    <div className="flex items-center bg-dark-bg border border-dark-border rounded-md p-1">
      {TIMEFRAMES.map(tf => (
        <button
          key={tf}
          onClick={() => onSelect(tf)}
          className={`px-3 py-0.5 text-sm font-medium rounded transition-colors duration-200 ${
            selectedTimeframe === tf
              ? 'bg-accent-blue/20 text-accent-blue'
              : 'text-dark-text-secondary hover:bg-dark-border'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;