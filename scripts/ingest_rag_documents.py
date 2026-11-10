#!/usr/bin/env python3
"""
RAG Ingestion Script for The Quant Terminal
============================================

Reads local market research markdown files from feeding_gemini_to_create_rag/,
chunks them intelligently, generates 768-dim embeddings via Google Gemini API
(gemini-embedding-001 with outputDimensionality=768), and upserts them
into Supabase public.rag_memory table.

Usage:
    python scripts/ingest_rag_documents.py [--dir PATH] [--chunk-size 1500] [--clean]

Credentials:
    Automatically auto-loaded from super_important.env, .env, or system environment.
"""

import os
import sys
import json
import time
import re
import argparse
import hashlib
from pathlib import Path
from urllib import request, error as urlerror

# Configure UTF-8 for Windows console (e.g. cp1251 / cp1252)
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Load Environment Variables ────────────────────────────────────────

def load_env_file(env_path: Path):
    """Load key=value pairs into os.environ if not already present."""
    if not env_path.exists():
        return
    with open(env_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key and not os.environ.get(key):
                os.environ[key] = val

# Check common env paths
base_dir = Path(__file__).resolve().parent.parent
possible_env_files = [
    base_dir / ".env",
    base_dir / ".env.local",
    base_dir.parent / ".env",
    base_dir.parent / ".env.local",
]

for p in possible_env_files:
    load_env_file(p)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or 
    os.environ.get("SERVICE_ROLE_SECRET") or
    os.environ.get("SUPABASE_SERVICE_KEY") or 
    os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
)

# Supported 768-dim embedding model
EMBED_MODEL = "gemini-embedding-001"
EMBED_DIMENSIONS = 768
EMBED_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent"

# Rate limiting
EMBED_DELAY_SEC = 0.35  # ~3 requests per second to stay well below rate limits
UPSERT_DELAY_SEC = 0.05

# ── Helpers ───────────────────────────────────────────────────────────

def http_post(url: str, body: dict, headers: dict | None = None, max_retries: int = 4) -> dict:
    """Make an HTTP POST request with exponential backoff for rate limits."""
    data = json.dumps(body).encode("utf-8")
    req = request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    
    backoff = 1.5
    for attempt in range(max_retries):
        try:
            with request.urlopen(req, timeout=35) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw.strip() else {}
        except urlerror.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace")
            # If rate limited (429) or transient 5xx, retry with backoff
            if e.code in (429, 500, 502, 503, 504) and attempt < max_retries - 1:
                wait_time = backoff ** (attempt + 1)
                print(f"    ⚠️ HTTP {e.code} received. Retrying in {wait_time:.1f}s (attempt {attempt+1}/{max_retries})...")
                time.sleep(wait_time)
                continue
            print(f"  ✗ HTTP {e.code}: {body_text[:300]}")
            raise
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1.0)
                continue
            raise


def extract_title(content: str, filename: str) -> str:
    """Extract document title from first markdown H1 or filename."""
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    # Fallback to readable filename
    clean_name = filename.replace(".md", "").replace("_", " ").title()
    return clean_name


def chunk_markdown(content: str, chunk_size: int = 1500) -> list[str]:
    """Split markdown into semantically coherent chunks, preferring section boundaries."""
    if len(content) <= chunk_size:
        return [content.strip()]
    
    chunks = []
    sections = content.split("\n## ")
    
    current = ""
    for i, section in enumerate(sections):
        prefix = "## " if i > 0 else ""
        section_text = prefix + section
        
        if len(current) + len(section_text) < chunk_size:
            current += section_text + "\n"
        else:
            if current.strip():
                chunks.append(current.strip())
            
            # If section itself is larger than chunk_size, split by paragraphs
            if len(section_text) > chunk_size:
                paragraphs = section_text.split("\n\n")
                para_buf = ""
                for p in paragraphs:
                    if len(para_buf) + len(p) < chunk_size:
                        para_buf += p + "\n\n"
                    else:
                        if para_buf.strip():
                            chunks.append(para_buf.strip())
                        para_buf = p + "\n\n"
                if para_buf.strip():
                    current = para_buf
                else:
                    current = ""
            else:
                current = section_text + "\n"
    
    if current.strip():
        chunks.append(current.strip())
    
    return chunks if chunks else [content.strip()]


