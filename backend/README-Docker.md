# TES Dashboard Backend - Docker Setup

This directory contains the dockerized TES (Task Execution Service) Dashboard backend application.

## 🐳 Quick Start with Docker

### Prerequisites
- Docker installed on your system
- Docker Compose (optional, for easier management)

### Option 1: Using Docker Compose (Recommended)

1. **Build and run the application:**
   ```bash
   docker-compose up --build
   ```

2. **Run in background:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f tes-dashboard
   ```

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker directly

1. **Build the Docker image:**
   ```bash
   docker build -f Dockerfile.new -t tes-dashboard:latest .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name tes-dashboard \
     -p 8080:8080 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/work:/app/work \
     -v $(pwd)/logs:/app/logs \
     tes-dashboard:latest
   ```

3. **Check container logs:**
   ```bash
   docker logs -f tes-dashboard
   ```

4. **Stop the container:**
   ```bash
   docker stop tes-dashboard
   docker rm tes-dashboard
   ```

## 🏗️ Docker Files Overview

### `Dockerfile.new`
- **Multi-stage build** for optimized image size
- **Non-root user** for better security
- **Health checks** for monitoring
- **Proper dependency management** with cached layers
- **Nextflow integration** with proper permissions

### `docker-compose.yml`
- **Service orchestration** for easy management
- **Volume mounts** for persistent data
- **Health checks** and restart policies
- **Network configuration**
- **Optional nginx proxy** (use with `--profile with-proxy`)

### `.dockerignore`
- Excludes unnecessary files from Docker build context
- Reduces build time and image size
- Prevents sensitive files from being included

## 📊 Monitoring and Health Checks

### Health Check Endpoint
The application provides a health check endpoint at:
```
GET /health
```

Response format:
```json
{
  "status": "healthy",
  "service": "tes-dashboard",
  "version": "1.0.0",
  "timestamp": "12345678"
}
```

### Docker Health Check
The container includes built-in health checks that run every 30 seconds:
```bash
# Check container health status
docker ps
# or
docker-compose ps
```

## 🔧 Configuration

### Environment Variables
The application supports the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port to run the application |
| `HOST` | `0.0.0.0` | Host to bind the application |
| `WEB_FRAMEWORK` | `flask` | Web framework (flask/fastapi) |
| `DEBUG` | `false` | Enable debug mode |
| `FLASK_ENV` | `production` | Flask environment |

### Volume Mounts
- `/app/uploads` - File uploads and temporary data
- `/app/work` - Nextflow working directory
- `/app/logs` - Application logs

## 🚀 Production Deployment

### With Reverse Proxy (Nginx)
```bash
# Run with nginx proxy
docker-compose --profile with-proxy up -d
```

This will:
- Start the TES Dashboard on port 8080 (internal)
- Start nginx on port 80 (external)
- Provide load balancing and SSL termination capabilities

### Scaling
```bash
# Scale the application (requires load balancer)
docker-compose up --scale tes-dashboard=3 -d
```

### Resource Limits
Add resource limits to docker-compose.yml:
```yaml
services:
  tes-dashboard:
    # ... other config ...
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Change port in docker-compose.yml or use:
   docker-compose up --scale tes-dashboard=0 -d
   docker-compose up --scale tes-dashboard=1 -d
   ```

2. **Permission issues with volumes:**
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 uploads/ work/ logs/
   ```

3. **Nextflow not working:**
   ```bash
   # Check Nextflow installation in container
   docker exec -it tes-dashboard nextflow -version
   ```

4. **Container won't start:**
   ```bash
   # Check logs for errors
   docker-compose logs tes-dashboard
   ```

### Debugging
Enter the running container:
```bash
# Using docker-compose
docker-compose exec tes-dashboard bash

# Using docker
docker exec -it tes-dashboard bash
```

Check application status:
```bash
# Test health endpoint
curl http://localhost:8080/health

# Test API endpoints
curl http://localhost:8080/api/test_connection
```

## 📁 Directory Structure
```
backend/
├── Dockerfile.new          # Optimized Dockerfile
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Docker ignore file
├── requirements.txt        # Python dependencies
├── main.py                 # Application entry point
├── app_factory.py          # Application factory
├── uploads/                # File uploads (mounted)
├── work/                   # Nextflow work directory (mounted)
├── logs/                   # Application logs (mounted)
└── ...                     # Other application files
```

## 🔒 Security Considerations

1. **Non-root user**: Container runs as non-root user for security
2. **Minimal base image**: Uses slim Python image
3. **Multi-stage build**: Reduces attack surface
4. **Health checks**: Enable monitoring and auto-recovery
5. **Volume separation**: Sensitive data in separate volumes

## 📝 Development

### Development with Docker
```bash
# Development mode with code reload
docker run -it --rm \
  -p 8080:8080 \
  -v $(pwd):/app \
  -e DEBUG=true \
  -e FLASK_ENV=development \
  tes-dashboard:latest
```

### Building for Different Architectures
```bash
# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -f Dockerfile.new -t tes-dashboard:latest .
```

## 📞 Support
For issues and questions:
1. Check the troubleshooting section above
2. Review container logs
3. Check the main application documentation
4. File an issue in the project repository
