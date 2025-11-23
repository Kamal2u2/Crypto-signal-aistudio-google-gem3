import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SettingsContextType {
  notificationsEnabled: boolean;
  requestNotificationPermission: () => void;
  showNotification: (title: string, options?: NotificationOptions) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      console.warn('This browser does not support desktop notification');
    }
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, options);
    }
  }, []);

  const notificationsEnabled = permission === 'granted';

  return (
    <SettingsContext.Provider value={{ notificationsEnabled, requestNotificationPermission, showNotification }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};