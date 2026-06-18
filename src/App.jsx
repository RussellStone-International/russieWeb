import React, { useState, useRef, useEffect } from 'react'

import './App.css'
import {Send, MessageCircle, Bot, Paperclip, User, MoveUp, Sparkles, Terminal, ChevronRight} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import ChatInput from "./components/ChatInput.jsx"
// import CommandsSidebar from "./components/CommandsSidebar.jsx";
// import ChartRenderer from "./charts/ChartRenderer.jsx";
import remarkBreaks from "remark-breaks";
import { supabase } from "./supabaseClient.js";

const TypingIndicator = React.memo(function TypingIndicator() {
    return (
        <div className="message-row message-row-bot">
            <div className="message-avatar avatar-bot">
                <Bot style={{ width: '20px', height: '20px', color: 'white' }} />
            </div>
            <div className="message-bubble message-bubble-bot">
                <div className="typing-dots">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                </div>
            </div>
        </div>
    );
});

const Message = React.memo(function Message({ msg }) {
    return (
        <div
            className={`message-row ${
                msg.sender === 'user' ? 'message-row-user' : 'message-row-bot'
            }`}
        >
            {msg.sender === 'bot' && <BotAvatar />}

            <div
                className={`message-bubble ${
                    msg.sender === 'user'
                        ? 'message-bubble-user'
                        : 'message-bubble-bot'
                }`}
            >
                {msg.sender === 'user' ? (
                    <p>{msg.text}</p>
                ) : (
                    <>
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkBreaks]}
                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                            components={{
                                a: ({node, ...props}) => (
                                    <a
                                        {...props}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="chat-link"
                                    />
                                )
                            }}
                        >
                            {msg.text}
                        </ReactMarkdown>

                        {/* {Array.isArray(msg.charts)
                            ? msg.charts.map((chart, idx) => (
                                <ChartRenderer key={idx} spec={chart} />
                            ))
                            : msg.charts
                                ? <ChartRenderer spec={msg.charts} />
                                : null} */}
                    </>
                )}
            </div>

            {msg.sender === 'user' && <UserAvatar />}
        </div>
    );
});

const BotAvatar = React.memo(function BotAvatar() {
    return (
        <div className="message-avatar avatar-bot">
            <Bot style={{ width: '20px', height: '20px', color: 'white' }} />
        </div>
    );
});
const UserAvatar = React.memo(function UserAvatar() {
    return (
        <div className="message-avatar avatar-user">
            <User style={{ width: '20px', height: '20px', color: 'white' }} />
        </div>
    );
});
const MessagesList = React.memo(function MessagesList({ messages, loading, endRef }) {
    return (
        <div className="messages-container">
            {messages.map(msg => (
                <Message key={msg.id} msg={msg} />
            ))}

            {loading && <TypingIndicator />}
            <div ref={endRef} />
        </div>
    );
});

