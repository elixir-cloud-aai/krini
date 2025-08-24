"""
Configuration Management - Framework-agnostic settings
"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv


@dataclass
class DatabaseConfig:
    """Database configuration"""
    connection_string: Optional[str] = None
    timeout: int = 30
    

@dataclass 
class StorageConfig:
    """File storage configuration"""
    upload_dir: str = "uploads"
    batch_runs_file: str = "batch_runs.json"
    workflow_runs_file: str = "workflow_runs.json"
    tes_locations_file: str = "tes_instance_locations.json"


@dataclass
class TESConfig:
    """TES service configuration"""
    gateway_url: str = "https://tes.prodrun.cloud"
    client_cert: Optional[str] = None
    client_key: Optional[str] = None
    locations_file: str = "tes_instance_locations.json"
    default_user: Optional[str] = None
    default_password: Optional[str] = None
    default_token: Optional[str] = None
    timeout: int = 30


@dataclass
class AppConfig:
    """Main application configuration"""
    debug: bool = False
    cors_enabled: bool = True
    cors_origins: list = None
    secret_key: Optional[str] = None
    database: DatabaseConfig = None
    storage: StorageConfig = None  
    tes: TESConfig = None
    
    def __post_init__(self):
        if self.cors_origins is None:
            # Allow all localhost ports for development
            self.cors_origins = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]
        if self.database is None:
            self.database = DatabaseConfig()
        if self.storage is None:
            self.storage = StorageConfig()
        if self.tes is None:
            self.tes = TESConfig()


def clean_env_value(value: str) -> str:
    """Clean environment variable values"""
    if not value:
        return value
    # Remove inline comments (everything after #)
    if '#' in value:
        value = value.split('#')[0]
    # Remove quotes and extra whitespace
    value = value.strip().strip('"').strip("'")
    return value


def load_config(env_file: Optional[str] = None) -> AppConfig:
    """Load configuration from environment and .env file"""
    
    if env_file:
        env_file_path = Path(env_file)
    else:
        env_file_path = Path(__file__).parent.parent.parent / '.env'
    
    # Load environment variables from .env file
    if env_file_path.exists():
        load_dotenv(env_file_path)
    
    # Storage configuration
    storage_config = StorageConfig(
        upload_dir=os.getenv('UPLOAD_DIR', 'uploads'),
        batch_runs_file=os.getenv('BATCH_RUNS_FILE', 'batch_runs.json'),
        workflow_runs_file=os.getenv('WORKFLOW_RUNS_FILE', 'workflow_runs.json'),
        tes_locations_file=os.getenv('TES_LOCATIONS_FILE', 'tes_instance_locations.json')
    )
    
    # TES configuration
    tes_config = TESConfig(
        gateway_url=clean_env_value(os.getenv('TES_GATEWAY_URL', 'https://tes.prodrun.cloud')),
        client_cert=clean_env_value(os.getenv('TES_CLIENT_CERT', 'client-cert.pem')),
        client_key=clean_env_value(os.getenv('TES_CLIENT_KEY', 'client-key.pem')),
        locations_file=clean_env_value(os.getenv('TES_LOCATIONS_FILE', 'tes_instance_locations.json')),
        default_user=clean_env_value(os.getenv('FUNNEL_SERVER_USER')),
        default_password=clean_env_value(os.getenv('FUNNEL_SERVER_PASSWORD')),
        default_token=clean_env_value(os.getenv('TES_TOKEN')),
        timeout=int(os.getenv('TES_TIMEOUT', '30'))
    )
    
    # Database configuration
    database_config = DatabaseConfig(
        connection_string=os.getenv('DATABASE_URL'),
        timeout=int(os.getenv('DB_TIMEOUT', '30'))
    )
    
    # Main app configuration
    return AppConfig(
        debug=os.getenv('DEBUG', 'False').lower() == 'true',
        cors_enabled=os.getenv('CORS_ENABLED', 'True').lower() == 'true',
        cors_origins=os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001').split(','),
        secret_key=os.getenv('SECRET_KEY'),
        database=database_config,
        storage=storage_config,
        tes=tes_config
    )


# Convenience alias
Config = AppConfig
Config.from_environment = classmethod(lambda cls, env_file=None: load_config(env_file))
