const { useState, useRef, useEffect } = React;

const FeelingUnderstoodChatbot = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome. This is a safe space to explore what it means to feel understood—and what happens when we don't.\n\nThink about the people who matter most to you. How well do you feel understood by them?",
      options: [
        "I often feel understood",
        "Sometimes I do, sometimes I don't",
        "I rarely feel understood",
        "I'd rather describe it in my own words"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    if (window.self === window.top) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const systemPrompt = `You are an empathetic conversation guide for a project about feeling understood. Your role is to help people explore their experiences of feeling understood or misunderstood in their relationships.

Key principles:
- Be warm, compassionate, and non-judgmental
- NEVER give advice. Your role is to listen, reflect, and help people articulate their feelings
- Use active listening techniques: reflect back what you hear, validate emotions, ask clarifying questions
- Help users identify which aspects of their identity they feel misunderstood about
- When appropriate, gently introduce concepts from the 5 Ways to Feel Understood
- Periodically offer brief summaries of what you have heard
- Keep responses conversational and not too long (2-4 sentences usually)
- The goal is for users to feel heard and to gain insight into their communication patterns`;

  const handleOptionClick = async (option) => {
    setShowOptions(false);
    await sendMessage(option);
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: systemPrompt,
          messages: conversationHistory
        })
      });

      const data = await response.json();
      const assistantMessage = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantMessage
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '600px',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, Helvetica, sans-serif'
    },
    header: {
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e5e5e5',
      padding: '20px 24px'
    },
    headerContent: {
      maxWidth: '900px',
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    icon: {
      width: '48px',
      height: '48px',
      backgroundColor: '#ffd21f',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#121212'
    },
    headerText: {
      flex: 1
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#121212',
      margin: 0,
      lineHeight: 1.2
    },
    subtitle: {
      fontSize: '14px',
      color: '#999b9b',
      margin: '4px 0 0 0'
    },
    messagesContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: '32px 24px',
      backgroundColor: '#ffffff'
    },
    messagesInner: {
      maxWidth: '900px',
      margin: '0 auto'
    },
    messageRow: {
      display: 'flex',
      marginBottom: '24px'
    },
    messageBubble: {
      maxWidth: '75%',
      padding: '16px 20px',
      borderRadius: '8px',
      lineHeight: 1.6
    },
    messageBubbleUser: {
      backgroundColor: '#121212',
      color: '#ffffff',
      marginLeft: 'auto'
    },
    messageBubbleAssistant: {
      backgroundColor: '#f5f5f5',
      color: '#121212',
      border: '1px solid #e5e5e5'
    },
    optionsContainer: {
      marginTop: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    optionButton: {
      width: '100%',
      textAlign: 'left',
      padding: '12px 16px',
      backgroundColor: '#ffffff',
      border: '2px solid #121212',
      borderRadius: '4px',
      color: '#121212',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontFamily: 'Arial, Helvetica, sans-serif'
    },
    inputContainer: {
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e5e5',
      padding: '20px 24px'
    },
    inputInner: {
      maxWidth: '900px',
      margin: '0 auto'
    },
    inputRow: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    input: {
      flex: 1,
      padding: '14px 18px',
      border: '2px solid #e5e5e5',
      borderRadius: '8px',
      fontSize: '15px',
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#121212',
      outline: 'none'
    },
    sendButton: {
      width: '52px',
      height: '52px',
      backgroundColor: '#ffd21f',
      border: 'none',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      color: '#121212'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.icon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div style={styles.headerText}>
            <h1 style={styles.title}>— I want to feel understood</h1>
            <p style={styles.subtitle}>A safe space for exploration</p>
          </div>
        </div>
      </div>

      <div style={styles.messagesContainer}>
        <div style={styles.messagesInner}>
          {messages.map((message, index) => (
            <div key={index} style={styles.messageRow}>
              <div style={{
                ...styles.messageBubble,
                ...(message.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant)
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
                
                {message.options && showOptions && index === messages.length - 1 && (
                  <div style={styles.optionsContainer}>
                    {message.options.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() => handleOptionClick(option)}
                        style={styles.optionButton}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#ffd21f'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={styles.messageRow}>
              <div style={styles.messageBubbleAssistant}>
                <div style={{display: 'flex', gap: '6px'}}>
                  <div style={{width: '8px', height: '8px', backgroundColor: '#999b9b', borderRadius: '50%'}}></div>
                  <div style={{width: '8px', height: '8px', backgroundColor: '#999b9b', borderRadius: '50%'}}></div>
                  <div style={{width: '8px', height: '8px', backgroundColor: '#999b9b', borderRadius: '50%'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={styles.inputContainer}>
        <div style={styles.inputInner}>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share your thoughts..."
              style={styles.input}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              style={styles.sendButton}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<FeelingUnderstoodChatbot />, document.getElementById('chatbot-root'));
