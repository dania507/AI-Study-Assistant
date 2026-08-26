# StudyAI — AI Study Assistant

An AI-powered study assistant that lets you upload PDF study material and ask questions about its contents.

The app uses Retrieval-Augmented Generation (RAG) to retrieve relevant passages from your uploaded documents before generating an answer with Gemini. This keeps answers grounded in _your_ material instead of relying only on the model's general knowledge.

---

## Features

- Upload PDF study material
- Extract text from PDF documents
- Split documents into configurable chunks
- Generate semantic embeddings using Sentence Transformers
- Store document embeddings in ChromaDB
- Perform semantic search to find relevant content
- Generate answers using Google Gemini
- Conversational follow-up questions with recent context retained
- Displays source PDF and page numbers for every answer
- Markdown support: tables, lists, headings, code blocks
- Mathematical expression rendering via KaTeX
- Adjustable chunk size and chunk overlap
- Clean, responsive React frontend

---

## How It Works

The app follows a Retrieval-Augmented Generation (RAG) pipeline:

```
PDF Upload → Extract Text → Chunk Text → Generate Embeddings (Sentence Transformers)
     → Store in ChromaDB → User Question → Semantic Search → Relevant Chunks
     → Gemini AI → Answer + Source References
```

**1. PDF Text Extraction** — The uploaded PDF is parsed and its text extracted.

**2. Text Chunking** — Extracted text is split into smaller chunks, with user-configurable chunk size and overlap, so different chunking strategies can be tested.

**3. Embeddings** — Each chunk is converted into a 384-dimensional vector using the `all-MiniLM-L6-v2` Sentence Transformers model.

**4. Vector Database** — Embeddings and their metadata are stored in ChromaDB.

**5. Semantic Search** — The user's question is embedded the same way, and ChromaDB retrieves the most relevant chunks by similarity.

**6. Gemini AI** — The retrieved chunks, the question, and recent conversation history are passed to Gemini, which generates the final answer.

**7. Sources** — The response includes the source filename and page number for the retrieved content.

---

## Why RAG?

A standard chatbot answers only from what the underlying model already knows. This project retrieves relevant passages from _your_ uploaded material first, then hands that context to the model — making it far better suited to studying from specific notes, textbooks, or lecture slides than a general-purpose chatbot would be.

```
User Question → Retrieve Relevant Information → Provide Context to AI → Generate Answer
```

---

## Technologies Used

**Backend**

- Python
- FastAPI
- Google Gemini API
- Sentence Transformers
- ChromaDB
- PyMuPDF
- Uvicorn

**Frontend**

- React
- Vite
- JavaScript
- CSS
- React Markdown, Remark GFM, Remark Math, Rehype KaTeX

---

## Project Structure

```
AI-Study-Assistant/
│
├── backend/
│   ├── services/
│   │   ├── chunk_service.py
│   │   ├── embedding_service.py
│   │   ├── llm_service.py
│   │   ├── pdf_service.py
│   │   └── vector_store.py
│   │
│   ├── main.py
│   ├── test_gemini.py
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── README.md
└── .gitignore
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/dania-507/AI-Study-Assistant.git
cd AI-Study-Assistant
```

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:

```
GEMINI_API_KEY=your_gemini_api_key
```

> Never commit the `.env` file to GitHub.

Start the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Environment Variables

The backend requires a Gemini API key, set in `backend/.env`:

```
GEMINI_API_KEY=your_api_key_here
```

Do not upload API keys or other secrets to GitHub.

---

## API Endpoints

### Upload PDF

```
POST /upload-pdf
```

Uploads a PDF and processes it through the RAG pipeline.

### Ask Question

```
POST /ask
```

Accepts a user question and returns an AI-generated answer based on relevant document chunks.

**Example request:**

```json
{
  "query": "What is an encoder?",
  "n_results": 3,
  "history": []
}
```

---

## Chunking Configuration

The frontend exposes two controls:

- **Chunk Size** — approximate number of words per chunk
- **Chunk Overlap** — number of words shared between consecutive chunks

Example with size 500 / overlap 50:

```
Chunk 1: words 1 - 500
Chunk 2: words 451 - 950
Chunk 3: words 901 - 1400
```

Overlap helps preserve context across chunk boundaries.

---

## Future Improvements

- User authentication
- Multiple document libraries
- Persistent conversation history
- PDF preview with source-text highlighting
- Streaming AI responses
- Improved citation handling
- Cloud-based vector database
- Deployment to a cloud platform
- Support for additional document formats
- Voice-based questions
- Re-ranking of retrieved documents

---
