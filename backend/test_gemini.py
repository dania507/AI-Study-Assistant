from dotenv import load_dotenv

load_dotenv()

from services.llm_service import generate_answer


question = "What is an encoder?"

context = """
An encoder is a combinational logic circuit that converts
multiple input lines into a smaller number of output lines.
"""

print("Testing Gemini...")

answer = generate_answer(question, context)

print("\nAI Answer:")
print(answer)