import asyncio
import os
import sys
from pathlib import Path

# Load backend .env file
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k_clean = k.strip()
                if k_clean and k_clean not in os.environ:
                    os.environ[k_clean] = v.strip()

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.schemas.chat_schema import ChatRequest
from app.ai.chat_service import ChatService

TEST_QUERIES = [
    ("1. Weather Nagpur", "What is the weather in Nagpur?"),
    ("2. Weather Tomorrow Mumbai", "What's the weather tomorrow in Mumbai?"),
    ("3. Storm Risk", "What is the storm risk?"),
    ("4. Earthquakes Nearby", "Are there earthquakes nearby?"),
    ("5. Active Fires Nearby", "Are there active fires nearby?"),
    ("6. Wildfire Risk", "What's the wildfire risk?"),
    ("7. Multi-Hazard Summary Nagpur", "What's happening around Nagpur?"),
    ("8. Invalid Location", "What is the weather in Xyzabcdefg12345?"),
]

async def run_tests():
    print("=" * 70)
    print("STARTING GROQ AI CHATBOT AUTOMATED INTEGRATION TESTS")
    print(f"GROQ_API_KEY Configured: {bool(os.getenv('GROQ_API_KEY'))}")
    print(f"GROQ_MODEL: {os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')}")
    print("=" * 70)
    
    passed_count = 0
    total_count = len(TEST_QUERIES)

    for title, query in TEST_QUERIES:
        print(f"\n[TEST] {title}")
        print(f"User Query: \"{query}\"")
        req = ChatRequest(message=query)
        
        try:
            res = await ChatService.process_chat_query(req)
            print(f"Status Success: {res.success}")
            print(f"Resolved Location: {res.location.name if res.location else 'None'} ({res.location.source if res.location else ''})")
            print(f"Sources Count: {len(res.sources)}")
            for src in res.sources:
                print(f"  - Source: {src.name} [{src.type}]")
            print("--- AI ANSWER SNIPPET ---")
            snippet = res.answer.encode("ascii", "replace").decode("ascii")
            print(snippet[:300] + ("..." if len(snippet) > 300 else ""))
            print("-------------------------")
            
            if res.success and res.answer and len(res.sources) > 0:
                print(f"[PASS] {title}")
                passed_count += 1
            else:
                print(f"[FAIL] {title}")
        except Exception as e:
            print(f"[ERROR] in {title}: {str(e)}")

    print("\n" + "=" * 70)
    print(f"TEST SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_tests())
