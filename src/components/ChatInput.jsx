import React, {useRef} from "react";
import { Terminal, MoveUp } from "lucide-react";


const ChatInput = React.memo(function ChatInput({
                                                    input,
                                                    setInput,
                                                    loading,
                                                    handleSend,
                                                    commandsPanelOpen,
                                                    setCommandsPanelOpen
                                                }) {
    const textareaRef = useRef(null);

    const onChange = React.useCallback((e) => {
        setInput(e.target.value);

        const el = textareaRef.current;
        if (!el) return;

        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }, [setInput]);

    return (
        <div className="floating-input-container no-sidebar">
            <div className="floating-input-wrapper">
                <div className="input-box">
                    {/* <button
                        onClick={() => setCommandsPanelOpen(v => !v)}
                        className={`toggle-commands-btn ${commandsPanelOpen ? 'active' : ''}`}
                    >
                        <Terminal />
                    </button> */}

                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={onChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                const el = textareaRef.current;
                                if (el) el.style.height = "auto";
                                handleSend();
                            }
                        }}
                        rows={1}
                        disabled={loading}
                        className="chat-textarea"
                        placeholder="Ask Russie anything..."
                    />

                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className="send-button"
                    >
                        <MoveUp />
                    </button>
                </div>
            </div>
        </div>
    );
});

export default ChatInput;