# Docker Integration for CWL and Snakemake Workflows

## Overview

The TES Dashboard has been updated to run CWL and Snakemake workflows inside Docker containers instead of requiring these tools to be installed locally on the host system.

## Changes Made

### 1. Removed Local Tool Dependencies
- **Before**: Dashboard checked for `cwl-tes`, `snakemake`, and `nextflow` to be installed locally
- **After**: All workflow tools run inside the Docker container

### 2. Added Docker Integration Functions
- **New Function**: `run_in_docker(cmd, env_vars=None, volumes=None)`
- **Purpose**: Constructs Docker commands with proper environment variables and volume mounts
- **Usage**: All workflow submissions now use this function

### 3. Updated Workflow Submission Functions

#### CWL Workflows (`submit_workflow`)
```python
# Before: Direct command execution
cmd = ['cwl-tes', '--tes', tes_url, '--user', user, '--password', password, cwl_path, cwl_input_path]

# After: Docker command construction
cwl_cmd = ['cwl-tes', '--tes', tes_url, '--user', user, '--password', password, 
           '/app/uploads/' + os.path.basename(cwl_path), '/app/uploads/' + os.path.basename(cwl_input_path)]
cmd = run_in_docker(cwl_cmd, docker_env, volumes)
```

#### Snakemake Workflows (`submit_workflow` and `batch_snakemake`)
```python
# Before: Direct command execution
cmd = ['snakemake', '--snakefile', snakefile_path, '--tes', tes_url, ...]

# After: Docker command construction
snakemake_cmd = ['snakemake', '--snakefile', '/app/uploads/' + os.path.basename(snakefile_path), '--tes', tes_url, ...]
cmd = run_in_docker(snakemake_cmd, docker_env, volumes)
```

#### Nextflow Workflows (`submit_workflow` and `batch_nextflow`)
```python
# Before: Direct command execution
cmd = ['nextflow', 'run', nextflow_path, '-profile', 'tes', ...]

# After: Docker command construction
nextflow_cmd = ['nextflow', 'run', '/app/uploads/' + os.path.basename(nextflow_path), '-profile', 'tes', ...]
cmd = run_in_docker(nextflow_cmd, docker_env, volumes)
```

### 4. Volume Mounting
- **Host Path**: `app.config['UPLOAD_FOLDER']` (uploads directory)
- **Container Path**: `/app/uploads`
- **Purpose**: Share uploaded workflow files between host and container

### 5. Environment Variables
- **TES_URL**: Target TES instance URL
- **FUNNEL_SERVER_USER**: Authentication username
- **FUNNEL_SERVER_PASSWORD**: Authentication password
- **CWLTES_EXTRA_HEADERS**: Additional headers for CWL-TES (when using gateway)

### 6. Updated Debug Functions
- **`debug_env`**: Now tests tools inside Docker container
- **`api_debug`**: Includes storage locations for flow visualization

## Benefits

### 1. Consistent Environment
- All users get the same tool versions
- No local installation required
- Reproducible workflow execution

### 2. Isolation
- Workflow execution isolated from host system
- No conflicts with local tool installations
- Clean environment for each workflow run

### 3. Portability
- Dashboard can run on any system with Docker
- No need to install Python packages locally
- Easy deployment and scaling

### 4. Security
- Workflows run in contained environment
- Limited access to host system
- Controlled resource usage

## Requirements

### Docker Setup
1. **Docker Engine**: Must be running on the host system
2. **Docker Image**: `tes-dashboard:latest` must be built
3. **Permissions**: Docker daemon must be accessible

### File Structure
```
/app/uploads/          # Container path for workflow files
├── workflow.cwl       # CWL workflow files
├── input.yml          # CWL input files
├── Snakefile          # Snakemake files
├── main.nf            # Nextflow files
└── results/           # Output directories
```

## Usage

### Building the Docker Image
```bash
docker build -t tes-dashboard .
```

### Running the Dashboard
```bash
python tes_dashboard.py
```

### Testing Docker Integration
```bash
python test_docker_integration.py
```

## Troubleshooting

### Common Issues

1. **Docker Image Not Found**
   ```bash
   docker build -t tes-dashboard .
   ```

2. **Permission Denied**
   ```bash
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. **Volume Mount Issues**
   - Ensure uploads directory exists
   - Check file permissions
   - Verify absolute paths

4. **Tool Not Found in Container**
   - Check Dockerfile for tool installation
   - Verify PATH environment variable
   - Test with `docker run --rm tes-dashboard:latest tool --version`

### Debug Commands

```bash
# Test Docker image
docker run --rm tes-dashboard:latest nextflow -version
docker run --rm tes-dashboard:latest snakemake --version
docker run --rm tes-dashboard:latest cwl-tes --version

# Test volume mounting
docker run --rm -v $(pwd)/uploads:/app/uploads tes-dashboard:latest ls /app/uploads

# Test environment variables
docker run --rm -e TEST_VAR=value tes-dashboard:latest bash -c 'echo $TEST_VAR'
```

## Future Enhancements

1. **Multi-container Support**: Run different workflows in separate containers
2. **Resource Limits**: Add CPU/memory limits for workflow containers
3. **Persistent Storage**: Use Docker volumes for better data persistence
4. **Container Orchestration**: Support for Kubernetes/Docker Swarm
5. **Custom Images**: Allow users to specify custom workflow images 