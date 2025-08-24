"""
Service Layer - Framework-agnostic business logic
"""

import uuid
import os
import subprocess
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from ..models import (
    WorkflowRun, WorkflowType, WorkflowStatus, TESInstance, TESInstanceStatus,
    BatchWorkflowRequest, WorkflowExecutionResult, NetworkTopologyData,
    Credentials, Task
)
from ..repositories import WorkflowRepository, TESInstanceRepository, TaskRepository


class TESClientService:
    """Service for interacting with TES instances"""
    
    def __init__(self):
        self.session_timeout = 30
    
    def get_instance_credentials(self, instance_name: str, instance_url: str) -> Credentials:
        """Get credentials for a specific TES instance"""
        # Default credentials from environment
        default_user = os.getenv('FUNNEL_SERVER_USER')
        default_pass = os.getenv('FUNNEL_SERVER_PASSWORD')
        default_token = os.getenv('TES_TOKEN')
        
        # Instance-specific overrides
        if 'tesk-prod.cloud.e-infra.cz' in instance_url:
            return Credentials(
                user=os.getenv('TESK_PROD_USER', default_user),
                password=os.getenv('TESK_PROD_PASSWORD', default_pass),
                token=os.getenv('TESK_PROD_TOKEN', default_token)
            )
        elif 'tesk-na' in instance_url:
            return Credentials(
                user=os.getenv('TESK_NA_USER', default_user),
                password=os.getenv('TESK_NA_PASSWORD', default_pass),
                token=os.getenv('TESK_NA_TOKEN', default_token)
            )
        
        return Credentials(
            user=default_user,
            password=default_pass,
            token=default_token
        )
    
    def list_tasks(self, instance: TESInstance) -> List[Task]:
        """List tasks from a TES instance"""
        import requests
        
        headers = {
            'accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        credentials = self.get_instance_credentials(instance.name, instance.url)
        auth = None
        if credentials.user and credentials.password:
            auth = (credentials.user, credentials.password)
        
        try:
            response = requests.get(
                f"{instance.url}/tasks",
                headers=headers,
                auth=auth,
                timeout=self.session_timeout
            )
            
            if response.status_code == 200:
                data = response.json()
                tasks = []
                for task_data in data.get('tasks', []):
                    task = Task(
                        id=task_data['id'],
                        name=task_data.get('name'),
                        state=task_data.get('state'),
                        description=task_data.get('description'),
                        tes_instance=instance.name
                    )
                    tasks.append(task)
                return tasks
            else:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
                
        except Exception as e:
            raise Exception(f"Failed to list tasks from {instance.name}: {str(e)}")
    
    def get_task_details(self, instance: TESInstance, task_id: str) -> Optional[Task]:
        """Get details for a specific task"""
        import requests
        
        headers = {
            'accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        credentials = self.get_instance_credentials(instance.name, instance.url)
        auth = None
        if credentials.user and credentials.password:
            auth = (credentials.user, credentials.password)
        
        try:
            response = requests.get(
                f"{instance.url}/tasks/{task_id}",
                headers=headers,
                auth=auth,
                timeout=self.session_timeout
            )
            
            if response.status_code == 200:
                task_data = response.json()
                return Task(
                    id=task_data['id'],
                    name=task_data.get('name'),
                    state=task_data.get('state'),
                    description=task_data.get('description'),
                    tes_instance=instance.name
                )
            else:
                return None
                
        except Exception:
            return None


class WorkflowExecutionService:
    """Service for executing workflows"""
    
    def __init__(self, workflow_repo: WorkflowRepository, tes_repo: TESInstanceRepository, upload_dir: str):
        self.workflow_repo = workflow_repo
        self.tes_repo = tes_repo
        self.upload_dir = Path(upload_dir)
        self.gateway_url = os.getenv('TES_GATEWAY', 'http://localhost:8080/')
    
    def execute_batch_workflow(self, request: BatchWorkflowRequest) -> WorkflowExecutionResult:
        """Execute a batch workflow across TES instances"""
        
        run_ids = []
        
        if request.mode == 'all':
            # Execute on all TES instances
            instances = self.tes_repo.get_all_instances()
            for instance in instances:
                run_id = self._execute_single_workflow(request, instance)
                if run_id:
                    run_ids.append(run_id)
        
        elif request.mode == 'gateway':
            # Execute via TES Gateway
            run_id = self._execute_gateway_workflow(request)
            if run_id:
                run_ids.append(run_id)
        
        else:
            return WorkflowExecutionResult(
                run_ids=[],
                total_count=0,
                message="Invalid batch mode",
                success=False,
                error_message="Invalid batch mode specified"
            )
        
        return WorkflowExecutionResult(
            run_ids=run_ids,
            total_count=len(run_ids),
            message=f"Batch {request.workflow_type.value} workflow submitted successfully",
            success=True
        )
    
    def _execute_single_workflow(self, request: BatchWorkflowRequest, instance: TESInstance) -> Optional[str]:
        """Execute workflow on a single TES instance"""
        run_id = str(uuid.uuid4())
        log_file = self.upload_dir / f"batch_{run_id}.log"
        
        # Create demo log for immediate feedback
        with open(log_file, 'w') as f:
            f.write(f"Demo: Batch {request.workflow_type.value} workflow {run_id} started on {instance.name}\\n")
            f.write(f"TES Instance: {instance.url}\\n")
            f.write(f"Workflow file: {Path(request.workflow_file_path).name}\\n")
            if request.config_file_path:
                f.write(f"Config file: {Path(request.config_file_path).name}\\n")
            if request.inputs_file_path:
                f.write(f"Inputs file: {Path(request.inputs_file_path).name}\\n")
            f.write(f"Parameters: {request.parameters}\\n")
            f.write(f"Status: SUBMITTED\\n")
            f.write("This is a demo run - actual execution would happen here.\\n")
        
        # Create workflow run record
        workflow_run = WorkflowRun(
            run_id=run_id,
            workflow_type=request.workflow_type,
            status=WorkflowStatus.SUBMITTED,
            tes_instance_name=instance.name,
            submitted_at=datetime.now(),
            mode=request.mode,
            log_file_path=str(log_file),
            parameters=request.parameters,
            files={'workflow_file': request.workflow_file_path}
        )
        
        # Save to repository
        self.workflow_repo.save_workflow_run(workflow_run)
        
        return run_id
    
    def _execute_gateway_workflow(self, request: BatchWorkflowRequest) -> Optional[str]:
        """Execute workflow via TES Gateway"""
        run_id = str(uuid.uuid4())
        log_file = self.upload_dir / f"batch_{run_id}.log"
        
        # Create demo log for immediate feedback
        with open(log_file, 'w') as f:
            f.write(f"Demo: Federated {request.workflow_type.value} workflow {run_id} started via TES Gateway\\n")
            f.write(f"TES Gateway: {self.gateway_url}\\n")
            f.write(f"Workflow file: {Path(request.workflow_file_path).name}\\n")
            if request.config_file_path:
                f.write(f"Config file: {Path(request.config_file_path).name}\\n")
            if request.inputs_file_path:
                f.write(f"Inputs file: {Path(request.inputs_file_path).name}\\n")
            f.write(f"Parameters: {request.parameters}\\n")
            f.write(f"Status: SUBMITTED\\n")
            f.write("This is a demo run - actual execution would happen here.\\n")
        
        # Create workflow run record
        workflow_run = WorkflowRun(
            run_id=run_id,
            workflow_type=request.workflow_type,
            status=WorkflowStatus.SUBMITTED,
            tes_instance_name='TES Gateway',
            submitted_at=datetime.now(),
            mode=request.mode,
            log_file_path=str(log_file),
            parameters=request.parameters,
            files={'workflow_file': request.workflow_file_path}
        )
        
        # Save to repository
        self.workflow_repo.save_workflow_run(workflow_run)
        
        return run_id
    
    def get_workflow_log(self, run_id: str) -> Optional[str]:
        """Get workflow execution log"""
        return self.workflow_repo.get_workflow_log(run_id)


class NetworkTopologyService:
    """Service for network topology data"""
    
    def __init__(self, tes_repo: TESInstanceRepository, workflow_repo: WorkflowRepository):
        self.tes_repo = tes_repo
        self.workflow_repo = workflow_repo
        self.tes_client = TESClientService()
    
    def get_topology_data(self) -> NetworkTopologyData:
        """Get complete network topology data"""
        
        # Get all TES instances
        instances = self.tes_repo.get_all_instances()
        
        # Update instance statuses
        for instance in instances:
            try:
                tasks = self.tes_client.list_tasks(instance)
                instance.status = TESInstanceStatus.HEALTHY
                instance.task_count = len(tasks)
                instance.last_checked = datetime.now()
                instance.latency = self._calculate_latency(instance)
            except Exception as e:
                instance.status = TESInstanceStatus.ERROR
                instance.task_count = 0
                instance.error_message = str(e)
                instance.latency = 0
        
        # Get workflow paths
        workflow_paths = self.workflow_repo.get_all_workflow_runs()
        
        # Create gateway info
        gateway_info = {
            'name': 'TES Gateway',
            'url': os.getenv('TES_GATEWAY', 'http://localhost:8080/'),
            'lat': 50.1109,  # Frankfurt - Central Europe
            'lon': 8.6821,
            'status': 'healthy'
        }
        
        # Calculate statistics
        statistics = {
            'total_instances': len(instances),
            'healthy_instances': len([i for i in instances if i.status == TESInstanceStatus.HEALTHY]),
            'total_workflows': len(workflow_paths),
            'active_workflows': len([w for w in workflow_paths if w.status == WorkflowStatus.RUNNING]),
            'geographic_coverage': len(set(i.country for i in instances if i.country))
        }
        
        return NetworkTopologyData(
            instances=instances,
            workflow_paths=workflow_paths,
            gateway_info=gateway_info,
            statistics=statistics
        )
    
    def _calculate_latency(self, instance: TESInstance) -> int:
        """Calculate simulated latency for instance"""
        # In a real implementation, this would ping the instance
        import random
        return random.randint(20, 100)


class DashboardService:
    """Main dashboard service orchestrating all operations"""
    
    def __init__(
        self, 
        workflow_repo: WorkflowRepository,
        tes_repo: TESInstanceRepository,
        task_repo: TaskRepository,
        upload_dir: str
    ):
        self.workflow_execution_service = WorkflowExecutionService(workflow_repo, tes_repo, upload_dir)
        self.topology_service = NetworkTopologyService(tes_repo, workflow_repo)
        self.tes_client_service = TESClientService()
        self.workflow_repo = workflow_repo
        self.tes_repo = tes_repo
        self.task_repo = task_repo
    
    def submit_batch_workflow(self, request: BatchWorkflowRequest) -> WorkflowExecutionResult:
        """Submit a batch workflow for execution"""
        return self.workflow_execution_service.execute_batch_workflow(request)
    
    def get_all_workflow_runs(self) -> List[WorkflowRun]:
        """Get all workflow runs"""
        return self.workflow_repo.get_all_workflow_runs()
    
    def get_workflow_log(self, run_id: str) -> Optional[str]:
        """Get workflow log content"""
        return self.workflow_execution_service.get_workflow_log(run_id)
    
    def get_topology_data(self) -> NetworkTopologyData:
        """Get network topology data"""
        return self.topology_service.get_topology_data()
    
    def get_tes_instances(self) -> List[TESInstance]:
        """Get all TES instances"""
        return self.tes_repo.get_all_instances()
    
    def list_tasks(self, instance_name: str) -> List[Task]:
        """List tasks from a specific TES instance"""
        instance = self.tes_repo.get_instance_by_name(instance_name)
        if not instance:
            raise ValueError(f"TES instance not found: {instance_name}")
        
        return self.tes_client_service.list_tasks(instance)
    
    def submit_individual_task(self, task_name: str, tes_url: str, description: str = None) -> Task:
        """Submit an individual task and store it locally"""
        from datetime import datetime
        
        task_id = str(uuid.uuid4())
        
        # Find the TES instance by URL for the name
        tes_instance_name = "Custom TES"
        instances = self.tes_repo.get_all_instances()
        for instance in instances:
            if instance.url == tes_url:
                tes_instance_name = instance.name
                break
        
        task = Task(
            id=task_id,
            name=task_name,
            task_name=task_name,
            state="SUBMITTED",
            description=description or f"Individual task submitted to {tes_url}",
            creation_time=datetime.now(),
            tes_instance=tes_instance_name,
            tes_url=tes_url
        )
        
        # Store the task locally
        self.task_repo.save_task(task)
        
        return task
    
    def get_all_individual_tasks(self) -> List[Task]:
        """Get all submitted individual tasks"""
        return self.task_repo.get_all_tasks()
    
    def get_individual_task(self, task_id: str) -> Optional[Task]:
        """Get a specific individual task"""
        return self.task_repo.get_task(task_id)
    
    def update_task_status(self, task_id: str, status: str) -> bool:
        """Update task status"""
        return self.task_repo.update_task_status(task_id, status)
