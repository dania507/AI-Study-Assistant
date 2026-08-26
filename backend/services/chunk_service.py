def create_chunks(text, chunk_size=500, overlap=50):

    # Guard against the case where overlap >= chunk_size: the loop below
    # advances by (chunk_size - overlap) each step, so if that's <= 0,
    # `start` never increases and this becomes an infinite loop. The
    # frontend warns about this, but the backend can't rely on that —
    # it has to be safe on its own.
    if overlap >= chunk_size:
        overlap = max(0, chunk_size - 1)

    words = text.split()

    chunks = []

    start = 0

    while start < len(words):
        end = start + chunk_size

        chunk_words = words[start:end]

        chunk = " ".join(chunk_words)

        chunks.append(chunk)

        start += chunk_size - overlap

    return chunks