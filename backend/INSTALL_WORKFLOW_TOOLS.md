# Workflow Tools Installation Guide

This guide helps you install the required workflow tools for the TES Dashboard.

## Prerequisites

Make sure you have Python 3.7+ and pip installed.

## Installation Commands

### 1. CWL-TES (for CWL workflows)

```bash
# Install cwl-tes
pip install cwl-tes

# Verify installation
cwl-tes --version
```

### 2. Snakemake (for Snakemake workflows)

```bash
# Install snakemake
pip install snakemake

# Verify installation
snakemake --version
```

### 3. Nextflow (for Nextflow workflows)

```bash
# Install Nextflow
curl -s https://get.nextflow.io | bash

# Move to a directory in your PATH (optional)
sudo mv nextflow /usr/local/bin/

# Verify installation
nextflow --version
```

## Alternative Installation Methods

### Using Conda (recommended for Snakemake)

```bash
# Create a new conda environment
conda create -n tes-dashboard python=3.9

# Activate the environment
conda activate tes-dashboard

# Install snakemake
conda install -c bioconda -c conda-forge snakemake

# Install cwl-tes
pip install cwl-tes
```

### Using Docker (for Nextflow)

```bash
# Pull Nextflow Docker image
docker pull nextflow/nextflow

# Run Nextflow using Docker
docker run nextflow/nextflow --version
```

## Troubleshooting

### Common Issues

1. **"command not found" errors**
   - Make sure the tools are installed and in your PATH
   - Try restarting your terminal after installation

2. **Permission errors**
   - Use `sudo` for system-wide installation
   - Or install in user space with `pip install --user`

3. **Version conflicts**
   - Use virtual environments to isolate dependencies
   - Check compatibility with your Python version

### Verification

After installation, verify all tools work:

```bash
# Check all tools
cwl-tes --version
snakemake --version
nextflow --version
```

## Environment Setup

Make sure your environment variables are set correctly in your `.env` file:

```bash
FUNNEL_SERVER_USER=your_username
FUNNEL_SERVER_PASSWORD=your_password
TES_TOKEN=your_token
```

## Support

If you encounter issues:

1. Check the tool's official documentation
2. Verify your Python version compatibility
3. Ensure all dependencies are installed
4. Check your system's PATH configuration 