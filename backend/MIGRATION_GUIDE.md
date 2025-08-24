# Migration Guide: From Monolithic to Clean Architecture

## Overview
This migration transforms the monolithic Flask app into a framework-agnostic clean architecture.

## Architecture Changes

### Before (Monolithic)
```
app.py (4,788 lines)
├── Flask routes
├── Business logic
├── Data access
└── Framework coupling
```

### After (Clean Architecture)
```
backend/
├── core/
│   ├── models/          # Domain models
│   ├── services/        # Business logic
│   ├── repositories/    # Data access
│   └── config.py        # Configuration
├── adapters/
│   └── web/
│       ├── flask_adapter.py    # Flask-specific
│       └── fastapi_adapter.py  # FastAPI alternative
├── app_factory.py       # Application factory
└── main.py             # Entry point
```

## Migration Steps

### 1. Backup Original Code
```bash
python -c "from migration_utils import backup_original_app; backup_original_app()"
```

### 2. Install New Dependencies
```bash
pip install -r requirements_new.txt
```

### 3. Set Up Environment
```bash
# Copy generated .env file to your environment
cp .env.example .env
# Edit .env with your specific configuration
```

### 4. Start New Application
```bash
# Using Flask (default)
python main.py

# Using FastAPI (set environment variable)
WEB_FRAMEWORK=fastapi python main.py
```

## Benefits

### Framework Independence
- Business logic separated from web framework
- Easy migration between Flask/FastAPI/Django
- Testable business services

### Clean Architecture
- Domain models in `core/models`
- Business logic in `core/services` 
- Data access in `core/repositories`
- Web adapters in `adapters/web`

### Improved Maintainability
- Single responsibility principle
- Dependency injection
- Separation of concerns
- Easier testing

## Compatibility

### API Compatibility
All existing API endpoints maintained:
- `/api/dashboard_data`
- `/api/batch_runs`
- `/api/batch_log/{run_id}`
- `/api/batch_nextflow`
- `/api/batch_snakemake`
- `/api/batch_cwl`

### Frontend Compatibility
No frontend changes required - all API contracts preserved.

## Testing

### Unit Tests
```bash
# Test business logic (framework-independent)
pytest tests/core/

# Test web adapters
pytest tests/adapters/
```

### Integration Tests
```bash
# Test complete application
pytest tests/integration/
```

## Rollback Plan

1. Stop new application
2. Restore original `app.py` from backup
3. Install original requirements
4. Start original application

## Framework Migration Examples

### Flask to FastAPI
```bash
# Change environment variable
export WEB_FRAMEWORK=fastapi
python main.py
```

### Add New Framework
1. Create adapter in `adapters/web/new_framework_adapter.py`
2. Update `app_factory.py`
3. Test with existing business logic

## Configuration Management

### Environment Variables
- `WEB_FRAMEWORK`: Choose framework (flask/fastapi)
- `TES_GATEWAY_URL`: TES gateway endpoint
- `UPLOAD_DIR`: File upload directory
- `CORS_ORIGINS`: Allowed CORS origins

### Framework-Specific Settings
- Flask: Uses Flask configuration
- FastAPI: Uses Pydantic settings
- Both: Share core business configuration

## Monitoring and Logging

### Structured Logging
```python
import logging
logger = logging.getLogger(__name__)
logger.info("Business operation completed", extra={"workflow_id": "123"})
```

### Health Checks
- `/api/test_connection` - Basic connectivity
- Business service health via dependency injection

## Support

### Documentation
- Core models: `backend/core/models/__init__.py`
- Business services: `backend/core/services/__init__.py`
- Repository pattern: `backend/core/repositories/__init__.py`

### Debugging
1. Enable debug logging: `export LOG_LEVEL=DEBUG`
2. Check business logic: Services are framework-independent
3. Check web layer: Framework-specific adapters

## Future Enhancements

### Easy Framework Addition
1. Create new adapter: `adapters/web/django_adapter.py`
2. Update factory: Add Django option
3. Business logic remains unchanged

### Microservices Migration
- Extract services: `TESClientService` → separate microservice
- Add HTTP repository: Replace file-based storage
- Maintain API contracts: Frontend unchanged

