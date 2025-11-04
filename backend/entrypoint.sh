#!/bin/bash
set -e

# Set Nextflow home directory to a writable location
export NXF_HOME=/app/.nextflow
mkdir -p $NXF_HOME
chmod 777 $NXF_HOME 2>/dev/null || true

echo "=== Container Startup Diagnostics ==="
echo "PATH at runtime: $PATH"
echo "User: $(whoami) (UID: $(id -u))"
echo "Working directory: $(pwd)"
echo "NXF_HOME: $NXF_HOME"

echo "=== Testing Nextflow Installation ==="
# Run our comprehensive Nextflow test
python3 /app/test_nextflow.py

echo "=== Starting TES Dashboard ==="
exec python tes_dashboard.py 