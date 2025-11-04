"""
Domain Models - Framework-agnostic data structures
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class WorkflowType(Enum):
    NEXTFLOW = "nextflow"
    SNAKEMAKE = "snakemake"
    CWL = "cwl"


class WorkflowStatus(Enum):
    SUBMITTED = "SUBMITTED"
    RUNNING = "RUNNING"
    COMPLETE = "COMPLETE"
    CANCELLED = "CANCELLED"
    ERROR = "ERROR"
    FAILED = "FAILED"


class TESInstanceStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass
class Credentials:
    """Authentication credentials for TES instances"""
    user: Optional[str] = None
    password: Optional[str] = None
    token: Optional[str] = None


@dataclass
class TESInstance:
    """TES Instance domain model"""
    name: str
    url: str
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    ip: Optional[str] = None
    status: TESInstanceStatus = TESInstanceStatus.UNKNOWN
    task_count: int = 0
    last_checked: Optional[datetime] = None
    latency: int = 0
    error_message: Optional[str] = None
    credentials: Optional[Credentials] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'name': self.name,
            'url': self.url,
            'country': self.country,
            'lat': self.lat,
            'lon': self.lon,
            'ip': self.ip,
            'status': self.status.value,
            'task_count': self.task_count,
            'last_checked': self.last_checked.isoformat() if self.last_checked else None,
            'latency': self.latency,
            'error_message': self.error_message
        }


@dataclass
class Task:
    """TES Task domain model"""
    id: str
    name: Optional[str] = None
    state: Optional[str] = None
    description: Optional[str] = None
    creation_time: Optional[datetime] = None
    tes_instance: Optional[str] = None
    task_name: Optional[str] = None
    tes_url: Optional[str] = None
    end_time: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'task_id': self.id,
            'id': self.id,
            'name': self.name,
            'task_name': self.task_name or self.name,
            'state': self.state,
            'status': self.state,
            'description': self.description,
            'creation_time': self.creation_time.isoformat() if self.creation_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'tes_instance': self.tes_instance,
            'tes_name': self.tes_instance,
            'tes_url': self.tes_url,
            'type': 'individual'
        }


@dataclass
class WorkflowRun:
    """Workflow execution domain model"""
    run_id: str
    workflow_type: WorkflowType
    status: WorkflowStatus
    tes_instance_name: str
    submitted_at: datetime
    mode: str  # 'all', 'gateway', 'single'
    log_file_path: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)
    files: Dict[str, str] = field(default_factory=dict)  # filename -> path mapping
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'run_id': self.run_id,
            'workflow_type': self.workflow_type.value,
            'status': self.status.value,
            'tes_instance_name': self.tes_instance_name,
            'submitted_at': self.submitted_at.isoformat(),
            'mode': self.mode,
            'log_file_path': self.log_file_path,
            'parameters': self.parameters,
            'files': self.files
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'WorkflowRun':
        return cls(
            run_id=data['run_id'],
            workflow_type=WorkflowType(data['workflow_type']),
            status=WorkflowStatus(data['status']),
            tes_instance_name=data.get('tes_instance_name', data.get('tes_name', 'Unknown TES')),
            submitted_at=datetime.fromisoformat(data['submitted_at']),
            mode=data['mode'],
            log_file_path=data.get('log_file_path', data.get('log_file')),
            parameters=data.get('parameters', {}),
            files=data.get('files', {})
        )


@dataclass
class BatchWorkflowRequest:
    """Request model for batch workflow submission"""
    workflow_type: WorkflowType
    mode: str  # 'all', 'gateway'
    workflow_file_path: str
    config_file_path: Optional[str] = None
    inputs_file_path: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowExecutionResult:
    """Result of workflow execution"""
    run_ids: List[str]
    total_count: int
    message: str
    success: bool = True
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            'run_ids': self.run_ids,
            'count': self.total_count,
            'message': self.message,
            'success': self.success
        }
        if self.error_message:
            result['error'] = self.error_message
        return result


@dataclass
class NetworkTopologyData:
    """Network topology visualization data"""
    instances: List[TESInstance]
    workflow_paths: List[WorkflowRun]
    gateway_info: Dict[str, Any]
    statistics: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'instances': [inst.to_dict() for inst in self.instances],
            'workflow_paths': [wf.to_dict() for wf in self.workflow_paths],
            'gateway_info': self.gateway_info,
            'statistics': self.statistics
        }
