import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { notificationsEnabled, requestNotificationPermission } = useSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-dark-card border border-dark-border rounded-lg w-full max-w-md m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-dark-border flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button onClick={onClose} className="text-dark-text-secondary hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-dark-text mb-2">Notifications</h3>
                <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg">
                  <span className="text-dark-text-secondary">Enable trade signal notifications</span>
                  {!notificationsEnabled ? (
                      <button 
                        onClick={requestNotificationPermission}
                        className="px-4 py-2 text-sm font-medium bg-accent-blue text-white rounded-md hover:bg-accent-blue/80"
                      >
                        Enable
                      </button>
                  ) : (
                    <span className="text-sm font-medium text-accent-green">Enabled</span>
                  )}
                </div>
                 <p className="text-xs text-dark-text-secondary mt-2">
                    You'll receive a desktop notification when a new signal is generated.
                    You may need to grant permission in your browser.
                 </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;