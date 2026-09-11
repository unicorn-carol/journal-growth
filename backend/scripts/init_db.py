"""Create all business tables against DATABASE_URL.

Usage (from backend/):
  PYTHONPATH=.. $PY scripts/init_db.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure backend/ is on path when executed as a script
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


async def main() -> None:
    from sqlalchemy import text
    from src.db.session import engine, init_db

    await init_db()
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            )
        )
        tables = [row[0] for row in result.fetchall()]
    print("created_tables:")
    for name in tables:
        print(f"  - {name}")
    required = {
        "users",
        "tags",
        "entries",
        "entry_tags",
        "highlights",
        "highlight_tags",
        "import_jobs",
        "quadrant_notes",
        "email_verification_tokens",
        "ai_tag_suggestions",
    }
    missing = sorted(required - set(tables))
    if missing:
        raise SystemExit(f"missing tables: {missing}")
    print("init_db: ok")


if __name__ == "__main__":
    asyncio.run(main())
