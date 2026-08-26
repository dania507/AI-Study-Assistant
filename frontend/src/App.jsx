import { useState, useRef, useEffect } from "react";

import ReactMarkdown from "react-markdown";

import remarkMath from "remark-math";

import remarkGfm from "remark-gfm";

import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

import "./App.css";

const DEFAULT_CHUNK_SIZE = 500;

const DEFAULT_CHUNK_OVERLAP = 50;

function App() {
  const [selectedFile, setSelectedFile] = useState(null);

  const [uploading, setUploading] = useState(false);

  const [uploaded, setUploaded] = useState(false);

  const [message, setMessage] = useState("");

  // Chat state

  const [input, setInput] = useState("");

  const [messages, setMessages] = useState([]); // [{id, role, content, sources?}]

  const [loading, setLoading] = useState(false);

  // Chunking settings — now a persistent sidebar, not an overlay panel

  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);

  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_CHUNK_OVERLAP);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setSelectedFile(file);

      setMessage("");

      setUploaded(false);
    }
  };

  const resetChunkSettings = () => {
    setChunkSize(DEFAULT_CHUNK_SIZE);

    setChunkOverlap(DEFAULT_CHUNK_OVERLAP);
  };

  const uploadPDF = async () => {
    if (!selectedFile) {
      setMessage("Please select a PDF first.");

      return;
    }

    setUploading(true);

    setMessage("");

    const formData = new FormData();

    formData.append("file", selectedFile);

    formData.append("chunk_size", chunkSize);

    formData.append("chunk_overlap", chunkOverlap);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload-pdf", {
        method: "POST",

        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed.");
      }

      setUploaded(true);

      setMessage(
        `${data.filename} uploaded successfully • ${data.total_chunks} chunks (size ${chunkSize}, overlap ${chunkOverlap})`,
      );
    } catch (error) {
      setMessage(`Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const askQuestion = async () => {
    if (!input.trim()) {
      setMessage("Please enter a question.");

      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),

      role: "user",

      content: input,
    };

    const history = messages.slice(-6).map((m) => ({
      role: m.role,

      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage]);

    setInput("");

    setLoading(true);

    setMessage("");

    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          query: userMessage.content,

          n_results: 3,

          history,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to get answer.");
      }

      const validSources = (data.sources || []).filter(
        (source) => source.filename && source.page,
      );

      const uniqueSources = validSources.filter(
        (source, index, self) =>
          index ===
          self.findIndex(
            (item) =>
              item.filename === source.filename && item.page === source.page,
          ),
      );

      const assistantMessage = {
        id: crypto.randomUUID(),

        role: "assistant",

        content: data.answer,

        sources: uniqueSources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: crypto.randomUUID(),

        role: "assistant",

        content: `Something went wrong: ${error.message}`,

        sources: [],

        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && event.ctrlKey) {
      askQuestion();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <div className="logo-icon">✦</div>

          <span>StudyAI</span>
        </div>

        <div className="header-badge">
          <span className="status-dot"></span>
          AI Study Assistant
        </div>
      </header>

      <div className="app-body">
        <aside className="chunk-sidebar">
          <div className="chunk-sidebar-header">
            <h3>Chunking Settings</h3>
          </div>

          <p className="chunk-panel-note">
            These control how the NEXT uploaded PDF gets split into chunks.
            Re-upload after changing values to see the effect.
          </p>

          <div className="chunk-control">
            <div className="chunk-control-label">
              <span>Chunk size</span>

              <span className="chunk-control-value">{chunkSize} words</span>
            </div>

            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
            />
          </div>

          <div className="chunk-control">
            <div className="chunk-control-label">
              <span>Chunk overlap</span>

              <span className="chunk-control-value">{chunkOverlap} words</span>
            </div>

            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
            />
          </div>

          {chunkOverlap >= chunkSize && (
            <div className="chunk-warning">
              Overlap should be smaller than chunk size.
            </div>
          )}

          <button className="chunk-reset-button" onClick={resetChunkSettings}>
            Reset to defaults
          </button>
        </aside>

        <div className="app-main">
          <section className="hero">
            <div className="hero-icon">✦</div>

            <h1>
              Study smarter.
              <br />
              <span>Ask anything.</span>
            </h1>

            <p>
              Upload your study material and let AI help you understand your
              notes with accurate, source-based answers.
            </p>
          </section>

          <main className="container">
            {/* Upload Card */}

            <section className="card upload-card">
              <div className="section-heading">
                <div className="heading-icon">📄</div>

                <div>
                  <h2>Study Material</h2>

                  <p>Upload a PDF to start studying</p>
                </div>
              </div>

              <label className="drop-zone">
                <input type="file" accept=".pdf" onChange={handleFileChange} />

                <div className="upload-icon">↑</div>

                <div className="upload-title">
                  {selectedFile ? selectedFile.name : "Choose your PDF"}
                </div>

                <div className="upload-subtitle">
                  {selectedFile
                    ? "PDF selected and ready to upload"
                    : "Click here to browse your files"}
                </div>
              </label>

              <button
                className="primary-button"
                onClick={uploadPDF}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Upload & Process PDF <span>→</span>
                  </>
                )}
              </button>

              {uploaded && (
                <div className="success-message">
                  <span>✓</span> PDF successfully added to your study library
                </div>
              )}
            </section>

            {message && !uploaded && <div className="message">{message}</div>}

            {/* Chat Card */}

            <section className="card chat-card">
              <div className="section-heading">
                <div className="heading-icon question-icon">?</div>

                <div>
                  <h2>Chat with your notes</h2>

                  <p>Ask follow-up questions — the AI remembers context</p>
                </div>
              </div>

              <div className="chat-window">
                {messages.length === 0 && (
                  <div className="chat-empty">
                    Ask your first question about the uploaded material.
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row ${
                      msg.role === "user" ? "row-user" : "row-assistant"
                    }`}
                  >
                    <div
                      className={`chat-bubble ${
                        msg.role === "user" ? "bubble-user" : "bubble-assistant"
                      } ${msg.isError ? "bubble-error" : ""}`}
                    >
                      {msg.role === "assistant" ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="sources-section">
                          <div className="sources-title">
                            <span>📚</span> Sources from your notes
                          </div>

                          <div className="sources">
                            {msg.sources.map((source, index) => (
                              <div className="source" key={index}>
                                <div className="source-left">
                                  <div className="pdf-icon">PDF</div>

                                  <div>
                                    <strong>{source.filename}</strong>
                                  </div>
                                </div>

                                <div className="page-number">
                                  Page {source.page}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="chat-bubble-row row-assistant">
                    <div className="chat-bubble bubble-assistant bubble-loading">
                      <span className="spinner spinner-dark"></span>
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="chat-input-box">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your question here..."
                />

                <div className="question-footer">
                  <span>Ctrl + Enter to ask</span>

                  <button
                    className="ask-button"
                    onClick={askQuestion}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Thinking...
                      </>
                    ) : (
                      <>
                        Ask AI <span>✦</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </main>

          {/* Footer */}

          <footer>
            <span>StudyAI</span>

            <span>•</span>

            <span>
              Developed by <strong>Dania</strong>
            </span>

            <span>•</span>

            <span>Powered by RAG + Gemini</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