function App() {
    const [chatEndpoint] = useState(import.meta.env.VITE_CHAT_ENDPOINT || '')
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const channelRef = useRef(null);
    const timeoutRef = useRef(null);
    // const [commandsPanelOpen, setCommandsPanelOpen] = useState(false);


    // Listen for initialization message from parent (Vue trading platform)
    useEffect(() => {
        const handleMessage = (event) => {
            // Accept messages from any origin for development
            // In production, check: if (event.origin !== 'https://your-trading-platform.com') return
            
            if (event.data.type === 'INIT_CHAT') {
                console.log('Received INIT_CHAT from parent:', event.data)
                
                // Store user context (no JWT needed)
                sessionStorage.setItem('bb_user_id', event.data.bb_user_id)
                sessionStorage.setItem('user_name', event.data.user_name)
                sessionStorage.setItem('user_surname', event.data.user_surname)
                
                setIsInitialized(true)
                console.log('Chat initialized for user:', event.data.bb_user_id)
            }
        }

        window.addEventListener('message', handleMessage)
        
        return () => {
            window.removeEventListener('message', handleMessage)
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const prevMessageCountRef = useRef(0);

    useEffect(() => {
        const prevCount = prevMessageCountRef.current;
        const currentCount = messages.length;

        // Only scroll when a NEW message is added
        if (currentCount > prevCount) {
            messagesEndRef.current?.scrollIntoView();
        }

        prevMessageCountRef.current = currentCount;
    }, [messages.length]);

    const handleSend = React.useCallback(async (messageText) => {
        const textToSend = messageText || input;
        if (!textToSend.trim()) return
        const isBotCommand = textToSend.trim().startsWith('/');

        // Add user message
        const userMessage = { id: Date.now(), text: textToSend, sender: 'user' }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        // Add placeholder bot message with stage info
        const botMessageId = Date.now() + 1
        const placeholderMessage = {
            id: botMessageId,
            text: 'Thinking…',
            sender: 'bot',
            stage: 'understanding'
        }
        setMessages(prev => [...prev, placeholderMessage])

        try {

            // Get user context
            const bbUserId = sessionStorage.getItem('bb_user_id')
            const userName = sessionStorage.getItem('user_name')
            const userSurname = sessionStorage.getItem('user_surname')

            if (isBotCommand) {
                const res = await fetch(chatEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: textToSend,
                        bb_user_id: bbUserId,
                        user_name: userName,
                        user_surname: userSurname
                    })
                });

                const data = await res.json();

                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === botMessageId
                            ? {
                                ...msg,
                                text: data.final || data.message || 'Done.',
                                charts: data.charts || []
                            }
                            : msg
                    )
                );

                setLoading(false);
                return; // ⛔ DO NOT FALL THROUGH TO POLLING
            }
            // Step 1: Start the job
            const startResponse = await fetch(chatEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSend,
                    bb_user_id: bbUserId,
                    user_name: userName,
                    user_surname: userSurname
                })
            })

            const { jobId } = await startResponse.json()

            // Clean up any existing channel and timeout
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Step 2: Subscribe to Supabase Realtime for job updates
            const channel = supabase
                .channel(`job-${jobId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'chat_jobs',
                        filter: `job_id=eq.${jobId}`
                    },
                    (payload) => {
                        const newData = payload.new;

                        // Update progress message
                        if (newData.message) {
                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === botMessageId
                                        ? { ...msg, text: newData.message }
                                        : msg
                                )
                            );
                        }

                        // Check if job is complete
                        if (newData.status === 'done') {
                            // Clean up subscription
                            if (channelRef.current) {
                                supabase.removeChannel(channelRef.current);
                                channelRef.current = null;
                            }

                            if (timeoutRef.current) {
                                clearTimeout(timeoutRef.current);
                                timeoutRef.current = null;
                            }

                            // Update with final message
                            setMessages(prev =>
                                prev.map(msg =>
                                    msg.id === botMessageId
                                        ? {
                                            ...msg,
                                            text: newData.final || newData.message,
                                            charts: newData.charts || []
                                        }
                                        : msg
                                )
                            );

                            setLoading(false);
                        }
                    }
                )
                .subscribe();

            channelRef.current = channel;

            // Safety timeout after 5 minutes
            timeoutRef.current = setTimeout(() => {
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                    channelRef.current = null;
                }
                setLoading(false);
            }, 300000);


        } catch (error) {
            const errorMessage = {
                id: Date.now() + 1,
                text: 'Error connecting to chat. Please try again.',
                sender: 'bot',
            }
            console.log()
            setMessages(prev => [...prev, errorMessage])
            setLoading(false)
        }
    }, [input, chatEndpoint]);
    // const handleCommandClick = React.useCallback((cmd) => {
    //     handleSend(`/${cmd}`);
    // }, [handleSend]);

    // Show loading state until initialized by parent
    if (!isInitialized) {
        return (
            <div className="chat-main-container">
                <div className="empty-state-container">
                    <div className="empty-state-logo-wrapper">
                        <div className="empty-state-logo-glow"></div>
                        <img
                            src="https://raw.githubusercontent.com/MysticMelo/RSIChatbot/refs/heads/main/RSI%20Russie.png"
                            alt="Russie"
                            className="empty-state-logo"
                            draggable={false}
                        />
                    </div>
                    <h2 className="empty-state-title">Initializing chat...</h2>
                    <p className="empty-state-subtitle">Waiting for authentication from parent platform</p>
                </div>
            </div>
        )
    }

    return (
        <>

                <div className="chat-main-container">
                    {/* Main Content Area */}
                    <div className="content-layout no-sidebar">
                        {/* Chat Area */}
                        <main className="chat-main-content">
                            <div className="chat-content-wrapper">
                                {messages.length === 0 ? (
                                    <div className="empty-state-container">
                                        <div className="empty-state-logo-wrapper">
                                            <div className="empty-state-logo-glow"></div>
                                            <img
                                                src="https://raw.githubusercontent.com/MysticMelo/RSIChatbot/refs/heads/main/RSI%20Russie.png"
                                                alt="Russie"
                                                className="empty-state-logo"
                                                draggable={false}
                                            />
                                        </div>
                                        <h2 className="empty-state-title">
                                            What can I help you with?
                                        </h2>
                                        {/*suggestions:*/}
                                        {/*<p className="empty-state-subtitle">*/}
                                        {/*    Ask me anything or try one of these prompts*/}
                                        {/*</p>*/}

                                        {/*<div className="suggested-prompts-grid">*/}
                                        {/*    {suggestedPrompts.map((prompt, idx) => (*/}
                                        {/*        <button*/}
                                        {/*            key={idx}*/}
                                        {/*            onClick={() => setInput(prompt)}*/}
                                        {/*            className="prompt-button"*/}
                                        {/*        >*/}
                                        {/*            <Sparkles className="prompt-icon" />*/}
                                        {/*            <span className="prompt-text">{prompt}</span>*/}
                                        {/*        </button>*/}
                                        {/*    ))}*/}
                                        {/*</div>*/}
                                    </div>
                                ) : (
                                    <MessagesList messages={messages} loading={loading} endRef={messagesEndRef} />
                                )}
                            </div>
                        </main>

                        {/* Commands Sidebar */}
                        {/* <CommandsSidebar
                            commandsPanelOpen={commandsPanelOpen}
                            handleCommandClick={handleCommandClick}
                        /> */}
                    </div>

                    {/* Floating Input */}
                    <ChatInput
                        input={input}
                        setInput={setInput}
                        loading={loading}
                        handleSend={handleSend}
                        // commandsPanelOpen={commandsPanelOpen}
                        // setCommandsPanelOpen={setCommandsPanelOpen}
                    />
                </div>
        </>
    )
}

export default App