import os
from pathlib import Path
from dotenv import load_dotenv

dotenv_path = Path("backend") / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)

token = os.getenv("MAPILLARY_ACCESS_TOKEN", "").strip()

print("MAPILLARY_ACCESS_TOKEN configured:", bool(token and not token.startswith("PASTE_")))
print("Token length:", len(token) if token else 0)
