"""
FastAPI Web Adapter - Alternative framework implementation
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional, List
from pathlib import Path
import uuid
import json

from core.models import BatchWorkflowRequest, WorkflowType
from core.services import DashboardService


class FastAPIWebAdapter:
    """FastAPI-specific web adapter for the TES Dashboard"""
    
    def __init__(self, dashboard_service: DashboardService, config):
        self.dashboard_service = dashboard_service
        self.config = config
        self.app = FastAPI(
            title="TES Dashboard API",
            description="Framework-agnostic TES Dashboard with FastAPI",
            version="1.0.0"
        )
        
        # Configure CORS
        if config.cors_enabled:
            self.app.add_middleware(
                CORSMiddleware,
                allow_origins=config.cors_origins,
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )
        
        # Register routes
        self._register_routes()
    
    def _register_routes(self):
        """Register all FastAPI routes"""
        
        @self.app.get("/api/test_connection")
        async def test_connection():
            """Test endpoint for connectivity"""
            return {
                'status': 'success',
                'message': 'Backend connection successful!',
                'timestamp': str(uuid.uuid4())[:8]
            }
        
        @self.app.get("/api/dashboard_data")
        async def get_dashboard_data():
            """Get complete dashboard data"""
            try:
                topology_data = self.dashboard_service.get_topology_data()
                workflow_runs = self.dashboard_service.get_all_workflow_runs()
                tes_instances = self.dashboard_service.get_tes_instances()
                
                # Convert to API format
                latest_path = []
                if workflow_runs:
                    latest_run = workflow_runs[-1]
                    latest_path = [latest_run.tes_instance_name]
                
                return {
                    'tes_instances': [inst.to_dict() for inst in tes_instances],
                    'tes_gateway': self.config.tes.gateway_url,
                    'tasks': [],  # Legacy field
                    'workflow_runs': [],  # Legacy field 
                    'batch_runs': [run.to_dict() for run in workflow_runs],
                    'tes_locations': [inst.to_dict() for inst in tes_instances],
                    'latest_path': latest_path,
                    'connection_test': 'API working!'
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/tes_locations")
        async def get_tes_locations():
            """Get TES instance locations"""
            try:
                instances = self.dashboard_service.get_tes_instances()
                return [inst.to_dict() for inst in instances]
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/batch_runs")
        async def get_batch_runs():
            """Get all batch workflow runs"""
            try:
                runs = self.dashboard_service.get_all_workflow_runs()
                return [run.to_dict() for run in runs]
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/batch_log/{run_id}", response_class=PlainTextResponse)
        async def get_batch_log(run_id: str):
            """Get batch workflow log"""
            try:
                log_content = self.dashboard_service.get_workflow_log(run_id)
                if log_content is None:
                    raise HTTPException(status_code=404, detail="Log not found")
                
                return log_content
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.post("/api/batch_nextflow")
        async def submit_batch_nextflow(
            batch_mode: str = Form(...),
            nextflow_file: UploadFile = File(...),
            nextflow_config: Optional[UploadFile] = File(None),
            nextflow_params: str = Form("{}")
        ):
            """Submit Nextflow batch workflow"""
            return await self._handle_batch_submission(
                WorkflowType.NEXTFLOW,
                batch_mode=batch_mode,
                workflow_file=nextflow_file,
                config_file=nextflow_config,
                parameters_str=nextflow_params
            )
        
        @self.app.post("/api/batch_snakemake")
        async def submit_batch_snakemake(
            batch_mode: str = Form(...),
            snakefile: UploadFile = File(...),
            smk_dir: Optional[UploadFile] = File(None)
        ):
            """Submit Snakemake batch workflow"""
            return await self._handle_batch_submission(
                WorkflowType.SNAKEMAKE,
                batch_mode=batch_mode,
                workflow_file=snakefile,
                config_file=smk_dir
            )
        
        @self.app.post("/api/batch_cwl")
        async def submit_batch_cwl(
            batch_mode: str = Form(...),
            cwl_file: UploadFile = File(...),
            inputs_file: Optional[UploadFile] = File(None)
        ):
            """Submit CWL batch workflow"""
            return await self._handle_batch_submission(
                WorkflowType.CWL,
                batch_mode=batch_mode,
                workflow_file=cwl_file,
                inputs_file=inputs_file
            )
        
        @self.app.get("/api/latest_workflow_status")
        async def get_latest_workflow_status():
            """Get latest workflow status for UI updates"""
            try:
                runs = self.dashboard_service.get_all_workflow_runs()
                if not runs:
                    return {'currentStep': 0, 'latestPath': []}
                
                latest_run = runs[-1]
                
                step_map = {
                    'SUBMITTED': 0,
                    'RUNNING': 3,
                    'COMPLETE': 5,
                    'CANCELLED': 5,
                    'ERROR': 5,
                    'FAILED': 5
                }
                
                current_step = step_map.get(latest_run.status.value, 0)
                latest_path = [latest_run.tes_instance_name]
                
                return {
                    'currentStep': current_step,
                    'latestPath': latest_path
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
    
    async def _handle_batch_submission(
        self, 
        workflow_type: WorkflowType, 
        batch_mode: str,
        workflow_file: UploadFile,
        config_file: Optional[UploadFile] = None,
        inputs_file: Optional[UploadFile] = None,
        parameters_str: str = "{}"
    ) -> Dict[str, Any]:
        """Handle batch workflow submission"""
        try:
            if not workflow_file:
                raise HTTPException(status_code=400, detail=f"{workflow_type.value.title()} file is required")
            
            # Save uploaded files
            upload_dir = Path(self.config.storage.upload_dir)
            upload_dir.mkdir(exist_ok=True)
            
            # Save workflow file
            workflow_file_path = upload_dir / f'batch_{uuid.uuid4()}_{workflow_file.filename}'
            with open(workflow_file_path, 'wb') as f:
                content = await workflow_file.read()
                f.write(content)
            
            # Save optional files
            config_file_path = None
            if config_file and config_file.filename:
                config_file_path = upload_dir / f'batch_{uuid.uuid4()}_{config_file.filename}'
                with open(config_file_path, 'wb') as f:
                    content = await config_file.read()
                    f.write(content)
            
            inputs_file_path = None
            if inputs_file and inputs_file.filename:
                inputs_file_path = upload_dir / f'batch_{uuid.uuid4()}_{inputs_file.filename}'
                with open(inputs_file_path, 'wb') as f:
                    content = await inputs_file.read()
                    f.write(content)
            
            # Parse parameters
            parameters = {}
            try:
                parameters = json.loads(parameters_str)
            except json.JSONDecodeError:
                parameters = {}
            
            # Create batch request
            batch_request = BatchWorkflowRequest(
                workflow_type=workflow_type,
                mode=batch_mode,
                workflow_file_path=str(workflow_file_path),
                config_file_path=str(config_file_path) if config_file_path else None,
                inputs_file_path=str(inputs_file_path) if inputs_file_path else None,
                parameters=parameters
            )
            
            # Execute workflow
            result = self.dashboard_service.submit_batch_workflow(batch_request)
            
            return result.to_dict()
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f'Error submitting batch workflow: {str(e)}')
