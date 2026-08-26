from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

from services.pdf_service import extract_pdf_text
from services.chunk_service import create_chunks
from services.embedding_service import create_embeddings
from services.vector_store import add_document, search_documents
from services.llm_service import generate_answer, rewrite_query

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str       # "user" or "assistant"
    content: str


class AskRequest(BaseModel):
    query: str
    n_results: int = 3
    history: Optional[List[ChatMessage]] = []


@app.get("/")
def home():
    return {
        "message": "AI Study Assistant API is running"
    }


@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    chunk_size: int = Form(500),
    chunk_overlap: int = Form(50),
):

    # Basic sanity bounds so the panel can't send something degenerate
    # (e.g. chunk_size=0) even before create_chunks' own overlap-vs-size
    # guard kicks in.
    chunk_size = max(50, min(chunk_size, 2000))
    chunk_overlap = max(0, min(chunk_overlap, chunk_size - 1))

    pdf_bytes = await file.read()

    pages = extract_pdf_text(pdf_bytes)

    all_chunks = []

    for page in pages:

        chunks = create_chunks(page["text"], chunk_size=chunk_size, overlap=chunk_overlap)

        for chunk in chunks:

            all_chunks.append({
                "page": page["page"],
                "text": chunk
            })

    texts = [chunk["text"] for chunk in all_chunks]

    embeddings = create_embeddings(texts)

    for i, embedding in enumerate(embeddings):

        document_id = f"{file.filename}_{all_chunks[i]['page']}_{i}"

        add_document(
            document_id=document_id,
            text=all_chunks[i]["text"],
            metadata={
                "filename": file.filename,
                "page": all_chunks[i]["page"]
            }
        )

        all_chunks[i]["embedding"] = embedding

    return {
        "filename": file.filename,
        "total_pages": len(pages),
        "total_chunks": len(all_chunks),
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "chunks": all_chunks
    }


@app.get("/search")
def search(query: str, n_results: int = 3):

    results = search_documents(query, n_results)

    return {
        "query": query,
        "results": results
    }


@app.post("/ask")
def ask_question(request: AskRequest):

    search_query = rewrite_query(request.query, request.history)

    results = search_documents(search_query, request.n_results)

    documents = results["documents"][0]

    if not documents:
        return {
            "query": request.query,
            "answer": "I couldn't find relevant information in the uploaded study material.",
            "sources": []
        }

    context = "\n\n".join(documents)

    answer = generate_answer(request.query, context, request.history)

    return {
        "query": request.query,
        "answer": answer,
        "sources": results["metadatas"][0]
    }