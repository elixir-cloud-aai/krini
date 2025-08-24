#!/bin/bash

# TES Dashboard Docker Build and Management Script
# Usage: ./docker-build.sh [build|run|stop|restart|logs|clean]

set -e

IMAGE_NAME="tes-dashboard"
CONTAINER_NAME="tes-dashboard-backend"
PORT="8080"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to build the Docker image
build_image() {
    print_status "Building Docker image: $IMAGE_NAME"
    
    if [ -f "Dockerfile.new" ]; then
        docker build -f Dockerfile.new -t "$IMAGE_NAME:latest" .
    else
        print_error "Dockerfile.new not found!"
        exit 1
    fi
    
    print_status "Build completed successfully!"
}

# Function to run the container
run_container() {
    print_status "Starting container: $CONTAINER_NAME"
    
    # Stop and remove existing container if it exists
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        print_warning "Existing container found. Stopping and removing..."
        docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true
    fi
    
    # Create necessary directories
    mkdir -p uploads work logs
    
    # Run the container
    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "$PORT:8080" \
        -v "$(pwd)/uploads:/app/uploads" \
        -v "$(pwd)/work:/app/work" \
        -v "$(pwd)/logs:/app/logs" \
        -e PORT=8080 \
        -e HOST=0.0.0.0 \
        --restart unless-stopped \
        "$IMAGE_NAME:latest"
    
    print_status "Container started successfully!"
    print_status "Application available at: http://localhost:$PORT"
    print_status "Health check: http://localhost:$PORT/health"
}

# Function to stop the container
stop_container() {
    print_status "Stopping container: $CONTAINER_NAME"
    
    if docker ps --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        docker stop "$CONTAINER_NAME"
        print_status "Container stopped successfully!"
    else
        print_warning "Container is not running."
    fi
}

# Function to restart the container
restart_container() {
    print_status "Restarting container: $CONTAINER_NAME"
    stop_container
    sleep 2
    run_container
}

# Function to show logs
show_logs() {
    print_status "Showing logs for container: $CONTAINER_NAME"
    
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        docker logs -f "$CONTAINER_NAME"
    else
        print_error "Container does not exist."
        exit 1
    fi
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove container
    if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true
        print_status "Container removed."
    fi
    
    # Remove image
    if docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^$IMAGE_NAME:latest$"; then
        docker rmi "$IMAGE_NAME:latest" > /dev/null 2>&1 || true
        print_status "Image removed."
    fi
    
    # Clean up Docker system
    docker system prune -f > /dev/null 2>&1 || true
    print_status "Docker system cleaned up."
}

# Function to show status
show_status() {
    print_status "Container status:"
    
    if docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -q "$CONTAINER_NAME"; then
        docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep "$CONTAINER_NAME"
    else
        print_warning "Container does not exist."
    fi
    
    echo ""
    print_status "Image information:"
    if docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}' | grep -q "$IMAGE_NAME"; then
        docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}' | grep "$IMAGE_NAME"
    else
        print_warning "Image does not exist."
    fi
}

# Function to run health check
health_check() {
    print_status "Running health check..."
    
    if command -v curl > /dev/null 2>&1; then
        if curl -f -s "http://localhost:$PORT/health" > /dev/null; then
            print_status "✓ Health check passed!"
            curl -s "http://localhost:$PORT/health" | python -m json.tool 2>/dev/null || echo "Health endpoint responded successfully"
        else
            print_error "✗ Health check failed!"
            exit 1
        fi
    else
        print_warning "curl not found. Install curl to run health checks."
    fi
}

# Main script logic
main() {
    check_docker
    
    case "${1:-help}" in
        build)
            build_image
            ;;
        run)
            run_container
            ;;
        stop)
            stop_container
            ;;
        restart)
            restart_container
            ;;
        logs)
            show_logs
            ;;
        clean)
            cleanup
            ;;
        status)
            show_status
            ;;
        health)
            health_check
            ;;
        help|*)
            echo "TES Dashboard Docker Management Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  build     - Build the Docker image"
            echo "  run       - Run the container"
            echo "  stop      - Stop the container"
            echo "  restart   - Restart the container"
            echo "  logs      - Show container logs (follow mode)"
            echo "  status    - Show container and image status"
            echo "  health    - Run health check"
            echo "  clean     - Clean up container and image"
            echo "  help      - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 build && $0 run    # Build and run"
            echo "  $0 logs               # Follow logs"
            echo "  $0 health             # Check if app is healthy"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
