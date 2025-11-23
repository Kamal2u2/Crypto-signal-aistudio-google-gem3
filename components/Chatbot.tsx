
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createChat } from '../services/geminiService';
import type { CryptoSymbol, Timeframe } from '../types';
import type { Chat } from '@google/genai';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    symbol: CryptoSymbol;
    timeframe: Timeframe;
}

interface Message {
  role: 'user' | 'model';
  content: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, symbol, timeframe }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setIsError(false);
            try {
                chatRef.current = createChat(symbol, timeframe);
                setMessages([
                    { role: 'model', content: `Hello! I'm your AI Analyst. How can I help you with ${symbol} on the ${timeframe} timeframe today?` }
                ]);
            } catch (error) {
                console.error("Failed to initialize chat:", error);
                setIsError(true);
                setMessages([
                    { role: 'model', content: `⚠️ AI Service Unavailable. Please ensure your API Key is correctly configured in the environment variables to use this feature.` }
                ]);
            }
        } else {
            // Cleanup when closed if needed
            chatRef.current = null;
            setMessages([]);
        }
    }, [isOpen, symbol, timeframe]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current || isError) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: input });
            
            let modelResponse = '';
            setMessages(prev => [...prev, { role: 'model', content: '' }]);

            for await (const chunk of stream) {
                if (chunk.text) {
                    modelResponse += chunk.text;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].content = modelResponse;
                        return newMessages;
                    });
                }
            }
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error communicating with the AI service.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md h-[70vh] max-h-[600px] bg-dark-card border border-dark-border rounded-lg shadow-2xl flex flex-col z-50 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-dark-border flex-shrink-0 bg-dark-card/95 backdrop-blur">
                        <div className="flex items-center gap-2">
                             <span className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isError ? 'bg-accent-red' : 'bg-accent-blue'} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${isError ? 'bg-accent-red' : 'bg-accent-blue'}`}></span>
                            </span>
                            <h3 className="text-md font-semibold text-white">AI Analyst Assistant</h3>
                        </div>
                        <button onClick={onClose} className="text-dark-text-secondary hover:text-white p-1 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-dark-bg/50">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-2 rounded-lg shadow-sm ${msg.role === 'user' ? 'bg-accent-blue text-white rounded-br-none' : 'bg-dark-card text-dark-text rounded-bl-none border border-dark-border'}`}>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-dark-card border border-dark-border px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-dark-text-secondary rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-dark-text-secondary rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-dark-text-secondary rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-dark-border bg-dark-card">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isError ? "Service Unavailable" : `Ask about ${symbol}...`}
                                disabled={isLoading || isError}
                                className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 text-sm text-dark-text placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                type="submit" 
                                disabled={isLoading || !input.trim() || isError} 
                                className="bg-accent-blue text-white p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-blue/80 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                        </form>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Chatbot;
