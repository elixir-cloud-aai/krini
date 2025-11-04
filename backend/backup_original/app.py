import os
os.environ['PATH'] = '/usr/local/bin:/usr/bin:' + os.environ.get('PATH', '')
from flask import Flask, request, redirect, url_for, flash, send_from_directory, send_file, session
from dotenv import load_dotenv
from pathlib import Path
import requests
import subprocess
import uuid
import json
from flask_cors import CORS

env_file_path = Path(__file__).parent / '.env'
print(f"=== DEBUG: .env file path: {env_file_path} ===")
print(f"=== DEBUG: .env file exists: {env_file_path.exists()} ===")
if env_file_path.exists():
    print(f"=== DEBUG: .env file size: {env_file_path.stat().st_size} bytes ===")
    with open(env_file_path, 'r') as f:
        print("=== DEBUG: .env file contents (first 5 lines): ===")
        for i, line in enumerate(f):
            if i < 5:
                print(f"  Line {i+1}: {line.strip()}")
            else:
                break
else:
    print("=== DEBUG: .env file NOT FOUND! ===")

load_dotenv(env_file_path)

# Function to clean environment variable values
def clean_env_value(value):
    if not value:
        return value
    # Remove inline comments (everything after #)
    if '#' in value:
        value = value.split('#')[0]
    # Remove quotes and extra whitespace
    value = value.strip().strip('"').strip("'")
    return value

# Function to get instance-specific credentials
def get_instance_credentials(instance_name, instance_url):
    """Get credentials specific to a TES instance"""
    # Default credentials
    default_user = FUNNEL_SERVER_USER
    default_pass = FUNNEL_SERVER_PASSWORD
    default_token = TES_TOKEN
    
    # Instance-specific overrides
    if 'tesk-prod.cloud.e-infra.cz' in instance_url:
        # This instance might need different credentials
        return {
            'user': os.getenv('TESK_PROD_USER', default_user),
            'password': os.getenv('TESK_PROD_PASSWORD', default_pass),
            'token': os.getenv('TESK_PROD_TOKEN', default_token)
        }
    elif 'tesk-na.cloud.e-infra.cz' in instance_url:
        # This instance might need different credentials
        return {
            'user': os.getenv('TESK_NA_USER', default_user),
            'password': os.getenv('TESK_NA_PASSWORD', default_pass),
            'token': os.getenv('TESK_NA_TOKEN', default_token)
        }
    else:
        # Use default credentials
        return {
            'user': default_user,
            'password': default_pass,
            'token': default_token
        }

# Debug: Print environment variables to see if they're loaded
print("=== DEBUG: Environment Variables ===")
raw_user = os.getenv('FUNNEL_SERVER_USER', '')
raw_pass = os.getenv('FUNNEL_SERVER_PASSWORD', '')
raw_token = os.getenv('TES_TOKEN', '')
print("FUNNEL_SERVER_USER (raw):", repr(raw_user))
print("FUNNEL_SERVER_PASSWORD (raw):", repr(raw_pass))
print("TES_TOKEN (raw):", repr(raw_token))
print("=== END DEBUG ===")

# Read TES instances from .tes_instances
TES_INSTANCES = []
tes_instances_file = Path(__file__).parent / '.tes_instances'
if tes_instances_file.exists():
    with open(tes_instances_file) as f:
        for line in f:
            line = line.strip()
            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue
            if ',' in line:
                name, url = line.split(',', 1)
                # Clean up URL: remove any credentials, trailing slashes, or whitespace
                url = url.strip()
                if '@' in url:
                    # Remove credentials if present in URL
                    url = url.split('@')[-1]
                    if not url.startswith('http'):  # Add protocol back if needed
                        url = 'https://' + url
                url = url.rstrip('/')  # Remove trailing slash
                TES_INSTANCES.append({'name': name.strip(), 'url': url})

FUNNEL_SERVER_USER = clean_env_value(os.getenv('FUNNEL_SERVER_USER', ''))
FUNNEL_SERVER_PASSWORD = clean_env_value(os.getenv('FUNNEL_SERVER_PASSWORD', ''))
FTP_USER = clean_env_value(os.getenv('FTP_USER', ''))
FTP_PASSWORD = clean_env_value(os.getenv('FTP_PASSWORD', ''))
FTP_INSTANCE = clean_env_value(os.getenv('FTP_INSTANCE', ''))
TES_GATEWAY = clean_env_value(os.getenv('TES_GATEWAY', ''))
TES_TOKEN = clean_env_value(os.getenv('TES_TOKEN', ''))

# Debug: Print cleaned environment variables
print("=== DEBUG: Cleaned Environment Variables ===")
print("FUNNEL_SERVER_USER (cleaned):", repr(FUNNEL_SERVER_USER))
print("FUNNEL_SERVER_PASSWORD (cleaned):", repr(FUNNEL_SERVER_PASSWORD))
print("TES_TOKEN (cleaned):", repr(TES_TOKEN))
print("=== END DEBUG ===")

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.secret_key = 'supersecretkey'  # For flash messages
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SESSION_TYPE'] = 'filesystem'

BATCH_RUNS_FILE = os.path.join(app.config['UPLOAD_FOLDER'], 'batch_runs.json')

# Load TES instance locations for map visualization
TES_LOCATIONS_FILE = 'tes_instance_locations.json'
tes_locations = []
if os.path.exists(TES_LOCATIONS_FILE):
    with open(TES_LOCATIONS_FILE) as f:
        tes_locations = json.load(f)

def load_batch_runs():
    if os.path.exists(BATCH_RUNS_FILE):
        with open(BATCH_RUNS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_batch_runs(runs):
    with open(BATCH_RUNS_FILE, 'w') as f:
        json.dump(runs, f)

# Store submitted tasks and workflow runs in memory (for demo purposes)
submitted_tasks = []
workflow_runs = []
batch_runs = load_batch_runs()
save_batch_runs(batch_runs)# Store batch/federated workflow runs

# HTML template (modern, professional dark theme)
TEMPLATE = None

# ... existing code ...
# Refactor all routes to be API-only, returning JSON or files, and prefix with /api/
# For example:
# @app.route('/submit', methods=['POST']) -> @app.route('/api/submit', methods=['POST'])
# @app.route('/task_details') -> @app.route('/api/task_details')
# @app.route('/workflow_log/<run_id>') -> @app.route('/api/workflow_log/<run_id>')
# etc.
# For each route, remove render_template_string and instead return jsonify or send_file as appropriate
# The root route (/) can return a simple JSON message or 404

if __name__ == '__main__':
    # app.run(host='0.0.0.0', port=5000)
    app.run( debug=True)
    
    
# docker build -t keshxvdayal/tes-dashboard:latest .
# docker buildx build --platform linux/amd64,linux/arm64 -t keshxvdayal/tes-dashboard:latest --push .

# docker run -it --rm -p 8080:5000 tes-dashboard  