
import React, { useState } from 'react';
import type { Signal } from '../types';
import SignalCard from './SignalCard';
import { AnimatePresence, motion } from 'framer-motion';

interface SignalTimelineProps {
  activeSignals: Signal[];
  completedSignals: Signal[];
  onRemoveSignal: (id: string) => void;
}

const SignalTimeline: React.FC<SignalTimelineProps> = ({ activeSignals, completedSignals, onRemoveSignal }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  return (
    <div className="bg-dark-card border border-dark-border rounded-lg h-[calc(100vh-120px)] flex flex-col">
      <div className="p-4 border-b border-dark-border">
        <h2 className="text-lg font-semibold text-white">Signal Timeline</h2>
        <div className="mt-4 flex border border-dark-border rounded-md p-1 bg-dark-bg">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 text-sm font-medium py-1.5 rounded ${activeTab === 'active' ? 'bg-accent-blue/20 text-accent-blue' : 'text-dark-text-secondary hover:bg-dark-border'}`}
          >
            Active ({activeSignals.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 text-sm font-medium py-1.5 rounded ${activeTab === 'history' ? 'bg-accent-blue/20 text-accent-blue' : 'text-dark-text-secondary hover:bg-dark-border'}`}
          >
            History ({completedSignals.length})
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-2">
          {activeTab === 'active' && (
              <AnimatePresence>
                {activeSignals.length > 0 ? activeSignals.map(signal => (
                    <motion.div
                        key={signal.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                      <SignalCard signal={signal} onDelete={() => onRemoveSignal(signal.id)} />
                    </motion.div>
                )) : (
                    <div className="text-center py-10 text-dark-text-secondary">
                        <p>No active signals. Waiting for market opportunities...</p>
                    </div>
                )}
              </AnimatePresence>
          )}
          {activeTab === 'history' && (
              <AnimatePresence>
                {completedSignals.length > 0 ? completedSignals.map(signal => (
                    <motion.div
                        key={signal.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.5 }}
                    >
                        <SignalCard signal={signal} onDelete={() => onRemoveSignal(signal.id)} />
                    </motion.div>
                )) : (
                    <div className="text-center py-10 text-dark-text-secondary">
                        <p>No completed signals yet.</p>
                    </div>
                )}
              </AnimatePresence>
          )}
      </div>
    </div>
  );
};

export default SignalTimeline;
