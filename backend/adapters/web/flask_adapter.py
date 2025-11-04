"""
Flask Web Adapter - Framework-specific HTTP layer
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from typing import Dict, Any, Tuple
from pathlib import Path
import uuid
import os

from core.models import BatchWorkflowRequest, WorkflowType
from core.services import DashboardService


class FlaskWebAdapter:
    """Flask-specific web adapter for the TES Dashboard"""
    
    def __init__(self, dashboard_service: DashboardService, config):
        self.dashboard_service = dashboard_service
        self.config = config
        self.app = Flask(__name__)
        
        print(f"DEBUG: Flask app created: {self.app}")
        
        # Configure Flask
        if config.secret_key:
            self.app.secret_key = config.secret_key
        
        # Configure CORS
        if config.cors_enabled:
            CORS(self.app, origins=config.cors_origins, 
                 supports_credentials=True,
                 allow_headers=['Content-Type', 'Authorization'],
                 methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
            print(f"DEBUG: CORS configured with origins: {config.cors_origins}")
            print(f"DEBUG: CORS allows all methods and credentials")
        
        # Register routes
        print("DEBUG: About to register routes...")
        self._register_routes()
        print(f"DEBUG: Routes registered. Total routes: {len(list(self.app.url_map.iter_rules()))}")
    
    def _register_routes(self):
        """Register all Flask routes"""
        
        @self.app.route('/debug_routes', methods=['GET'])
        def debug_routes():
            """Debug endpoint to list all routes"""
            routes = []
            for rule in self.app.url_map.iter_rules():
                routes.append({
                    'endpoint': rule.endpoint,
                    'methods': list(rule.methods),
                    'rule': str(rule)
                })
            return jsonify({'routes': routes})
        
        @self.app.route('/api/test_connection', methods=['GET'])
        def test_connection():
            """Test endpoint for connectivity"""
            return jsonify({
                'status': 'success',
                'message': 'Backend connection successful!',
                'timestamp': str(uuid.uuid4())[:8]
            })
        
        @self.app.route('/health', methods=['GET'])
        def health_check():
            """Health check endpoint for Docker and load balancers"""
            try:
                # Basic health check - verify the service is responding
                return jsonify({
                    'status': 'healthy',
                    'service': 'tes-dashboard',
                    'version': '1.0.0',
                    'timestamp': str(uuid.uuid4())[:8]
                }), 200
            except Exception as e:
                return jsonify({
                    'status': 'unhealthy',
                    'error': str(e),
                    'timestamp': str(uuid.uuid4())[:8]
                }), 503
        
        @self.app.route('/api/dashboard_data', methods=['GET'])
        def get_dashboard_data():
            """Get complete dashboard data (fast version for testing)"""
            try:
                print("DEBUG: Starting dashboard data request...")
                
                # Get simple data without external requests
                workflow_runs = self.dashboard_service.get_all_workflow_runs()
                individual_tasks = self.dashboard_service.get_all_individual_tasks()
                
                print(f"DEBUG: Found {len(workflow_runs)} workflow runs")
                print(f"DEBUG: Found {len(individual_tasks)} individual tasks")
                
                # Create mock TES instances for fast response
                mock_tes_instances = [
                    {
                        'name': 'TESK Production',
                        'url': 'https://tesk-prod.cloud.e-infra.cz',
                        'country': 'Czech Republic',
                        'status': 'healthy',
                        'task_count': 15
                    },
                    {
                        'name': 'TESK North America',
                        'url': 'https://tesk-na.cloud.e-infra.cz',
                        'country': 'Canada',
                        'status': 'healthy',
                        'task_count': 8
                    }
                ]
                
                # Convert tasks to dict format
                tasks_data = [task.to_dict() for task in individual_tasks]
                
                response_data = {
                    'tes_instances': mock_tes_instances,
                    'tes_gateway': self.config.tes.gateway_url,
                    'tasks': tasks_data,
                    'recent_tasks': tasks_data,  # Frontend expects recent_tasks
                    'workflow_runs': [run.to_dict() for run in workflow_runs],
                    'batch_runs': [run.to_dict() for run in workflow_runs],
                    'tes_locations': mock_tes_instances,
                    'latest_path': ['TESK Production'] if workflow_runs else [],
                    'connection_test': 'API working!',
                    'statistics': {
                        'total_tasks': len(tasks_data),
                        'total_workflows': len(workflow_runs),
                        'healthy_instances': 2,
                        'total_instances': 2
                    }
                }
                
                print("DEBUG: Dashboard data response ready")
                return jsonify(response_data)
                
            except Exception as e:
                print(f"DEBUG: Error in dashboard_data: {str(e)}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/tes_locations', methods=['GET'])
        def get_tes_locations():
            """Get TES instance locations"""
            try:
                instances = self.dashboard_service.get_tes_instances()
                return jsonify([inst.to_dict() for inst in instances])
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/batch_runs', methods=['GET'])
        def get_batch_runs():
            """Get all batch workflow runs"""
            try:
                runs = self.dashboard_service.get_all_workflow_runs()
                return jsonify([run.to_dict() for run in runs])
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/batch_log/<run_id>', methods=['GET'])
        def get_batch_log(run_id: str):
            """Get batch workflow log"""
            try:
                log_content = self.dashboard_service.get_workflow_log(run_id)
                if log_content is None:
                    return jsonify({'error': 'Log not found'}), 404
                
                return log_content, 200, {'Content-Type': 'text/plain'}
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/batch_nextflow', methods=['POST'])
        def submit_batch_nextflow():
            """Submit Nextflow batch workflow"""
            return self._handle_batch_submission(WorkflowType.NEXTFLOW)
        
        @self.app.route('/api/batch_snakemake', methods=['POST'])
        def submit_batch_snakemake():
            """Submit Snakemake batch workflow"""  
            return self._handle_batch_submission(WorkflowType.SNAKEMAKE)
        
        @self.app.route('/api/batch_cwl', methods=['POST'])
        def submit_batch_cwl():
            """Submit CWL batch workflow"""
            return self._handle_batch_submission(WorkflowType.CWL)
        
        @self.app.route('/api/submit_workflow', methods=['POST'])
        def submit_workflow():
            """Generic workflow submission endpoint for frontend compatibility"""
            try:
                # Get workflow type from form data
                workflow_type = request.form.get('workflow_type', '').lower()
                
                if workflow_type == 'nextflow':
                    return self._handle_batch_submission(WorkflowType.NEXTFLOW)
                elif workflow_type == 'snakemake':
                    return self._handle_batch_submission(WorkflowType.SNAKEMAKE)
                elif workflow_type == 'cwl':
                    return self._handle_batch_submission(WorkflowType.CWL)
                else:
                    return jsonify({'error': 'Invalid workflow type. Must be one of: nextflow, snakemake, cwl'}), 400
                    
            except Exception as e:
                return jsonify({'error': f'Error processing workflow submission: {str(e)}'}), 500
        
        @self.app.route('/api/latest_workflow_status', methods=['GET'])
        def get_latest_workflow_status():
            """Get latest workflow status for UI updates"""
            try:
                runs = self.dashboard_service.get_all_workflow_runs()
                individual_tasks = self.dashboard_service.get_all_individual_tasks()
                
                # Combine workflow runs and individual tasks
                all_workflows = []
                
                # Add batch workflow runs
                for run in runs:
                    all_workflows.append({
                        'id': run.run_id,
                        'type': 'batch',
                        'workflow_type': run.workflow_type.value,
                        'name': f"{run.workflow_type.value.upper()} Batch",
                        'status': run.status.value,
                        'tes_instance': run.tes_instance_name,
                        'submitted_at': run.submitted_at.isoformat() if run.submitted_at else None,
                        'mode': getattr(run, 'mode', 'unknown')
                    })
                
                # Add individual tasks as workflows
                for task in individual_tasks:
                    all_workflows.append({
                        'id': task.id,
                        'type': 'individual',
                        'workflow_type': 'task',
                        'name': task.task_name or task.name or 'Unknown Task',
                        'status': task.state or 'SUBMITTED',
                        'tes_instance': task.tes_instance or 'Unknown TES',
                        'submitted_at': task.creation_time.isoformat() if task.creation_time else None,
                        'tes_url': task.tes_url
                    })
                
                if not all_workflows:
                    return jsonify({
                        'currentStep': 0, 
                        'latestPath': [],
                        'allWorkflows': [],
                        'activeWorkflows': []
                    })
                
                # Get the latest workflow
                latest_workflow = max(all_workflows, key=lambda x: x['submitted_at'] or '1970-01-01')
                
                # Calculate current step based on status
                step_map = {
                    'SUBMITTED': 1,
                    'QUEUED': 2,
                    'RUNNING': 3,
                    'COMPLETED': 5,
                    'COMPLETE': 5,
                    'CANCELLED': 5,
                    'ERROR': 5,
                    'FAILED': 5
                }
                
                current_step = step_map.get(latest_workflow['status'], 0)
                latest_path = [latest_workflow['tes_instance']]
                
                # Filter active (running) workflows
                active_workflows = [w for w in all_workflows if w['status'] in ['SUBMITTED', 'QUEUED', 'RUNNING']]
                
                return jsonify({
                    'currentStep': current_step,
                    'latestPath': latest_path,
                    'allWorkflows': all_workflows,
                    'activeWorkflows': active_workflows,
                    'latestWorkflow': latest_workflow,
                    'totalWorkflows': len(all_workflows),
                    'runningCount': len([w for w in all_workflows if w['status'] == 'RUNNING']),
                    'completedCount': len([w for w in all_workflows if w['status'] in ['COMPLETED', 'COMPLETE']])
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/api/realtime_workflows', methods=['GET'])
        def get_realtime_workflows():
            """Get real-time workflow status with simulated progression"""
            import time
            import random
            from datetime import datetime, timedelta
            
            try:
                # Get current workflows
                runs = self.dashboard_service.get_all_workflow_runs()
                individual_tasks = self.dashboard_service.get_all_individual_tasks()
                
                current_time = datetime.now()
                realtime_workflows = []
                
                # Process batch workflows
                for run in runs:
                    # Simulate status progression based on time
                    age_seconds = (current_time - run.submitted_at).total_seconds() if run.submitted_at else 0
                    
                    simulated_status = run.status.value
                    progress = 0
                    
                    # Simulate workflow progression
                    if age_seconds > 10 and run.status.value == 'SUBMITTED':
                        simulated_status = 'RUNNING'
                        progress = min(int((age_seconds - 10) / 30 * 100), 95)  # Progress over 30 seconds
                    elif age_seconds > 40 and run.status.value in ['SUBMITTED', 'RUNNING']:
                        simulated_status = random.choice(['COMPLETED', 'COMPLETE'])
                        progress = 100
                    
                    realtime_workflows.append({
                        'id': run.run_id,
                        'type': 'batch',
                        'workflow_type': run.workflow_type.value,
                        'name': f"{run.workflow_type.value.upper()} Batch - {run.tes_instance_name}",
                        'status': simulated_status,
                        'original_status': run.status.value,
                        'tes_instance': run.tes_instance_name,
                        'tes_url': getattr(run, 'tes_url', None),
                        'submitted_at': run.submitted_at.isoformat() if run.submitted_at else None,
                        'progress': progress,
                        'estimated_completion': (current_time + timedelta(seconds=max(0, 40-age_seconds))).isoformat(),
                        'execution_time': int(age_seconds),
                        'coordinates': self._get_tes_coordinates(run.tes_instance_name)
                    })
                
                # Process individual tasks
                for task in individual_tasks:
                    # Simulate task progression
                    age_seconds = (current_time - task.creation_time).total_seconds() if task.creation_time else 0
                    
                    simulated_status = task.state or 'SUBMITTED'
                    progress = 0
                    
                    if age_seconds > 5 and task.state == 'SUBMITTED':
                        simulated_status = 'RUNNING'
                        progress = min(int((age_seconds - 5) / 20 * 100), 95)  # Progress over 20 seconds
                    elif age_seconds > 25:
                        simulated_status = random.choice(['COMPLETED', 'COMPLETE'])
                        progress = 100
                    
                    realtime_workflows.append({
                        'id': task.id,
                        'type': 'individual',
                        'workflow_type': 'task',
                        'name': f"Task: {task.task_name or task.name or 'Unknown'}",
                        'status': simulated_status,
                        'original_status': task.state,
                        'tes_instance': task.tes_instance or 'Unknown TES',
                        'tes_url': task.tes_url,
                        'submitted_at': task.creation_time.isoformat() if task.creation_time else None,
                        'progress': progress,
                        'estimated_completion': (current_time + timedelta(seconds=max(0, 25-age_seconds))).isoformat(),
                        'execution_time': int(age_seconds),
                        'coordinates': self._get_tes_coordinates(task.tes_instance or 'Unknown TES')
                    })
                
                # Sort by submission time (newest first)
                realtime_workflows.sort(key=lambda x: x['submitted_at'] or '1970-01-01', reverse=True)
                
                return jsonify({
                    'workflows': realtime_workflows,
                    'timestamp': current_time.isoformat(),
                    'active_count': len([w for w in realtime_workflows if w['status'] in ['SUBMITTED', 'RUNNING']]),
                    'completed_count': len([w for w in realtime_workflows if w['status'] in ['COMPLETED', 'COMPLETE']])
                })
                
            except Exception as e:
                return jsonify({'error': str(e)}), 500
        
        # Legacy endpoint routes for frontend compatibility
        @self.app.route('/submit', methods=['POST'])
        def submit_task():
            """Submit individual task (legacy endpoint for frontend compatibility)"""
            try:
                # Extract form data for basic task submission
                task_name = request.form.get('task_name', 'Unknown Task')
                tes_url = request.form.get('tes_url', 'https://tes.prodrun.cloud')
                description = request.form.get('description', f'Task submitted via frontend to {tes_url}')
                
                # Use business logic to submit and store the task
                task = self.dashboard_service.submit_individual_task(
                    task_name=task_name,
                    tes_url=tes_url,
                    description=description
                )
                
                result = {
                    'status': 'success',
                    'message': 'Task submitted successfully',
                    'task_id': task.id,
                    'task_name': task.task_name,
                    'tes_url': task.tes_url,
                    'submitted': True
                }
                
                return jsonify(result), 200
                
            except Exception as e:
                return jsonify({'error': f'Error submitting task: {str(e)}'}), 500
        
        @self.app.route('/task_details', methods=['GET'])
        def get_task_details():
            """Get task details (legacy endpoint)"""
            try:
                tes_url = request.args.get('tes_url')
                task_id = request.args.get('task_id')
                
                if not tes_url or not task_id:
                    return jsonify({'error': 'Missing tes_url or task_id parameter'}), 400
                
                result = {
                    'task_id': task_id,
                    'tes_url': tes_url,
                    'status': 'RUNNING',
                    'message': 'Task details retrieved'
                }
                
                return jsonify(result), 200
                
            except Exception as e:
                return jsonify({'error': f'Error getting task details: {str(e)}'}), 500
        
        @self.app.route('/cancel_task', methods=['POST'])
        def cancel_task():
            """Cancel a task (legacy endpoint)"""
            try:
                task_id = request.form.get('task_id')
                
                result = {
                    'status': 'success',
                    'message': f'Task {task_id} cancellation requested',
                    'task_id': task_id
                }
                
                return jsonify(result), 200
                
            except Exception as e:
                return jsonify({'error': f'Error cancelling task: {str(e)}'}), 500
        
        @self.app.route('/status', methods=['GET'])  
        def get_status():
            """Get application status"""
            try:
                result = {
                    'status': 'running',
                    'message': 'TES Dashboard is operational',
                    'architecture': 'clean-architecture',
                    'framework': 'flask'
                }
                return jsonify(result), 200
            except Exception as e:
                return jsonify({'error': f'Error getting status: {str(e)}'}), 500
    
    def _handle_batch_submission(self, workflow_type: WorkflowType) -> Tuple[Dict[str, Any], int]:
        """Handle batch workflow submission"""
        try:
            # Get form data
            batch_mode = request.form.get('batch_mode')
            if not batch_mode:
                return jsonify({'error': 'Batch mode is required'}), 400
            
            # Get workflow file
            workflow_file_key = {
                WorkflowType.NEXTFLOW: 'nextflow_file',
                WorkflowType.SNAKEMAKE: 'snakefile', 
                WorkflowType.CWL: 'cwl_file'
            }[workflow_type]
            
            workflow_file = request.files.get(workflow_file_key)
            if not workflow_file:
                return jsonify({'error': f'{workflow_type.value.title()} file is required'}), 400
            
            # Save uploaded files
            upload_dir = Path(self.config.storage.upload_dir)
            upload_dir.mkdir(exist_ok=True)
            
            workflow_file_path = upload_dir / f'batch_{uuid.uuid4()}_{workflow_file.filename}'
            workflow_file.save(str(workflow_file_path))
            
            # Get optional files
            config_file_path = None
            inputs_file_path = None
            
            if workflow_type == WorkflowType.NEXTFLOW:
                config_file = request.files.get('nextflow_config')
                if config_file and config_file.filename:
                    config_file_path = upload_dir / f'batch_{uuid.uuid4()}_{config_file.filename}'
                    config_file.save(str(config_file_path))
            
            elif workflow_type == WorkflowType.SNAKEMAKE:
                smk_dir = request.files.get('smk_dir')
                if smk_dir and smk_dir.filename:
                    config_file_path = upload_dir / f'batch_{uuid.uuid4()}_{smk_dir.filename}'
                    smk_dir.save(str(config_file_path))
            
            elif workflow_type == WorkflowType.CWL:
                inputs_file = request.files.get('inputs_file')
                if inputs_file and inputs_file.filename:
                    inputs_file_path = upload_dir / f'batch_{uuid.uuid4()}_{inputs_file.filename}'
                    inputs_file.save(str(inputs_file_path))
            
            # Get parameters
            parameters = {}
            if workflow_type == WorkflowType.NEXTFLOW:
                params_str = request.form.get('nextflow_params', '{}')
                try:
                    import json
                    parameters = json.loads(params_str)
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
            
            return jsonify(result.to_dict()), 200
            
        except Exception as e:
            return jsonify({'error': f'Error submitting batch workflow: {str(e)}'}), 500
        
        @self.app.route('/submit', methods=['POST'])
        def submit_task():
            """Submit individual task (legacy endpoint for frontend compatibility)"""
            try:
                # Extract form data
                form_data = request.form.to_dict()
                files = request.files
                
                # Get required fields
                task_name = form_data.get('task_name', 'Untitled Task')
                tes_url = form_data.get('tes_url')
                description = form_data.get('description', f'Task: {task_name}')
                
                if not tes_url:
                    return jsonify({'error': 'TES URL is required'}), 400
                
                # Use the dashboard service to properly submit and store the task
                task = self.dashboard_service.submit_individual_task(
                    task_name=task_name,
                    tes_url=tes_url,
                    description=description
                )
                
                result = {
                    'status': 'success',
                    'message': 'Task submitted successfully',
                    'task_id': task.id,
                    'task_name': task.task_name,
                    'tes_url': task.tes_url,
                    'state': task.state,
                    'submitted': True
                }
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({'error': f'Error submitting task: {str(e)}'}), 500
        
        @self.app.route('/task_details', methods=['GET'])
        def get_task_details():
            """Get task details"""
            try:
                tes_url = request.args.get('tes_url')
                task_id = request.args.get('task_id')
                
                if not tes_url or not task_id:
                    return jsonify({'error': 'Missing tes_url or task_id parameter'}), 400
                
                # Placeholder response for API compatibility
                result = {
                    'task_id': task_id,
                    'tes_url': tes_url,
                    'status': 'RUNNING',
                    'message': 'Task details retrieved'
                }
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({'error': f'Error getting task details: {str(e)}'}), 500
        
        @self.app.route('/cancel_task', methods=['POST'])
        def cancel_task():
            """Cancel a task"""
            try:
                task_id = request.form.get('task_id')
                
                result = {
                    'status': 'success',
                    'message': f'Task {task_id} cancellation requested',
                    'task_id': task_id
                }
                
                return jsonify(result)
                
            except Exception as e:
                return jsonify({'error': f'Error cancelling task: {str(e)}'}), 500
        
        @self.app.route('/status', methods=['GET'])
        def get_status():
            """Get application status"""
            try:
                result = {
                    'status': 'running',
                    'message': 'TES Dashboard is operational',
                    'architecture': 'clean-architecture',
                    'framework': 'flask'
                }
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': f'Error getting status: {str(e)}'}), 500
        
        @self.app.route('/list_tasks', methods=['GET'])
        def list_tasks():
            """List tasks"""
            try:
                result = {
                    'tasks': [],
                    'total': 0,
                    'message': 'Tasks retrieved successfully'
                }
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': f'Error listing tasks: {str(e)}'}), 500
        
        @self.app.route('/service_info', methods=['GET'])
        def get_service_info():
            """Get service information"""
            try:
                result = {
                    'name': 'TES Dashboard',
                    'version': '2.0.0',
                    'architecture': 'clean-architecture',
                    'framework': 'flask',
                    'status': 'operational'
                }
                return jsonify(result)
            except Exception as e:
                return jsonify({'error': f'Error getting service info: {str(e)}'}), 500
    
    def _get_tes_coordinates(self, tes_instance_name):
        """Get coordinates for a TES instance by name"""
        try:
            tes_instances = self.dashboard_service.get_tes_instances()
            for instance in tes_instances:
                if instance.name == tes_instance_name:
                    return {'lat': instance.lat, 'lon': instance.lon}
            
            # Default coordinates if not found
            return {'lat': 52.5200, 'lon': 13.4050}  # Berlin
        except:
            return {'lat': 52.5200, 'lon': 13.4050}
    
    def run(self, host: str = '0.0.0.0', port: int = 5001, debug: bool = None):
        """Run the Flask application"""
        if debug is None:
            debug = self.config.debug
        
        self.app.run(host=host, port=port, debug=debug)
