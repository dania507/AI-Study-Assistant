import chromadb

from services.embedding_service import create_embedding


# Create a persistent ChromaDB client
client = chromadb.PersistentClient(path="./chroma_db")

# Create or load our collection
collection = client.get_or_create_collection(
    name="study_materials"
)


def add_document(document_id, text, metadata=None):
    """
    Add a text chunk and its embedding to ChromaDB.
    """

    embedding = create_embedding(text)

    collection.add(
        ids=[document_id],
        embeddings=[embedding],
        documents=[text],
        metadatas=[metadata or {}]
    )


def search_documents(query, n_results=3, relevance_margin=0.25):
    """
    Search ChromaDB for the most relevant text chunks.

    Results are kept only if they are reasonably close
    to the best matching result.
    """

    query_embedding = create_embedding(query)

    # Retrieve more candidates first
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=max(n_results * 3, 10),
        include=["documents", "metadatas", "distances"]
    )

    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    if not distances:
        return {
            "documents": [[]],
            "metadatas": [[]],
            "distances": [[]]
        }

    # Best result = smallest distance
    best_distance = distances[0]

    filtered_documents = []
    filtered_metadatas = []
    filtered_distances = []

    for document, metadata, distance in zip(
        documents,
        metadatas,
        distances
    ):
        # Keep results close to the best result
        if distance - best_distance <= relevance_margin:
            filtered_documents.append(document)
            filtered_metadatas.append(metadata)
            filtered_distances.append(distance)

        if len(filtered_documents) >= n_results:
            break

    return {
        "documents": [filtered_documents],
        "metadatas": [filtered_metadatas],
        "distances": [filtered_distances]
    }