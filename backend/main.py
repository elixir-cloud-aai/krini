"""
Framework-Agnostic TES Dashboard Application
Main entry point with dependency injection and clean architecture
"""

import os
import logging
from pathlib import Path

# Import the application factory
from app_factory import create_app


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dashboard.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def main():
    """Main application entry point"""
    # Get framework from environment (Flask by default for backward compatibility)
    framework = os.getenv('WEB_FRAMEWORK', 'flask').lower()
    port = int(os.getenv('PORT', 8080))
    host = os.getenv('HOST', '0.0.0.0')
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    
    logger.info(f"Starting TES Dashboard with {framework.upper()} framework")
    logger.info(f"Server will run on {host}:{port}")
    
    try:
        # Create application using factory pattern
        app = create_app(framework=framework)
        
        if framework == 'flask':
            # Flask-specific server startup
            app.run(host=host, port=port, debug=debug)
            
        elif framework == 'fastapi':
            # FastAPI-specific server startup
            import uvicorn
            uvicorn.run(app, host=host, port=port, log_level='info' if not debug else 'debug')
            
        else:
            raise ValueError(f"Unsupported framework: {framework}")
            
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise


if __name__ == '__main__':
    main()
