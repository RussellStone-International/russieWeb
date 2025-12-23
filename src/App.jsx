import React, { useState, useRef, useEffect } from 'react'
import { format } from "date-fns";
import './App.css'
import {Send, MessageCircle, Bot, Paperclip, User, MoveUp, Sparkles} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

const COLORS = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf"
];

// Adapter: canonical spec → Recharts rows
function adaptLineSpec(spec) {
    return spec.xAxis.categories.map((x, i) => {
        const row = { x };

        spec.series.forEach(s => {
            row[s.name] = s.data[i] ?? null;
        });

        return row;
    });
}

const ChartRenderer = React.memo(function ChartRenderer({ spec }) {
    const data = React.useMemo(
        () => (spec && spec.type === "line" ? adaptLineSpec(spec) : null),
        [spec]
    );

    if (!spec || spec.type !== "line") return null;

    return (
        <div className="chat-chart">
            <div className="chat-chart-title"><strong>{spec.title}</strong></div>

            <ResponsiveContainer width="100%" height={360}>
                <LineChart data={data} >
                    <XAxis dataKey="x"
                           tickFormatter={(v) =>
                               spec.range === "seasonal"
                                   ? format(new Date(v), "MMM-yyyy")
                                   : v
                           }/>

                    <YAxis
                        domain={['dataMin - 50', 'dataMax + 50']}
                        tickFormatter={v => v?.toLocaleString()}
                    />

                    <Tooltip
                        formatter={(value, name) => [
                            value?.toLocaleString(),
                            name
                        ]}
                        labelFormatter={label =>
                            `${spec.xAxis.label}: ${label}`
                        }
                    />
                    <Legend
                        verticalAlign="top"
                        align="center"
                        iconType="line"
                        wrapperStyle={{ marginBottom: 20 }}
                    />

                    {spec.series.map((s, idx) => (
                        <Line
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            stroke={COLORS[idx % COLORS.length]}
                            dot={false}
                            connectNulls={true}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});


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
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        >
                            {msg.text}
                        </ReactMarkdown>

                        {Array.isArray(msg.charts)
                            ? msg.charts.map((chart, idx) => (
                                <ChartRenderer key={idx} spec={chart} />
                            ))
                            : msg.charts
                                ? <ChartRenderer spec={msg.charts} />
                                : null}
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
    const [chatEndpoint, setChatEndpoint] = useState(sessionStorage.getItem('session_chat_endpoint') || '')
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const [sessionToken, setSessionToken] = useState(sessionStorage.getItem('session_token') || null)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [authLoading, setAuthLoading] = useState(false)
    const pollRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // const scrollToBottom = () => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    // }
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

    const handleSend = async () => {
        if (!input.trim()) return

        // Add user message
        const userMessage = { id: Date.now(), text: input, sender: 'user' }
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
            // Step 1: Start the job
            const startResponse = await fetch(chatEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    email: sessionStorage.getItem('session_email')
                })
            })

            const { jobId } = await startResponse.json()

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }


            // Step 2: Poll for status
            pollRef.current = setInterval(async () => {
                try {
                    const statusResponse = await fetch(
                        `${chatEndpoint.replace('chat-start', 'chat-status')}?jobId=${jobId}`
                    );

                    const statusData = await statusResponse.json();

                    // Update progress
                    if (statusData.message) {
                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === botMessageId
                                    ? { ...msg, text: statusData.message }
                                    : msg
                            )
                        );
                    }

                    // ✅ STOP polling when done
                    if (statusData.status === 'done') {
                        clearInterval(pollRef.current);
                        pollRef.current = null;

                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }

                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === botMessageId
                                    ? {
                                        ...msg,
                                        text: statusData.final,
                                        charts: statusData.charts || []
                                    }
                                    : msg
                            )
                        );

                        setLoading(false);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);


            // Safety timeout after 5 minutes
            timeoutRef.current = setTimeout(() => {
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
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
    }

    // const handleAttach = () => {
    //     console.log("Attaching files");
    // }

    const checkEmailAndSendOtp = async () => {
        if (!email.trim()) return
        setAuthLoading(true)
        try {
            const res = await fetch('https://russie.app.n8n.cloud/webhook/russie-verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }).toLowerCase()
            })
            const data = await res.json()
            if (data.success) {
                setOtpSent(true) // move to OTP input
            } else {
                alert(data.message || 'Email not registered')
            }
        } catch (err) {
            alert('Error sending OTP')
        } finally {
            setAuthLoading(false)
        }
    }

    // Verify OTP
    const verifyOtp = async () => {
        if (!otp.trim()) return
        setAuthLoading(true)
        try {
            const res = await fetch('https://russie.app.n8n.cloud/webhook/russie-verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            })
            const data = await res.json()
            if (data.success) {
                setSessionToken(data.token)
                setChatEndpoint(data.chat_endpoint)

                sessionStorage.setItem('session_token', data.token)
                sessionStorage.setItem('session_email', data.email.toLowerCase())
                sessionStorage.setItem('session_chat_endpoint', data.chat_endpoint)
            } else {
                alert(data.message || 'Invalid OTP')
            }
        } catch (err) {
            alert('Error verifying OTP')
        } finally {
            setAuthLoading(false)
        }
    }

    const logout = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        sessionStorage.removeItem('session_token')
        sessionStorage.removeItem('session_chat_endpoint')
        setSessionToken(null)
        setOtpSent(false)
        setChatEndpoint('')
        setEmail('')
        setOtp('')
        setMessages(([]))
    }
    const suggestedPrompts = [
        "When does the maize contract expire?",
        "Technical analysis for Mar Yellow Maize",
        "Any news affecting soybeans today?",
        "Tell me a joke"
    ];



    // function preprocessBotOutput(text) {
    //     return text.replace(/```html([\s\S]*?)```/g, (_, html) => html.trim());
    // }



    if (!sessionToken) {
        return (
            <div className={'login-screen'}>
                <div className="login-container">
                    <div className={"login-title-container"}>
                    <img
                        src="https://raw.githubusercontent.com/MysticMelo/RSIChatbot/refs/heads/main/spinningLogo.png"
                        alt="RSI Logo"
                        className="chat-logo"
                        draggable={false}
                    />
                    <h2>Russie Login</h2>
                    </div>
                    {!otpSent ? (
                        <>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && checkEmailAndSendOtp()}
                                placeholder="Enter your email"
                                disabled={authLoading}
                            />

                            <button
                                onClick={checkEmailAndSendOtp}
                                disabled={authLoading || !email.trim()}
                            >
                                {authLoading ? 'Checking...' : 'Next'}
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                                placeholder="Enter OTP"
                                disabled={authLoading}
                            />
                            <button
                                onClick={verifyOtp}
                                disabled={authLoading || !otp.trim()}
                            >
                                {authLoading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                            <button onClick={() => setOtpSent(false)}>Change Email</button>
                        </>
                    )}
                </div>
            </div>

        )
    }
    else {
        return (
            <>

                <div className="chat-main-container">
                    {/* Header */}
                    <header className="chat-header-sticky">
                        <div className="chat-header-content">
                            <div className="chat-header-left">
                                <img
                                    src="https://raw.githubusercontent.com/MysticMelo/RSIChatbot/refs/heads/main/spinningLogo.png"
                                    alt="RSI Logo"
                                    className="chat-logo"
                                    draggable={false}
                                />
                                <h1 className="chat-title">Russie</h1>
                            </div>
                            <button className="logout-button" onClick={logout}>
                                Logout
                            </button>
                        </div>
                    </header>

                    {/* Main Content */}
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
                                    <p className="empty-state-subtitle">
                                        Ask me anything or try one of these prompts
                                    </p>

                                     Suggested Prompts
                                    <div className="suggested-prompts-grid">
                                        {suggestedPrompts.map((prompt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setInput(prompt)}
                                                className="prompt-button"
                                            >
                                                <Sparkles className="prompt-icon" />
                                                <span className="prompt-text">{prompt}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <MessagesList messages={messages} loading={loading} endRef={messagesEndRef} />

                            )}
                        </div>
                    </main>

                    {/* Floating Input */}
                    <div className="floating-input-container">
                        <div className="floating-input-wrapper">
                            <div className="input-glow-wrapper">
                                <div className="input-glow"></div>
                                <div className="input-box">
                <textarea
                    value={input}
                    onChange={e => {
                        setInput(e.target.value);

                        const el = e.target;

                        // Reset height
                        el.style.height = "auto";

                        // Apply natural height
                        const newHeight = el.scrollHeight;

                        // If within limit → grow without scroll
                        if (newHeight <= 200) {
                            el.style.height = newHeight + "px";
                            el.style.overflowY = "hidden";
                        }
                        else {
                            // Cap height and enable scroll
                            el.style.height = "200px";
                            el.style.overflowY = "auto";
                        }
                    }}
                    onKeyPress={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Ask Russie anything..."
                    disabled={loading}
                    rows={1}
                    className="chat-textarea"
                />
                                    <button
                                        onClick={handleSend}
                                        disabled={loading || !input.trim()}
                                        className="send-button"
                                    >
                                        <MoveUp style={{ width: '20px', height: '20px', color: 'black' }} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </>
        )
    }
}

export default App