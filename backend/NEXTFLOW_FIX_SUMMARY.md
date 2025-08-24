# Nextflow Permission Issue Fixes

## Problem
The Nextflow executable in the Docker container has permission issues:
```
bash: /usr/local/bin/nextflow: Permission denied
```

## Root Cause
The Nextflow binary was installed with incorrect permissions and the Python code was relying on PATH resolution which may fail in container environments.

## Fixes Applied

### 1. Updated Dockerfile ✅
- **File**: `Dockerfile`
- **Changes**:
  - Added Java version verification during build
  - Improved Nextflow installation with explicit permissions (chmod 755)
  - Added proper ownership (chown root:root)
  - Added procps package for better process management
  - Used absolute paths for Nextflow verification during build

### 2. Enhanced Entrypoint Script ✅
- **File**: `entrypoint.sh`
- **Changes**: 
  - Added comprehensive Nextflow testing via Python script
  - Better diagnostics for container startup
  - More detailed error reporting

### 3. Created Nextflow Test Script ✅
- **File**: `test_nextflow.py`
- **Purpose**: Comprehensive testing of Nextflow installation
- **Features**:
  - Tests PATH resolution
  - Checks file permissions
  - Tests Java availability
  - Attempts actual Nextflow execution
  - Provides detailed diagnostics

### 4. Updated Python Code ✅
- **File**: `tes_dashboard.py`
- **Changes**:
  - Replaced all subprocess calls from `'nextflow'` to `'/usr/local/bin/nextflow'`
  - Used absolute paths to avoid PATH resolution issues
  - Lines modified: 3132, 3257, 4057, 4100

### 5. Created Rebuild Script ✅
- **File**: `rebuild_container.sh`
- **Purpose**: Easy container rebuild and testing

## Next Steps

1. **Rebuild the Container**:
   ```bash
   cd /Users/keshavdayal/Desktop/pacificanalytics/elixir-cloud-demos/demos/2025-elixir-on-cloud/backend
   ./rebuild_container.sh
   ```

2. **Test the Container**:
   ```bash
   docker run -d --name tes-dashboard -p 8080:5000 keshxvdayal/tes-dashboard:latest
   docker logs -f tes-dashboard
   ```

3. **Verify Nextflow Works**:
   - Check the container logs for the test_nextflow.py output
   - Look for "✅ Nextflow is working correctly" message
   - Test workflow submission through the web interface

## Expected Container Startup Output

```
=== Container Startup Diagnostics ===
PATH at runtime: /root/.local/bin:/usr/local/bin:/usr/bin:...
User: root (UID: 0)
Working directory: /app
=== Testing Nextflow Installation ===
=== Testing Java Installation ===
Java version return code: 0
=== Testing nextflow --version ===
Return code: 0
✅ Nextflow version command successful
=== Summary ===
Java: ✅
Nextflow: ✅
=== Starting TES Dashboard ===
```

## Verification Commands

To verify fixes in running container:
```bash
docker exec tes-dashboard /usr/local/bin/nextflow -version
docker exec tes-dashboard ls -l /usr/local/bin/nextflow
docker exec tes-dashboard python3 /app/test_nextflow.py
```
