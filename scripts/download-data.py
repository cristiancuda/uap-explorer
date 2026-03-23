"""
download-data.py

Downloads the NUFORC UFO sightings dataset from Kaggle using kagglehub,
then copies scrubbed.csv to server/data/raw/ for processing.

Usage:
    python scripts/download-data.py
    npm run download

Credentials: kagglehub picks up ~/.kaggle/kaggle.json automatically.
If not present, it will prompt for KAGGLE_USERNAME and KAGGLE_KEY env vars
or guide you to https://www.kaggle.com/settings to generate an API token.
"""

import sys
import os
import shutil

# ── check kagglehub is available ─────────────────────────────────────────────
try:
    import kagglehub
except ImportError:
    print("Error: kagglehub is not installed.")
    print("Install it with:  pip install kagglehub")
    sys.exit(1)

DATASET   = "camnugent/ufo-sightings-around-the-world"
DEST_DIR  = os.path.join(os.path.dirname(__file__), "..", "server", "data", "raw")
DEST_FILE = os.path.join(DEST_DIR, "scrubbed.csv")

print(f"Downloading dataset: {DATASET}")
print("(kagglehub will use ~/.kaggle/kaggle.json or KAGGLE_USERNAME/KAGGLE_KEY env vars)\n")

try:
    path = kagglehub.dataset_download(DATASET)
except Exception as e:
    msg = str(e)
    print(f"Download failed: {msg}\n")

    if "credentials" in msg.lower() or "401" in msg or "403" in msg or "unauthorized" in msg.lower():
        print("Authentication required. To fix:")
        print("  1. Go to https://www.kaggle.com/settings → API → Create New Token")
        print("  2. Save the downloaded kaggle.json to ~/.kaggle/kaggle.json")
        print("  3. Run:  chmod 600 ~/.kaggle/kaggle.json")
        print("  Or set env vars: KAGGLE_USERNAME and KAGGLE_KEY")
    sys.exit(1)

print(f"Downloaded to: {path}")

# Locate the CSV — Kaggle has shipped this dataset under different filenames.
# Prefer scrubbed.csv; accept ufo_sighting_data.csv or any *.csv as fallback.
PREFERRED = ["scrubbed.csv", "ufo_sighting_data.csv"]

def find_csv(base):
    for name in PREFERRED:
        p = os.path.join(base, name)
        if os.path.exists(p):
            return p
    # Fall back to first *.csv found (one level deep)
    for entry in os.listdir(base):
        full = os.path.join(base, entry)
        if os.path.isfile(full) and full.endswith(".csv"):
            return full
        if os.path.isdir(full):
            for sub in os.listdir(full):
                if sub.endswith(".csv"):
                    return os.path.join(full, sub)
    return None

src = find_csv(path)
if not src:
    print(f"Error: no CSV found in downloaded dataset at {path}")
    print("Files present:", os.listdir(path))
    sys.exit(1)

print(f"Using source file: {os.path.basename(src)}")

os.makedirs(DEST_DIR, exist_ok=True)
shutil.copy(src, DEST_FILE)

size_mb = os.path.getsize(DEST_FILE) / 1024 / 1024
print(f"Copied to: {DEST_FILE} ({size_mb:.1f} MB)")
print("\nNext step: npm run process")
