import { useState, useRef, useEffect } from 'react';
import { askAssistant } from '../api';

type Message = { from: 'user' | 'bot'; text: string };

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: "Hey! 👋 I'm here to help — ask me anything about using Omie Store, or just say hi." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { from: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const data = await askAssistant(text);
      setMessages((prev) => [...prev, { from: 'bot', text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { from: 'bot', text: "Hmm, I couldn't reach my brain just now. Try again in a bit! 🙈" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="assistant-bubble" onClick={() => setOpen((o) => !o)}>
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="assistant-panel">
          <div className="assistant-header">✨ Omie Assistant</div>
          <div className="assistant-messages">
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg ${m.from}`}>{m.text}</div>
            ))}
            {loading && <div className="assistant-msg bot">Typing...</div>}
            <div ref={bottomRef} />
          </div>
          <div className="assistant-input-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask me anything..."
              className="assistant-input"
            />
            <button onClick={send} className="assistant-send">➤</button>
          </div>
        </div>
      )}
    </>
  );
}