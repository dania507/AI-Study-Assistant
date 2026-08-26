from sentence_transformers import SentenceTransformer


model = SentenceTransformer("all-MiniLM-L6-v2")


def create_embedding(text):
    embedding = model.encode(text)

    return embedding.tolist()


def create_embeddings(texts):
    embeddings = model.encode(texts)

    return embeddings.tolist()