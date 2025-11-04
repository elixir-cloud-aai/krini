"""
Application Factory - Framework-agnostic application creation
"""

import os
from typing import Union, Optional
from pathlib import Path

from core.config import Config
from core.services import DashboardService, TESClientService, WorkflowExecutionService, NetworkTopologyService
from core.repositories import FileWorkflowRepository, StaticTESInstanceRepository, FileTaskRepository
from adapters.web.flask_adapter import FlaskWebAdapter

# Optional FastAPI import
try:
    from adapters.web.fastapi_adapter import FastAPIWebAdapter
except ImportError:
    FastAPIWebAdapter = None


class ApplicationFactory:
    """Factory for creating framework-agnostic applications"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config = Config.from_environment(config_path)
        self._dashboard_service = None
    
    def _create_services(self) -> DashboardService:
        """Create and wire all business logic services"""
        if self._dashboard_service:
            return self._dashboard_service
        
        # Create repositories with absolute paths
        # Get the directory where this script is located (backend directory)
        backend_dir = Path(__file__).parent.absolute()
        
        # Use backend directory as the base for all relative paths
        upload_dir = self.config.storage.upload_dir
        if not os.path.isabs(upload_dir):
            upload_dir = str(backend_dir / upload_dir)
        
        base_dir = Path(upload_dir).parent
        
        workflow_repo = FileWorkflowRepository(
            storage_path=str(base_dir)
        )
        
        tes_instance_repo = StaticTESInstanceRepository(
            str(base_dir / self.config.tes.locations_file)
        )
        
        task_repo = FileTaskRepository(
            storage_path=str(base_dir)
        )
        
        # Main dashboard service
        self._dashboard_service = DashboardService(
            workflow_repo=workflow_repo,
            tes_repo=tes_instance_repo,
            task_repo=task_repo,
            upload_dir=upload_dir
        )
        
        return self._dashboard_service
    
    def create_flask_app(self):
        """Create Flask web application"""
        dashboard_service = self._create_services()
        flask_adapter = FlaskWebAdapter(dashboard_service, self.config)
        return flask_adapter.app
    
    def create_fastapi_app(self):
        """Create FastAPI web application"""
        if FastAPIWebAdapter is None:
            raise ImportError("FastAPI not installed. Install with: pip install fastapi uvicorn")
        
        dashboard_service = self._create_services()
        fastapi_adapter = FastAPIWebAdapter(dashboard_service, self.config)
        return fastapi_adapter.app
    
    def create_app(self, framework: str = 'flask'):
        """Create web application with specified framework"""
        framework = framework.lower()
        
        if framework == 'flask':
            return self.create_flask_app()
        elif framework == 'fastapi':
            return self.create_fastapi_app()
        else:
            raise ValueError(f"Unsupported framework: {framework}")


def create_app(framework: Optional[str] = None, config_path: Optional[str] = None):
    """Factory function to create application"""
    if framework is None:
        framework = os.getenv('WEB_FRAMEWORK', 'flask')
    
    factory = ApplicationFactory(config_path)
    return factory.create_app(framework)
