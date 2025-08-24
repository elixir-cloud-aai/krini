"""
Unit tests for domain models - Framework-independent
"""

import pytest
from datetime import datetime
import uuid

from core.models import (
    WorkflowType, WorkflowStatus, TESInstance, WorkflowRun, 
    BatchWorkflowRequest, WorkflowExecutionResult
)


class TestWorkflowType:
    """Test WorkflowType enum"""
    
    def test_workflow_types(self):
        assert WorkflowType.NEXTFLOW.value == "nextflow"
        assert WorkflowType.SNAKEMAKE.value == "snakemake"
        assert WorkflowType.CWL.value == "cwl"


class TestWorkflowStatus:
    """Test WorkflowStatus enum"""
    
    def test_workflow_statuses(self):
        assert WorkflowStatus.SUBMITTED.value == "SUBMITTED"
        assert WorkflowStatus.RUNNING.value == "RUNNING"
        assert WorkflowStatus.COMPLETE.value == "COMPLETE"
        assert WorkflowStatus.ERROR.value == "ERROR"


class TestTESInstance:
    """Test TESInstance domain model"""
    
    def test_create_tes_instance(self):
        instance = TESInstance(
            name="test-tes",
            endpoint="https://test.tes.org",
            location="Test Location",
            latitude=45.0,
            longitude=-90.0,
            description="Test TES instance"
        )
        
        assert instance.name == "test-tes"
        assert instance.endpoint == "https://test.tes.org"
        assert instance.location == "Test Location"
        assert instance.latitude == 45.0
        assert instance.longitude == -90.0
        assert instance.description == "Test TES instance"
    
    def test_tes_instance_to_dict(self):
        instance = TESInstance(
            name="test-tes",
            endpoint="https://test.tes.org",
            location="Test Location",
            latitude=45.0,
            longitude=-90.0
        )
        
        data = instance.to_dict()
        
        assert data['name'] == "test-tes"
        assert data['endpoint'] == "https://test.tes.org"
        assert data['location'] == "Test Location"
        assert data['latitude'] == 45.0
        assert data['longitude'] == -90.0
    
    def test_tes_instance_from_dict(self):
        data = {
            'name': "test-tes",
            'endpoint': "https://test.tes.org",
            'location': "Test Location",
            'latitude': 45.0,
            'longitude': -90.0,
            'description': "Test instance"
        }
        
        instance = TESInstance.from_dict(data)
        
        assert instance.name == "test-tes"
        assert instance.endpoint == "https://test.tes.org"
        assert instance.latitude == 45.0
        assert instance.longitude == -90.0


class TestWorkflowRun:
    """Test WorkflowRun domain model"""
    
    def test_create_workflow_run(self):
        run_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        run = WorkflowRun(
            run_id=run_id,
            workflow_type=WorkflowType.NEXTFLOW,
            status=WorkflowStatus.RUNNING,
            tes_instance_name="test-tes",
            start_time=timestamp,
            workflow_file_path="/path/to/workflow.nf",
            parameters={"param1": "value1"}
        )
        
        assert run.run_id == run_id
        assert run.workflow_type == WorkflowType.NEXTFLOW
        assert run.status == WorkflowStatus.RUNNING
        assert run.tes_instance_name == "test-tes"
        assert run.start_time == timestamp
        assert run.parameters == {"param1": "value1"}
    
    def test_workflow_run_serialization(self):
        run_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        run = WorkflowRun(
            run_id=run_id,
            workflow_type=WorkflowType.NEXTFLOW,
            status=WorkflowStatus.COMPLETE,
            tes_instance_name="test-tes",
            start_time=timestamp,
            end_time=timestamp,
            workflow_file_path="/path/to/workflow.nf"
        )
        
        # Test to_dict
        data = run.to_dict()
        assert data['run_id'] == run_id
        assert data['workflow_type'] == 'nextflow'
        assert data['status'] == 'COMPLETE'
        
        # Test from_dict
        restored_run = WorkflowRun.from_dict(data)
        assert restored_run.run_id == run_id
        assert restored_run.workflow_type == WorkflowType.NEXTFLOW
        assert restored_run.status == WorkflowStatus.COMPLETE


class TestBatchWorkflowRequest:
    """Test BatchWorkflowRequest domain model"""
    
    def test_create_batch_request(self):
        request = BatchWorkflowRequest(
            workflow_type=WorkflowType.NEXTFLOW,
            mode="distributed",
            workflow_file_path="/path/to/workflow.nf",
            config_file_path="/path/to/nextflow.config",
            parameters={"cpus": 4, "memory": "8GB"}
        )
        
        assert request.workflow_type == WorkflowType.NEXTFLOW
        assert request.mode == "distributed"
        assert request.workflow_file_path == "/path/to/workflow.nf"
        assert request.config_file_path == "/path/to/nextflow.config"
        assert request.parameters["cpus"] == 4
    
    def test_batch_request_serialization(self):
        request = BatchWorkflowRequest(
            workflow_type=WorkflowType.CWL,
            mode="single",
            workflow_file_path="/path/to/workflow.cwl",
            inputs_file_path="/path/to/inputs.yml"
        )
        
        data = request.to_dict()
        assert data['workflow_type'] == 'cwl'
        assert data['mode'] == 'single'
        
        restored_request = BatchWorkflowRequest.from_dict(data)
        assert restored_request.workflow_type == WorkflowType.CWL
        assert restored_request.mode == "single"


class TestWorkflowExecutionResult:
    """Test WorkflowExecutionResult domain model"""
    
    def test_create_execution_result(self):
        run_id = str(uuid.uuid4())
        
        result = WorkflowExecutionResult(
            success=True,
            run_id=run_id,
            message="Workflow submitted successfully",
            tes_instance="test-tes",
            details={"task_count": 5}
        )
        
        assert result.success is True
        assert result.run_id == run_id
        assert result.message == "Workflow submitted successfully"
        assert result.tes_instance == "test-tes"
        assert result.details["task_count"] == 5
    
    def test_execution_result_failure(self):
        result = WorkflowExecutionResult(
            success=False,
            message="Workflow submission failed",
            error="Connection timeout",
            details={"error_code": 500}
        )
        
        assert result.success is False
        assert result.message == "Workflow submission failed"
        assert result.error == "Connection timeout"
        assert result.run_id is None
    
    def test_execution_result_serialization(self):
        run_id = str(uuid.uuid4())
        
        result = WorkflowExecutionResult(
            success=True,
            run_id=run_id,
            message="Success",
            tes_instance="test-tes"
        )
        
        data = result.to_dict()
        assert data['success'] is True
        assert data['run_id'] == run_id
        
        restored_result = WorkflowExecutionResult.from_dict(data)
        assert restored_result.success is True
        assert restored_result.run_id == run_id


if __name__ == '__main__':
    pytest.main([__file__])
