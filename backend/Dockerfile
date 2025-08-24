# Use Python 3.10 for cwl-tes compatibility
FROM python:3.9-slim

# Install system dependencies including Java and development headers
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-21-jre-headless \
        curl \
        git \
        build-essential \
        procps \
        libxml2-dev \
        libxslt-dev \
        python3-dev \
        zlib1g-dev \
        libbz2-dev \
        libreadline-dev \
        libsqlite3-dev \
        libssl-dev \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy requirements and install Python dependencies with increased timeout and retries
COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel
RUN pip install --timeout=300 --retries=5 Cython
RUN pip uninstall -y pulp && pip install --no-cache-dir --force-reinstall 'pulp==2.6.0'
RUN pip install --timeout=300 --retries=5 --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# FINAL: Force Nextflow install after all other steps with better permissions
RUN rm -f /usr/local/bin/nextflow /usr/bin/nextflow && \
    curl -s https://get.nextflow.io | bash && \
    chmod 755 nextflow && \
    mv nextflow /usr/local/bin/nextflow && \
    chown root:root /usr/local/bin/nextflow && \
    ln -sf /usr/local/bin/nextflow /usr/bin/nextflow && \
    /usr/local/bin/nextflow -version

# Add user-level pip bin and /usr/local/bin to PATH
ENV PATH="/root/.local/bin:/usr/local/bin:/usr/bin:$PATH"

# Set Nextflow home directory to a writable location and create it with proper permissions
ENV NXF_HOME=/app/.nextflow
RUN mkdir -p /app/.nextflow && chmod 777 /app/.nextflow

# (Optional) Print nextflow version for debug and verify it works - with retry on failure
RUN NXF_HOME=/app/.nextflow /usr/local/bin/nextflow -version || \
    (sleep 5 && NXF_HOME=/app/.nextflow /usr/local/bin/nextflow -version) || \
    (sleep 10 && NXF_HOME=/app/.nextflow /usr/local/bin/nextflow -version) || \
    echo "Warning: Nextflow version check failed during build, but executable is installed"

# Fix permissions for all Nextflow framework files to be readable by any user
RUN chmod -R 755 /app/.nextflow 2>/dev/null || true && \
    find /app/.nextflow -type f -exec chmod 644 {} \; 2>/dev/null || true

# Fix permissions for uploads directory and other writable directories for non-root users
RUN mkdir -p /app/uploads /app/work && \
    chmod -R 777 /app/uploads /app/work && \
    find /app -name "*.json" -exec chmod 666 {} \; 2>/dev/null || true

# Entrypoint script for runtime PATH debug
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose Flask port
EXPOSE 5000

# Set environment variables for Flask
ENV FLASK_APP=tes_dashboard.py
ENV FLASK_RUN_HOST=0.0.0.0

# Entrypoint
CMD ["/entrypoint.sh"] 