def embed_text(text: str, api_key: str) -> list[float]:
    """Generate 768-dim embedding via Gemini gemini-embedding-001 with outputDimensionality=768."""
    url = f"{EMBED_URL}?key={api_key}"
    body = {
        "model": f"models/{EMBED_MODEL}",
        "content": {"parts": [{"text": text}]},
        "outputDimensionality": EMBED_DIMENSIONS
    }
    resp = http_post(url, body)
    values = resp.get("embedding", {}).get("values", [])
    if not values:
        raise ValueError(f"Empty embedding response: {json.dumps(resp)[:200]}")
    if len(values) != EMBED_DIMENSIONS:
        raise ValueError(f"Expected {EMBED_DIMENSIONS} dimensions, got {len(values)}")
    return values


def upsert_to_supabase(content: str, metadata: dict, embedding: list[float],
                       supabase_url: str, service_key: str) -> dict:
    """Insert a row into public.rag_memory via PostgREST."""
    url = f"{supabase_url}/rest/v1/rag_memory"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Prefer": "return=representation"
    }
    body = {
        "content": content,
        "metadata": metadata,
        "embedding": embedding
    }
    return http_post(url, body, headers)


def content_hash(text: str) -> str:
    """Compute SHA-256 hash for deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def clean_rag_memory(supabase_url: str, service_key: str):
    """Purge existing rag_memory entries for a fresh ingestion run."""
    url = f"{supabase_url}/rest/v1/rag_memory?id=not.is.null"
    req = request.Request(url, method="DELETE")
    req.add_header("apikey", service_key)
    req.add_header("Authorization", f"Bearer {service_key}")
    try:
        with request.urlopen(req, timeout=15) as resp:
            print(f"  🧹 Cleared existing rag_memory rows (Status: {resp.status})")
    except Exception as e:
        print(f"  ⚠️ Warning while clearing rag_memory: {e}")


def verify_rag_search(supabase_url: str, service_key: str, api_key: str, test_queries: list[str]):
    """Execute test vector searches to verify cosine similarity retrieval."""
    print()
    print("╔══════════════════════════════════════════════════╗")
    print("║  SEMANTIC RAG RETRIEVAL VERIFICATION            ║")
    print("╚══════════════════════════════════════════════════╝")

    rpc_url = f"{supabase_url}/rest/v1/rpc/match_rag_memory"

    for query in test_queries:
        print(f"\n🔍 Query: \"{query}\"")
        try:
            query_emb = embed_text(query, api_key)
            payload = {
                "query_embedding": query_emb,
                "match_threshold": 0.35,
                "match_count": 2
            }
            results = http_post(rpc_url, payload, {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}"
            })
            if not results:
                print("   ⚠️ No matching records found above threshold 0.35")
            else:
                for idx, r in enumerate(results, 1):
                    sim = r.get("similarity", 0) * 100
                    title = r.get("metadata", {}).get("title", "Unknown")
                    source = r.get("metadata", {}).get("source", "Unknown")
                    preview = r.get("content", "").replace("\n", " ")[:120]
                    print(f"   [{idx}] {sim:.1f}% match | Source: {source} | Title: \"{title}\"")
                    print(f"       Preview: {preview}...")
        except Exception as e:
            print(f"   ✗ Verification search failed: {e}")

# ── Main ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ingest markdown documents into Supabase RAG memory")
    parser.add_argument("--dir", type=str, 
                        default=None,
                        help="Directory containing .md files to ingest")
    parser.add_argument("--chunk-size", type=int, default=1500,
                        help="Target chunk size in characters (default: 1500)")
    parser.add_argument("--clean", action="store_true",
                        help="Purge existing rag_memory entries before ingestion")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse and chunk files without generating embeddings or uploading")
    args = parser.parse_args()

    api_key = GEMINI_API_KEY
    supa_url = SUPABASE_URL
    supa_key = SUPABASE_SERVICE_KEY

    if not api_key:
        print("✗ GEMINI_API_KEY is missing. Check .env or export it.")
        sys.exit(1)
    if not supa_url:
        print("✗ SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is missing. Check .env or export it.")
        sys.exit(1)
    if not supa_key:
        print("✗ SUPABASE_SERVICE_ROLE_KEY is missing. Check .env or export it.")
        sys.exit(1)

    # Locate markdown directory
    if args.dir:
        md_dir = Path(args.dir)
    else:
        # Check standard locations
        candidates = [
            Path("feeding_gemini_to_create_rag"),
            base_dir / "feeding_gemini_to_create_rag",
            base_dir.parent / "feeding_gemini_to_create_rag",
        ]
        md_dir = next((c for c in candidates if c.exists() and c.is_dir()), None)
        if not md_dir:
            print(f"✗ Could not locate feeding_gemini_to_create_rag/ directory.")
            sys.exit(1)

    md_files = sorted(md_dir.glob("**/*.md"))
    if not md_files:
        print(f"✗ No .md files found in {md_dir.absolute()}")
        sys.exit(1)

    print(f"╔══════════════════════════════════════════════════╗")
    print(f"║  QUANT TERMINAL // RAG DOCUMENT INGESTION       ║")
    print(f"╚══════════════════════════════════════════════════╝")
    print(f"  📂 Source Directory: {md_dir.absolute()}")
    print(f"  📄 Markdown Files:   {len(md_files)}")
    print(f"  📏 Chunk Size:       {args.chunk_size} chars")
    print(f"  🧠 Embedding Model:  {EMBED_MODEL} ({EMBED_DIMENSIONS} dimensions)")
    print(f"  🌐 Supabase Endpoint:{supa_url}")
    print(f"  {'🔍 DRY RUN MODE' if args.dry_run else '🚀 LIVE INGESTION'}")
    print()

    if args.clean and not args.dry_run:
        clean_rag_memory(supa_url, supa_key)
        print()

    total_chunks = 0
    total_success = 0
    total_errors = 0

    for file_idx, md_file in enumerate(md_files, 1):
        rel_path = md_file.name
        content = md_file.read_text(encoding="utf-8", errors="replace")
        title = extract_title(content, rel_path)
        category = rel_path.split("_")[0] if "_" in rel_path else "general"

        chunks = chunk_markdown(content, args.chunk_size)
        print(f"  [{file_idx:02d}/{len(md_files):02d}] {rel_path} → {len(chunks)} chunks ({category.upper()})")

        for chunk_idx, chunk in enumerate(chunks, 1):
            total_chunks += 1
            c_hash = content_hash(chunk)

            metadata = {
                "source": rel_path,
                "title": title,
                "category": category,
                "chunk_index": chunk_idx,
                "total_chunks": len(chunks),
                "content_hash": c_hash,
                "ingested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }

            if args.dry_run:
                print(f"      chunk {chunk_idx}/{len(chunks)}: {len(chunk)} chars [hash: {c_hash}] (dry run)")
                continue

            # Generate 768-dim embedding
            try:
                embedding = embed_text(chunk, api_key)
                time.sleep(EMBED_DELAY_SEC)
            except Exception as e:
                print(f"      ✗ Embed failed for chunk {chunk_idx}: {e}")
                total_errors += 1
                continue

            # Upsert to Supabase rag_memory
            try:
                result = upsert_to_supabase(chunk, metadata, embedding, supa_url, supa_key)
                total_success += 1
                row_id = ""
                if isinstance(result, list) and len(result) > 0:
                    row_id = result[0].get("id", "")
                elif isinstance(result, dict):
                    row_id = result.get("id", "")
                print(f"      ✓ chunk {chunk_idx}/{len(chunks)}: {len(embedding)}d vector → row {str(row_id)[:8]}")
                time.sleep(UPSERT_DELAY_SEC)
            except Exception as e:
                print(f"      ✗ Upsert failed for chunk {chunk_idx}: {e}")
                total_errors += 1

    print()
    print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  📊 INGESTION COMPLETE")
    print(f"     Total Files Processed: {len(md_files)}")
    print(f"     Total Chunks Created:  {total_chunks}")
    print(f"     Successfully Ingested: {total_success}")
    print(f"     Errors / Failures:     {total_errors}")
    print(f"  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    # Automated semantic retrieval verification test
    if not args.dry_run and total_success > 0:
        test_queries = [
            "FTX Alameda collapse and bankruptcy bank run",
            "Spot Bitcoin ETF approval institutional inflows",
            "Kelly criterion optimal position sizing formula",
            "Exchange inflows and funding rate liquidations"
        ]
        verify_rag_search(supa_url, supa_key, api_key, test_queries)


if __name__ == "__main__":
    main()
