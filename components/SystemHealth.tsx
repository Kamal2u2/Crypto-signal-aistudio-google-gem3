import React from 'react';
import type { SystemHealth } from '../types';

interface SystemHealthDisplayProps {
  health: SystemHealth;
}

const SystemHealthDisplay: React.FC<SystemHealthDisplayProps> = ({ health }) => {
  const connectionColor = {
    Excellent: 'bg-accent-green',
    Good: 'bg-accent-green',
    Fair: 'bg-accent-yellow',
    Poor: 'bg-accent-red',
  }[health.connection];

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2" title={`Connection: ${health.connection}`}>
        <div className={`w-3 h-3 rounded-full ${connectionColor} animate-pulse`}></div>
        <span className="hidden lg:inline">{health.connection}</span>
      </div>
      <div title="Latency">
        <span className="text-dark-text-secondary">{health.latency}ms</span>
      </div>
    </div>
  );
};

export default SystemHealthDisplay;