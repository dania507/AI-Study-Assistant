import os
from google import genai


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def _history_to_text(history):
    """Turns a list of ChatMessage-like objects into a readable transcript."""

    history_text = ""

    if history:
        for turn in history:
            role_label = "Student" if turn.role == "user" else "Assistant"
            history_text += f"{role_label}: {turn.content}\n\n"

    return history_text


def _needs_query_rewrite(question):
    """
    Determines whether a question is likely to depend on previous
    conversation.

    This is intentionally local so we don't waste a Gemini request
    just to decide whether rewriting is necessary.
    """

    question_lower = question.lower().strip()

    # Very short/context-dependent questions
    if len(question_lower.split()) <= 5:
        return True

    # Words that commonly refer to something from the previous answer
    context_words = [
        "it",
        "its",
        "this",
        "that",
        "these",
        "those",
        "they",
        "them",
        "he",
        "she",
        "his",
        "her",
        "above",
        "previous",
        "earlier",
        "again",
        "more",
        "further",
        "simply",
        "simpler",
        "example",
    ]

    words = set(question_lower.replace("?", "").split())

    if words.intersection(context_words):
        return True

    return False


def rewrite_query(question, history):
    """
    Rewrites a context-dependent follow-up into a standalone question.

    To save Gemini API requests, standalone questions are returned
    immediately without calling Gemini.
    """

    # No conversation → nothing to rewrite
    if not history:
        return question

    # Standalone question → don't waste a Gemini request
    if not _needs_query_rewrite(question):
        return question

    history_text = _history_to_text(history)

    rewrite_prompt = f"""
Conversation so far:

{history_text}

New message from the student:

{question}

Rewrite the student's new message as a standalone question that makes
sense without the conversation above.

Keep the same intent. Do not answer the question.

Return ONLY the rewritten question.
"""

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=rewrite_prompt
        )

        rewritten = response.text.strip()

        return rewritten if rewritten else question

    except Exception:
        # If rewriting fails, retrieval can still use the original question.
        return question


def generate_answer(question, context, history=None):

    history_text = _history_to_text(history)

    prompt = f"""
You are an AI Study Assistant.

Base your answer primarily on the context below, which was retrieved
from the student's uploaded study material.

You may use the conversation history to understand references such
as "it", "that", or "the previous concept".

If the context does not contain relevant information for this question
and the conversation does not clarify it either, say:

"I couldn't find the answer in the uploaded study material."

Conversation so far:

{history_text if history_text else "(no previous messages)"}

Context:

{context}

Question:

{question}

Give a clear and simple explanation suitable for a student.
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

        return response.text

    except Exception as error:

        # Gemini quota/rate-limit error
        if "429" in str(error) or "RESOURCE_EXHAUSTED" in str(error):

            return (
                "The Gemini API quota has been reached for now. "
                "Please wait for the quota to reset and try again."
            )

        # Other Gemini/API errors
        return (
            "I'm currently unable to generate an answer because "
            "the AI service is temporarily unavailable."
        )