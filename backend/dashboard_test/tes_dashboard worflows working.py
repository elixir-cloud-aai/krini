import os
os.environ['PATH'] = '/usr/local/bin:/usr/bin:' + os.environ.get('PATH', '')
from flask import Flask, render_template_string, request, redirect, url_for, flash, send_from_directory, send_file, session
from dotenv import load_dotenv
from pathlib import Path
import requests
import subprocess
import uuid
import json

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

# Load storage locations for data flow visualization
STORAGE_LOCATIONS_FILE = 'storage_locations.json'
storage_locations = []
if os.path.exists(STORAGE_LOCATIONS_FILE):
    with open(STORAGE_LOCATIONS_FILE) as f:
        storage_locations = json.load(f)

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
TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TES Dashboard - Professional</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" crossorigin="anonymous"/>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --main-bg: #fff;
            --main-bg-light: #f7f9fa;
            --main-bg-lighter: #f1f5f9;
            --main-bg-white: #fff;
            --sidebar-bg: #fff;
            --sidebar-text: #222b45;
            --sidebar-active: #f1f5f9;
            --card-bg: #fff;
            --card-bg-light: #f7f9fa;
            --card-bg-white: #fff;
            --text-primary: #222b45;
            --text-secondary: #4b5563;
            --text-muted: #94a3b8;
            --border-color: #e5e7eb;
            --border-color-light: #f1f5f9;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #2563eb;
            --shadow: 0 2px 8px rgba(0,0,0,0.04);
            --hover-bg: #f1f5f9;
            --hover-bg-light: #f7f9fa;
            --btn-bg: #4b5563; /* medium gray */
            --btn-bg-hover: #374151; /* darker gray */
            --btn-text: #fff;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--main-bg);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }

        .dashboard-container {
            display: flex;
            min-height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: 280px;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            position: fixed;
            height: 100vh;
            overflow-y: auto;
            z-index: 1000;
            color: var(--sidebar-text);
        }

        .sidebar-header {
            padding: 2rem 1.5rem 1rem;
            border-bottom: 1px solid var(--border-color);
        }

        .sidebar-header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .sidebar-header p {
            color: var(--text-muted);
            font-size: 0.875rem;
        }

        .nav-menu {
            padding: 1rem 0;
        }

        .nav-item {
            margin: 0.25rem 1rem;
        }

        .nav-link {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            color: var(--sidebar-text);
            text-decoration: none;
            border-radius: 0.5rem;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .nav-link:hover {
            background: var(--sidebar-active);
            color: var(--info-color);
        }

        .nav-link.active {
            background: var(--sidebar-active);
            color: var(--info-color);
        }

        .nav-link i {
            margin-right: 0.75rem;
            width: 1.25rem;
            text-align: center;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            margin-left: 280px;
            padding: 2rem;
            background: var(--main-bg);
        }

        .content-header {
            margin-bottom: 2rem;
        }

        .content-header h2 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
        }

        .content-header p {
            color: var(--text-muted);
        }

        /* Tabs */
        .tab-container {
            background: var(--card-bg);
            border-radius: 0.75rem;
            overflow: hidden;
            margin-bottom: 2rem;
            box-shadow: var(--shadow);
        }

        .tab-header {
            display: flex;
            background: var(--main-bg-light);
            border-bottom: 1px solid var(--border-color);
        }

        .tab-button {
            padding: 1rem 1.5rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
            border-bottom: 2px solid transparent;
        }

        .tab-button:hover {
            color: var(--info-color);
            background: var(--hover-bg-light);
        }

        .tab-button.active {
            color: var(--info-color);
            border-bottom-color: var(--info-color);
            background: var(--main-bg-light);
        }

        .tab-content {
            padding: 2rem;
            display: none;
            background: var(--card-bg);
            border-radius: 0.75rem;
            box-shadow: var(--shadow);
        }

        .tab-content.active {
            display: block;
        }

        /* Cards */
        .card {
            background: var(--card-bg);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            min-height: 64px;
        }

        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .card-subtitle {
            color: var(--text-muted);
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }

        .card-header .card-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 48px;
            min-height: 48px;
            font-size: 2.2rem;
            border-radius: 50%;
            background: var(--main-bg-light);
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .card-header .card-icon i {
            width: 2.2rem;
            height: 2.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Forms */
        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }

        .form-control {
            width: 100%;
            padding: 0.75rem 1rem;
            background: var(--main-bg-light);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            color: var(--text-primary);
            font-size: 0.875rem;
            transition: border-color 0.2s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--info-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }

        .form-control::placeholder {
            color: var(--text-muted);
        }

        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        /* Buttons */
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow);
            background: var(--btn-bg);
            color: var(--btn-text);
        }

        .btn-sm {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }

        .btn:hover {
            background: var(--btn-bg-hover);
            color: var(--btn-text);
            transform: translateY(-1px);
        }

        .btn-success {
            background: var(--success-color);
            color: #fff;
        }

        .btn-danger {
            background: var(--error-color);
            color: #fff;
        }

        /* Tables */
        .table-container {
            overflow-x: auto;
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            box-shadow: var(--shadow);
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            background: var(--card-bg);
        }

        .table th,
        .table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .table th {
            background: var(--main-bg-light);
            font-weight: 600;
            color: var(--text-primary);
        }

        .table tr:hover {
            background: var(--hover-bg-light);
        }

        /* Status badges */
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }

        .badge-success {
            background: rgba(34, 197, 94, 0.12);
            color: var(--success-color);
        }

        .badge-error {
            background: rgba(239, 68, 68, 0.12);
            color: var(--error-color);
        }

        .badge-warning {
            background: rgba(245, 158, 11, 0.12);
            color: var(--warning-color);
        }

        .badge-info {
            background: rgba(37, 99, 235, 0.12);
            color: var(--info-color);
        }

        /* Map */
        #workflow-map {
            height: 400px;
            min-height: 400px;
            width: 100%;
            border-radius: 0.75rem;
            overflow: hidden;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            position: relative;
        }
        
        /* Ensure map is visible */
        #workflow-map.leaflet-container {
            height: 400px !important;
            min-height: 400px !important;
        }

        /* Flow Map */
        #flow-map {
            height: 500px;
            min-height: 500px;
            width: 100%;
            border-radius: 0.75rem;
            overflow: hidden;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            position: relative;
        }
        
        /* Ensure flow map is visible */
        #flow-map.leaflet-container {
            height: 500px !important;
            min-height: 500px !important;
        }

        /* Flow toggle buttons */
        .flow-toggle {
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }

        .flow-toggle.active {
            background: var(--info-color);
            color: white;
        }

        .flow-toggle:not(.active) {
            background: var(--btn-bg);
            color: var(--btn-text);
        }

        /* TES markers */
        .tes-marker {
            background: #2563eb;
            border: 2px solid #fff;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .tes-marker i {
            color: white;
            font-size: 1rem;
        }

        /* Storage markers */
        .storage-marker {
            background: #10b981;
            border: 2px solid #fff;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .storage-marker i {
            color: white;
            font-size: 0.75rem;
        }

        /* Data flow arrows */
        .data-flow-arrow {
            stroke: #10b981;
            stroke-width: 3;
            fill: none;
            marker-end: url(#data-arrowhead);
        }

        /* Request flow arrows */
        .request-flow-arrow {
            stroke: #f59e0b;
            stroke-width: 3;
            fill: none;
            marker-end: url(#request-arrowhead);
        }

        /* Circular arrows for local storage */
        .circular-arrow {
            stroke: #10b981;
            stroke-width: 2;
            fill: none;
            stroke-dasharray: 5,5;
        }

        /* Alerts */
        .alert {
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid;
        }

        .alert-success {
            background: rgba(34, 197, 94, 0.08);
            border-left-color: var(--success-color);
            color: var(--success-color);
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.08);
            border-left-color: var(--error-color);
            color: var(--error-color);
        }

        /* Responsive */
        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }

            .sidebar.open {
                transform: translateX(0);
            }

            .main-content {
                margin-left: 0;
                padding: 1rem;
            }

            .mobile-menu-toggle {
                display: block;
                position: fixed;
                top: 1rem;
                left: 1rem;
                z-index: 1001;
                background: var(--main-bg-light);
                border: none;
                color: var(--text-primary);
                padding: 0.5rem;
                border-radius: 0.5rem;
            }
        }

        @media (min-width: 769px) {
            .sidebar {
                transform: translateX(0) !important;
                display: block !important;
            }
            
            .main-content {
                margin-left: 280px;
            }
        }

        .mobile-menu-toggle {
            display: none;
        }

        /* Loading spinner */
        .spinner {
            border: 2px solid var(--border-color);
            border-top: 2px solid var(--info-color);
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Workflow animation */
        .workflow-animation {
            background: var(--card-bg-light);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: var(--shadow);
        }

        .workflow-step {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
            padding: 1rem;
            background: var(--main-bg-light);
            border-radius: 0.5rem;
            transition: all 0.3s ease;
            box-shadow: var(--shadow);
        }

        .workflow-step.active {
            background: var(--main-bg-white);
            color: var(--info-color);
        }

        .workflow-step-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--main-bg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 1rem;
        }

        .workflow-step.active .workflow-step-icon {
            background: var(--main-bg-light);
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <!-- Mobile Menu Toggle -->
        <button class="mobile-menu-toggle" onclick="toggleSidebar()">
            <i class="fas fa-bars"></i>
        </button>

        <!-- Sidebar -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <h1><i class="fas fa-cloud"></i> TES Dashboard</h1>
                <p>Task Execution Service Management</p>
            </div>
            
            <nav class="nav-menu">
                <div class="nav-item">
                    <a href="#overview" class="nav-link active" onclick="showTab('overview', event)">
                        <i class="fas fa-tachometer-alt"></i>
                        Overview
                    </a>
                </div>
                <div class="nav-item">
                    <a href="#submit-tasks" class="nav-link" onclick="showTab('submit-tasks', event)">
                        <i class="fas fa-plus-circle"></i>
                        Submit Tasks
                    </a>
                </div>
                <div class="nav-item">
                    <a href="#workflows" class="nav-link" onclick="showTab('workflows', event)">
                        <i class="fas fa-project-diagram"></i>
                        Workflows
                    </a>
                </div>
                <div class="nav-item">
                    <a href="#batch-execution" class="nav-link" onclick="showTab('batch-execution', event)">
                        <i class="fas fa-layer-group"></i>
                        Batch Execution
                    </a>
                </div>
                <div class="nav-item">
                    <a href="#monitoring" class="nav-link" onclick="showTab('monitoring', event)">
                        <i class="fas fa-chart-line"></i>
                        Monitoring
                    </a>
                </div>
                <div class="nav-item">
                    <a href="#utilities" class="nav-link" onclick="showTab('utilities', event)">
                        <i class="fas fa-tools"></i>
                        Utilities
                    </a>
                </div>
            </nav>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Overview Tab -->
            <div id="overview" class="tab-content active">
                <div class="content-header">
                    <h2>Dashboard Overview</h2>
                    <p>Monitor your TES instances and workflow execution status</p>
                </div>

                <!-- Alerts -->
                {% with messages = get_flashed_messages(with_categories=true) %}
                    {% if messages %}
                        {% for category, message in messages %}
                            <div class="alert alert-{{ 'success' if category == 'success' else 'error' }}">
                                <i class="fas fa-{{ 'check-circle' if category == 'success' else 'exclamation-circle' }}"></i>
                                {{ message }}
                            </div>
                        {% endfor %}
                    {% endif %}
                {% endwith %}

                <!-- Stats Cards -->
                <div class="form-row">
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">{{ tasks|length }}</div>
                                <div class="card-subtitle">Total Tasks</div>
                            </div>
                            <span class="card-icon"><i class="fas fa-tasks" style="color: var(--primary-color);"></i></span>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">{{ workflow_runs|length }}</div>
                                <div class="card-subtitle">Workflow Runs</div>
                            </div>
                            <span class="card-icon"><i class="fas fa-project-diagram" style="color: var(--success-color);"></i></span>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">{{ batch_runs|length }}</div>
                                <div class="card-subtitle">Batch Executions</div>
                            </div>
                            <span class="card-icon"><i class="fas fa-layer-group" style="color: var(--warning-color);"></i></span>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <div>
                                <div class="card-title">{{ tes_instances|length }}</div>
                                <div class="card-subtitle">TES Instances</div>
                            </div>
                            <span class="card-icon"><i class="fas fa-server" style="color: var(--info-color);"></i></span>
                        </div>
                    </div>
                </div>

                <!-- Workflow Topology Map -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Workflow Topology Map</h3>
                        <p class="card-subtitle">Geographic distribution of TES instances</p>
                        <button onclick="refreshMap()" class="btn btn-secondary" style="margin-left: auto;">
                            <i class="fas fa-sync-alt"></i>
                            Refresh Map
                        </button>
                    </div>
                    <div id="workflow-map"></div>
                    <div style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-muted);">
                        <i class="fas fa-info-circle"></i>
                        Map shows {{ tes_locations|length }} TES instances. 
                        <button onclick="console.log('TES Locations:', {{ tes_locations|tojson }}); console.log('Latest Path:', {{ latest_path|tojson }});" class="btn btn-sm" style="background: #f3f4f6; color: #222b45; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            Debug Data
                        </button>
                    </div>
                </div>

                <!-- Data and Request Flow Visualization Map -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Data and Request Flow Visualization</h3>
                        <p class="card-subtitle">Visualize data flow and request/compute flow patterns</p>
                        <div style="margin-left: auto; display: flex; gap: 0.5rem;">
                            <button onclick="toggleFlowType('both')" class="btn btn-primary btn-sm flow-toggle active" data-flow="both">
                                <i class="fas fa-layer-group"></i>
                                Both Flows
                            </button>
                            <button onclick="toggleFlowType('data')" class="btn btn-secondary btn-sm flow-toggle" data-flow="data">
                                <i class="fas fa-database"></i>
                                Data Flow
                            </button>
                            <button onclick="toggleFlowType('request')" class="btn btn-secondary btn-sm flow-toggle" data-flow="request">
                                <i class="fas fa-exchange-alt"></i>
                                Request Flow
                            </button>
                            <button onclick="refreshFlowMap()" class="btn btn-secondary btn-sm">
                                <i class="fas fa-sync-alt"></i>
                                Refresh
                            </button>
                        </div>
                    </div>
                    <div id="flow-map"></div>
                    <div style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-muted);">
                        <i class="fas fa-info-circle"></i>
                        Map shows {{ tes_locations|length }} TES instances and {{ storage_locations|length }} storage services.
                        <button onclick="console.log('Storage Locations:', {{ storage_locations|tojson }});" class="btn btn-sm" style="background: #f3f4f6; color: #222b45; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            Debug Storage
                        </button>
                    </div>
                </div>

                <!-- Workflow Animation -->
                <div class="workflow-animation">
                    <div class="card-header">
                        <h3 class="card-title">Workflow Process</h3>
                        <p class="card-subtitle">Real-time workflow execution visualization</p>
                    </div>
                    <div id="workflow-steps">
                        <div class="workflow-step" id="step1">
                            <div class="workflow-step-icon">
                                <i class="fas fa-upload"></i>
                            </div>
                            <div>
                                <strong>Task Submission</strong>
                                <p>User submits workflow/task via dashboard</p>
                            </div>
                        </div>
                        <div class="workflow-step" id="step2">
                            <div class="workflow-step-icon">
                                <i class="fas fa-cogs"></i>
                            </div>
                            <div>
                                <strong>Processing</strong>
                                <p>Dashboard prepares and validates task</p>
                            </div>
                        </div>
                        <div class="workflow-step" id="step3">
                            <div class="workflow-step-icon">
                                <i class="fas fa-route"></i>
                            </div>
                            <div>
                                <strong>Routing</strong>
                                <p>TES instance selection and distribution</p>
                            </div>
                        </div>
                        <div class="workflow-step" id="step4">
                            <div class="workflow-step-icon">
                                <i class="fas fa-play"></i>
                            </div>
                            <div>
                                <strong>Execution</strong>
                                <p>Task execution on selected TES instance</p>
                            </div>
                        </div>
                        <div class="workflow-step" id="step5">
                            <div class="workflow-step-icon">
                                <i class="fas fa-download"></i>
                            </div>
                            <div>
                                <strong>Output Collection</strong>
                                <p>Results collection and storage</p>
                            </div>
                        </div>
                        <div class="workflow-step" id="step6">
                            <div class="workflow-step-icon">
                                <i class="fas fa-check"></i>
                            </div>
                            <div>
                                <strong>Completion</strong>
                                <p>Status update and result display</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Submit Tasks Tab -->
            <div id="submit-tasks" class="tab-content">
                <div class="content-header">
                    <h2>Submit Tasks</h2>
                    <p>Create and submit individual tasks to TES instances</p>
                </div>

                <div class="card">
                    <form method="post" action="/submit" enctype="multipart/form-data">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">TES Instance</label>
                                <select name="tes_instance" class="form-control" onchange="toggleDistributionLogic()">
                                    <option value="all">All Instances</option>
                                    {% for inst in tes_instances %}
                                        <option value="{{ inst.url }}">{{ inst.name }}</option>
                                    {% endfor %}
                                    {% if tes_gateway %}
                                        <option value="{{ tes_gateway }}">TES Gateway</option>
                                    {% endif %}
                                </select>
                            </div>
                            
                            <div class="form-group" id="dist-logic-group" style="display:none;">
                                <label class="form-label">Distribution Logic</label>
                                <select name="distribution_logic" class="form-control">
                                    <option value="random">Random</option>
                                    <option value="distance">Distance-based</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Task Type</label>
                            <select name="task_type" class="form-control" onchange="toggleComplexFields()">
                                <option value="simple">Simple (echo hello)</option>
                                <option value="complex">Complex (with input/output)</option>
                            </select>
                        </div>

                        <div id="complex-fields" style="display:none;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Input File URL</label>
                                    <input type="text" name="input_url" class="form-control" placeholder="https://..." />
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Output File URL</label>
                                    <input type="text" name="output_url" class="form-control" placeholder="ftp://..." />
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i>
                            Submit Task
                        </button>
                    </form>
                </div>
            </div>

            <!-- Workflows Tab -->
            <div id="workflows" class="tab-content">
                <div class="content-header">
                    <h2>Submit Workflows</h2>
                    <p>Execute CWL, Snakemake, or Nextflow workflows</p>
                </div>

                <div class="card">
                    <form method="post" action="/submit_workflow" enctype="multipart/form-data">
                        <div class="form-group">
                            <label class="form-label">Workflow Type</label>
                            <select name="wf_type" class="form-control" onchange="toggleWfFields()">
                                <option value="cwl">CWL</option>
                                <option value="snakemake">Snakemake</option>
                                <option value="nextflow">Nextflow</option>
                            </select>
                        </div>

                        <div id="cwl-fields">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">CWL Workflow File</label>
                                    <input type="file" name="cwl_file" class="form-control" />
                                </div>
                                <div class="form-group">
                                    <label class="form-label">CWL Input File (YAML/JSON)</label>
                                    <input type="file" name="cwl_input" class="form-control" />
                                </div>
                            </div>
                        </div>

                        <div id="snakemake-fields" style="display:none;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Snakefile</label>
                                    <input type="file" name="snakefile" class="form-control" />
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Workflow Directory (optional, zipped)</label>
                                    <input type="file" name="smk_dir" class="form-control" />
                                </div>
                            </div>
                        </div>

                        <div id="nextflow-fields" style="display:none;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nextflow Script (.nf)</label>
                                    <input type="file" name="nextflow_file" class="form-control" />
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Nextflow Config (optional)</label>
                                    <input type="file" name="nextflow_config" class="form-control" />
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Parameters (JSON, optional)</label>
                                <input type="text" name="nextflow_params" class="form-control" placeholder='{"param1": "value1", "param2": "value2"}' />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Select TES Instance</label>
                                <select name="wf_tes_instance" class="form-control" onchange="toggleWfDistributionLogic()">
                                    {% for inst in tes_instances %}
                                        <option value="{{ inst.url }}">{{ inst.name }}</option>
                                    {% endfor %}
                                    {% if tes_gateway %}
                                        <option value="{{ tes_gateway }}">TES Gateway</option>
                                    {% endif %}
                                </select>
                            </div>
                            
                            <div class="form-group" id="wf-dist-logic-group" style="display:none;">
                                <label class="form-label">Distribution Logic</label>
                                <select name="wf_distribution_logic" class="form-control">
                                    <option value="random">Random</option>
                                    <option value="distance">Distance-based</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-play"></i>
                            Submit Workflow
                        </button>
                    </form>
                </div>
            </div>

            <!-- Batch Execution Tab -->
            <div id="batch-execution" class="tab-content">
                <div class="content-header">
                    <h2>Batch Execution</h2>
                    <p>Execute workflows across multiple TES instances</p>
                </div>

                <!-- Snakemake Batch -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Batch Snakemake Execution</h3>
                        <p class="card-subtitle">Run Snakemake workflows on multiple instances</p>
                    </div>
                    <form method="post" action="/batch_snakemake" enctype="multipart/form-data">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Snakefile</label>
                                <input type="file" name="batch_snakefile" class="form-control" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Workflow Directory (optional, zipped)</label>
                                <input type="file" name="batch_smk_dir" class="form-control" />
                            </div>
                        </div>
                        <div class="form-row">
                            <button type="submit" name="batch_mode" value="all" class="btn btn-primary">
                                <i class="fas fa-server"></i>
                                Run on All TES Instances
                            </button>
                            <button type="submit" name="batch_mode" value="gateway" class="btn btn-secondary">
                                <i class="fas fa-network-wired"></i>
                                Run via TES Gateway (Federated)
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Nextflow Batch -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Batch Nextflow Execution</h3>
                        <p class="card-subtitle">Run Nextflow workflows on multiple instances</p>
                    </div>
                    <form method="post" action="/batch_nextflow" enctype="multipart/form-data">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Nextflow Script (.nf)</label>
                                <input type="file" name="batch_nextflow_file" class="form-control" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Nextflow Config (optional)</label>
                                <input type="file" name="batch_nextflow_config" class="form-control" />
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Parameters (JSON, optional)</label>
                            <input type="text" name="batch_nextflow_params" class="form-control" placeholder='{"param1": "value1", "param2": "value2"}' />
                        </div>
                        <div class="form-row">
                            <button type="submit" name="batch_mode" value="all" class="btn btn-primary">
                                <i class="fas fa-server"></i>
                                Run on All TES Instances
                            </button>
                            <button type="submit" name="batch_mode" value="gateway" class="btn btn-secondary">
                                <i class="fas fa-network-wired"></i>
                                Run via TES Gateway (Federated)
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Monitoring Tab -->
            <div id="monitoring" class="tab-content">
                <div class="content-header">
                    <h2>Task & Workflow Monitoring</h2>
                    <p>Monitor submitted tasks and workflow execution status</p>
                </div>

                <!-- Submitted Tasks -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Submitted Tasks</h3>
                        <p class="card-subtitle">Track individual task execution</p>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>TES Instance</th>
                                    <th>Task ID</th>
                                    <th>Status</th>
                                    <th>Type</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for task in tasks %}
                                <tr>
                                    <td>{{ task['tes_name'] }}</td>
                                    <td><code>{{ task['task_id'] }}</code></td>
                                    <td>
                                        <span class="badge badge-{{ 'success' if task['status'] == 'COMPLETE' else 'warning' if task['status'] == 'RUNNING' else 'error' if task['status'] in ['ERROR', 'FAILED'] else 'info' }}">
                                            {{ task['status'] }}
                                        </span>
                                    </td>
                                    <td>{{ task['type'] }}</td>
                                    <td>
                                        <a href="/task_details?tes_url={{ task['tes_url'] }}&task_id={{ task['task_id'] }}" class="btn btn-secondary btn-sm">
                                            <i class="fas fa-eye"></i>
                                            Details
                                        </a>
                                    </td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Workflow Runs -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Workflow Runs</h3>
                        <p class="card-subtitle">Monitor workflow execution progress</p>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Workflow Type</th>
                                    <th>TES Instance</th>
                                    <th>Status</th>
                                    <th>Run ID</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for wf in workflow_runs %}
                                <tr>
                                    <td>{{ wf['type'] }}</td>
                                    <td>{{ wf['tes_name'] }}</td>
                                    <td>
                                        <span class="badge badge-{{ 'success' if wf['status'] == 'COMPLETE' else 'warning' if wf['status'] == 'RUNNING' else 'error' if wf['status'] in ['ERROR', 'FAILED'] else 'info' }}">
                                            {{ wf['status'] }}
                                        </span>
                                    </td>
                                    <td><code>{{ wf['run_id'] }}</code></td>
                                    <td>
                                        <a href="/workflow_log/{{ wf['run_id'] }}" class="btn btn-secondary btn-sm">
                                            <i class="fas fa-file-alt"></i>
                                            View Log
                                        </a>
                                    </td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Batch/Federated Runs -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Batch/Federated Workflow Runs</h3>
                        <p class="card-subtitle">Monitor batch and federated executions</p>
                    </div>
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Workflow Type</th>
                                    <th>TES Instance</th>
                                    <th>Status</th>
                                    <th>Run ID</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for br in batch_runs %}
                                <tr>
                                    <td>{{ br['mode'] }}</td>
                                    <td>{{ br.get('workflow_type', 'snakemake') }}</td>
                                    <td>{{ br['tes_name'] }}</td>
                                    <td>
                                        <span class="badge badge-{{ 'success' if br['status'] == 'COMPLETE' else 'warning' if br['status'] == 'RUNNING' else 'error' if br['status'] in ['ERROR', 'FAILED'] else 'info' }}">
                                            {{ br['status'] }}
                                        </span>
                                    </td>
                                    <td><code>{{ br['run_id'] }}</code></td>
                                    <td>
                                        <a href="/batch_log/{{ br['run_id'] }}" class="btn btn-secondary btn-sm">
                                            <i class="fas fa-file-alt"></i>
                                            View Log
                                        </a>
                                    </td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Utilities Tab -->
            <div id="utilities" class="tab-content">
                <div class="content-header">
                    <h2>TES Utilities</h2>
                    <p>Manage and monitor TES instances</p>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Instance Management</h3>
                        <p class="card-subtitle">List tasks and get service information</p>
                    </div>
                    
                    <div class="form-row">
                        <form method="get" action="/list_tasks" class="form-group">
                            <label class="form-label">List Tasks for Instance</label>
                            <div style="display: flex; gap: 1rem; align-items: end;">
                                <select name="tes_url" class="form-control">
                                    {% for inst in tes_instances %}
                                        <option value="{{ inst.url }}">{{ inst.name }}</option>
                                    {% endfor %}
                                    {% if tes_gateway %}
                                        <option value="{{ tes_gateway }}">TES Gateway</option>
                                    {% endif %}
                                </select>
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-list"></i>
                                    List Tasks
                                </button>
                            </div>
                        </form>
                    </div>

                    <div class="form-row">
                        <form method="get" action="/service_info" class="form-group">
                            <label class="form-label">Service Info for Instance</label>
                            <div style="display: flex; gap: 1rem; align-items: end;">
                                <select name="tes_url" class="form-control">
                                    {% for inst in tes_instances %}
                                        <option value="{{ inst.url }}">{{ inst.name }}</option>
                                    {% endfor %}
                                    {% if tes_gateway %}
                                        <option value="{{ tes_gateway }}">TES Gateway</option>
                                    {% endif %}
                                </select>
                                <button type="submit" class="btn btn-secondary">
                                    <i class="fas fa-info-circle"></i>
                                    Service Info
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Move Leaflet JS here, before custom JS -->
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js" crossorigin="anonymous"></script>
    <script>
        // Tab functionality
        function showTab(tabName, event) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            // Remove active class from all nav links
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => link.classList.remove('active'));
            // Show selected tab
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            // Add active class to clicked nav link
            if (event && event.target) {
                event.target.classList.add('active');
            } else {
                // Fallback: find the nav link by href
                const navLink = document.querySelector(`a[href="#${tabName}"]`);
                if (navLink) {
                    navLink.classList.add('active');
                }
            }
            // Update the URL hash
            if (window.location.hash !== '#' + tabName) {
                window.location.hash = tabName;
            }
            // Close mobile sidebar if open
            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        }

        // Mobile sidebar toggle
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        }

        // === Add this function for workflow file field toggling ===
        function toggleWfFields() {
            var wfType = document.querySelector('select[name="wf_type"]');
            if (!wfType) return;
            var cwlFields = document.getElementById('cwl-fields');
            var snakemakeFields = document.getElementById('snakemake-fields');
            var nextflowFields = document.getElementById('nextflow-fields');
            if (!cwlFields || !snakemakeFields || !nextflowFields) return;
            var value = wfType.value;
            cwlFields.style.display = (value === 'cwl') ? '' : 'none';
            snakemakeFields.style.display = (value === 'snakemake') ? '' : 'none';
            nextflowFields.style.display = (value === 'nextflow') ? '' : 'none';
        }
        // === End workflow file field toggling ===

        // Initialize tab navigation and form toggles on DOMContentLoaded
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 DOM Content Loaded - Initializing dashboard...');
            
            // Initialize form toggles
            toggleComplexFields();
            toggleDistributionLogic();
            toggleWfFields(); // Ensure correct workflow fields are shown on load
            toggleWfDistributionLogic();
            
            // Ensure sidebar is visible on desktop
            const sidebar = document.getElementById('sidebar');
            if (sidebar && window.innerWidth > 768) {
                sidebar.style.transform = 'translateX(0)';
                sidebar.style.display = 'block';
            }
            
            // Add click event listeners to all nav links as backup
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const tabName = this.getAttribute('href').substring(1);
                    showTab(tabName, e);
                });
            });
            
            // On load, show tab from hash if present
            let initialTab = 'overview';
            if (window.location.hash) {
                const hashTab = window.location.hash.replace('#', '');
                if (document.getElementById(hashTab)) {
                    initialTab = hashTab;
                }
            }
            showTab(initialTab, null);
            
            // Initialize workflow map and stepper
            console.log('🔍 Checking for workflow-map element...');
            const mapContainer = document.getElementById('workflow-map');
            if (mapContainer) {
                console.log('✅ Found workflow-map element, initializing map...');
                console.log('📏 Map container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
                console.log('👁️ Map container visible:', mapContainer.offsetWidth > 0 && mapContainer.offsetHeight > 0);
                
                // Wait for Leaflet to be available and then initialize map
                function initMapWhenReady() {
                    if (typeof L !== 'undefined') {
                        console.log('✅ Leaflet is available, initializing map...');
                        console.log('🟦 latestPath on load:', latestPath);
                        console.log('🟩 tesLocations on load:', tesLocations);
                        initWorkflowMap();
                    } else {
                        console.log('⏳ Waiting for Leaflet to load...');
                        setTimeout(initMapWhenReady, 100);
                    }
                }
                initMapWhenReady();
                // If latestPath is not empty, force map refresh to highlight path
                if (latestPath && Array.isArray(latestPath) && latestPath.length > 0) {
                    setTimeout(function() {
                        console.log('🔄 Forcing map refresh for workflow path:', latestPath);
                        initWorkflowMap();
                    }, 200);
                }
            } else {
                console.error('❌ workflow-map element not found!');
            }
            
            updateWorkflowStepper(0); // Default to first step
            setInterval(pollWorkflowStatus, 3000); // Poll every 3s
            
            console.log('✅ Dashboard initialization complete');
        });

        // Listen for hash changes (browser navigation)
        window.addEventListener('hashchange', function() {
            const hashTab = window.location.hash.replace('#', '');
            if (document.getElementById(hashTab)) {
                showTab(hashTab, null);
            }
        });

        // === Add this function for task type field toggling ===
        function toggleComplexFields() {
            var taskType = document.querySelector('select[name="task_type"]');
            var complexFields = document.getElementById('complex-fields');
            if (!taskType || !complexFields) return;
            if (taskType.value === 'complex') {
                complexFields.style.display = '';
            } else {
                complexFields.style.display = 'none';
            }
        }
        // === End task type field toggling ===

        // === Add this function for TES instance distribution logic toggling ===
        function toggleDistributionLogic() {
            var instanceSelect = document.querySelector('select[name="tes_instance"]');
            var distLogicGroup = document.getElementById('dist-logic-group');
            if (!instanceSelect || !distLogicGroup) return;
            if (instanceSelect.value && instanceSelect.value.includes('gateway')) {
                distLogicGroup.style.display = '';
            } else {
                distLogicGroup.style.display = 'none';
            }
        }
        // === End TES instance distribution logic toggling ===

        // === Add this function for workflow TES instance distribution logic toggling ===
        function toggleWfDistributionLogic() {
            var wfInstanceSelect = document.querySelector('select[name="wf_tes_instance"]');
            var wfDistLogicGroup = document.getElementById('wf-dist-logic-group');
            if (!wfInstanceSelect || !wfDistLogicGroup) return;
            if (wfInstanceSelect.value && wfInstanceSelect.value.includes('gateway')) {
                wfDistLogicGroup.style.display = '';
            } else {
                wfDistLogicGroup.style.display = 'none';
            }
        }
        // === End workflow TES instance distribution logic toggling ===

        var tesLocations = {{ tes_locations|tojson }};
        var storageLocations = {{ storage_locations|tojson }};
        var latestPath = {{ latest_path|tojson }};
        var submittedTasks = {{ tasks|tojson }};

        // Debug logging
        console.log('TES Locations:', tesLocations);
        console.log('Latest Path:', latestPath);
        console.log('Submitted Tasks:', submittedTasks);

        // === Workflow Topology Map ===
        // Track the map instance globally
        var workflowMapInstance = null;
        function initWorkflowMap() {
            console.log('🗺️ Initializing workflow map...');
            var mapContainer = document.getElementById('workflow-map');
            if (!mapContainer) {
                console.error('❌ Map container not found');
                return;
            }
            if (typeof L === 'undefined') {
                console.error('❌ Leaflet not available');
                mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Loading map library...</div>';
                return;
            }
            if (window.workflowMapInstance) {
                window.workflowMapInstance.remove();
                window.workflowMapInstance = null;
                console.log('🗑️ Removed previous map instance');
            }
            mapContainer.innerHTML = '';
            var map = L.map('workflow-map').setView([30, 0], 2);
            window.workflowMapInstance = map;
            try {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
            } catch (e) {
                L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
            }
            var validLocations = tesLocations.filter(function(loc) {
                return loc && loc.lat !== null && loc.lon !== null && !isNaN(loc.lat) && !isNaN(loc.lon);
            });
            // Build a lookup for TES instance by name
            var locByName = {};
            validLocations.forEach(function(loc) { locByName[loc.name] = loc; });
            // Draw faded markers for all TES instances not in the workflow path
            validLocations.forEach(function(loc) {
                if (!latestPath || !Array.isArray(latestPath) || !latestPath.includes(loc.name)) {
                    var fadedMarker = L.marker([loc.lat, loc.lon]).addTo(map);
                    fadedMarker.bindPopup('<b>' + (loc.name || 'Unknown') + '</b><br><small>' + (loc.url || 'No URL') + '</small>');
                    if (fadedMarker._icon) fadedMarker._icon.classList.add('tes-marker');
                }
            });
            // Draw numbered markers and polyline for workflow path
            if (latestPath && Array.isArray(latestPath) && latestPath.length > 0) {
                var pathCoords = [];
                latestPath.forEach(function(name, idx) {
                    var loc = locByName[name];
                    if (loc) {
                        pathCoords.push([loc.lat, loc.lon]);
                        var numberIcon = L.divIcon({
                            className: 'workflow-step-marker',
                            html: '<div class="step-circle">' + (idx + 1) + '</div>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        });
                        var marker = L.marker([loc.lat, loc.lon], {icon: numberIcon}).addTo(map);
                        marker.bindPopup('<b>Step ' + (idx + 1) + '</b><br>' + name);
                    }
                });
                if (pathCoords.length > 1) {
                    L.polyline(pathCoords, {
                        color: '#2563eb',
                        weight: 5,
                        opacity: 0.7,
                        dashArray: '10, 5'
                    }).addTo(map);
                    map.fitBounds(pathCoords, {padding: [30, 30]});
                } else if (pathCoords.length === 1) {
                    map.setView(pathCoords[0], 4);
                }
            } else if (validLocations.length > 0) {
                var bounds = L.latLngBounds(validLocations.map(function(loc) {
                    return [loc.lat, loc.lon];
                }));
                map.fitBounds(bounds, {padding: [30, 30]});
            }
            // Add legend
            var legend = L.control({position: 'bottomright'});
            legend.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'info legend');
                div.style.backgroundColor = 'white';
                div.style.padding = '10px';
                div.style.borderRadius = '5px';
                div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                div.innerHTML = '<h4>TES Instances</h4>' +
                    '<div><span style="display: inline-block; width: 12px; height: 12px; background: #666; border-radius: 50%; margin-right: 5px;"></span>Available</div>' +
                    '<div><span style="display: inline-block; width: 12px; height: 12px; background: #2563eb; border-radius: 50%; margin-right: 5px;"></span>Active Workflow</div>';
                return div;
            };
            legend.addTo(map);
            // Add CSS for numbered markers
            var style = document.createElement('style');
            style.innerHTML += `\n.workflow-step-marker .step-circle {\n    background: #2563eb;\n    color: #fff;\n    border-radius: 50%;\n    width: 28px;\n    height: 28px;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    font-weight: bold;\n    font-size: 1.1em;\n    border: 2px solid #fff;\n    box-shadow: 0 2px 6px rgba(0,0,0,0.15);\n}`;
            document.head.appendChild(style);
        }
        // === End Workflow Topology Map ===

        // === Data and Request Flow Visualization Map ===
        var flowMapInstance = null;
        var currentFlowType = 'both';

        function initFlowMap() {
            console.log('🗺️ Initializing flow map...');
            var mapContainer = document.getElementById('flow-map');
            if (!mapContainer) {
                console.error('❌ Flow map container not found');
                return;
            }
            if (typeof L === 'undefined') {
                console.error('❌ Leaflet not available');
                mapContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Loading map library...</div>';
                return;
            }
            if (window.flowMapInstance) {
                window.flowMapInstance.remove();
                window.flowMapInstance = null;
                console.log('🗑️ Removed previous flow map instance');
            }
            mapContainer.innerHTML = '';
            var map = L.map('flow-map').setView([30, 0], 2);
            window.flowMapInstance = map;
            
            try {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
            } catch (e) {
                L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
            }

            // Add TES instances
            var validTesLocations = tesLocations.filter(function(loc) {
                return loc && loc.lat !== null && loc.lon !== null && !isNaN(loc.lat) && !isNaN(loc.lon);
            });

            // Add storage services
            var validStorageLocations = storageLocations.filter(function(loc) {
                return loc && loc.lat !== null && loc.lon !== null && !isNaN(loc.lat) && !isNaN(loc.lon);
            });

            // Draw TES instances
            validTesLocations.forEach(function(loc) {
                var tesIcon = L.divIcon({
                    className: 'tes-marker',
                    html: '<i class="fas fa-server"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                var marker = L.marker([loc.lat, loc.lon], {icon: tesIcon}).addTo(map);
                marker.bindPopup('<b>' + (loc.name || 'Unknown') + '</b><br><small>TES Instance</small><br><small>' + (loc.url || 'No URL') + '</small>');
            });

            // Draw storage services
            validStorageLocations.forEach(function(loc) {
                var storageIcon = L.divIcon({
                    className: 'storage-marker',
                    html: '<i class="fas fa-database"></i>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                var marker = L.marker([loc.lat, loc.lon], {icon: storageIcon}).addTo(map);
                marker.bindPopup('<b>' + (loc.name || 'Unknown') + '</b><br><small>Storage Service</small><br><small>' + (loc.url || 'No URL') + '</small>');
            });

            // Draw flow patterns based on current flow type
            if (currentFlowType === 'data' || currentFlowType === 'both') {
                drawDataFlow(map, validTesLocations, validStorageLocations);
            }
            
            if (currentFlowType === 'request' || currentFlowType === 'both') {
                drawRequestFlow(map, validTesLocations);
            }

            // Fit bounds to show all markers
            var allLocations = validTesLocations.concat(validStorageLocations);
            if (allLocations.length > 0) {
                var bounds = L.latLngBounds(allLocations.map(function(loc) {
                    return [loc.lat, loc.lon];
                }));
                map.fitBounds(bounds, {padding: [30, 30]});
            }

            // Add legend
            var legend = L.control({position: 'bottomright'});
            legend.onAdd = function(map) {
                var div = L.DomUtil.create('div', 'info legend');
                div.style.backgroundColor = 'white';
                div.style.padding = '10px';
                div.style.borderRadius = '5px';
                div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                div.innerHTML = '<h4>Flow Visualization</h4>' +
                    '<div><span style="display: inline-block; width: 12px; height: 12px; background: #2563eb; border-radius: 50%; margin-right: 5px;"></span>TES Instances</div>' +
                    '<div><span style="display: inline-block; width: 12px; height: 12px; background: #10b981; border-radius: 50%; margin-right: 5px;"></span>Storage Services</div>' +
                    '<div><span style="display: inline-block; width: 12px; height: 12px; background: #10b981; border-radius: 50%; margin-right: 5px;"></span>Data Flow</div>' +
                    '<div><span style="display: inline-block; width: 12px; height: 12px; background: #f59e0b; border-radius: 50%; margin-right: 5px;"></span>Request Flow</div>';
                return div;
            };
            legend.addTo(map);
        }

        function drawDataFlow(map, tesLocations, storageLocations) {
            // Simulate data flow patterns
            tesLocations.forEach(function(tes, tesIndex) {
                // Input data flow: from storage to TES
                if (storageLocations.length > 0) {
                    var sourceStorage = storageLocations[tesIndex % storageLocations.length];
                    var inputFlow = L.polyline([[sourceStorage.lat, sourceStorage.lon], [tes.lat, tes.lon]], {
                        color: '#10b981',
                        weight: 3,
                        opacity: 0.7,
                        dashArray: '5, 10'
                    }).addTo(map);
                    inputFlow.bindPopup('<b>Input Data Flow</b><br>From: ' + sourceStorage.name + '<br>To: ' + tes.name);
                }

                // Output data flow: circular arrow back to local storage
                var radius = 0.1; // degrees
                var center = [tes.lat, tes.lon];
                var points = [];
                for (var i = 0; i <= 360; i += 10) {
                    var angle = i * Math.PI / 180;
                    var lat = center[0] + radius * Math.cos(angle);
                    var lon = center[1] + radius * Math.sin(angle);
                    points.push([lat, lon]);
                }
                var circularFlow = L.polyline(points, {
                    color: '#10b981',
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '3, 3'
                }).addTo(map);
                circularFlow.bindPopup('<b>Local Output Storage</b><br>Results stored locally at: ' + tes.name);
            });
        }

        function drawRequestFlow(map, tesLocations) {
            // Simulate request/compute flow patterns
            if (tesLocations.length > 1) {
                // Create a simple request flow pattern
                for (var i = 0; i < tesLocations.length - 1; i++) {
                    var from = tesLocations[i];
                    var to = tesLocations[i + 1];
                    var requestFlow = L.polyline([[from.lat, from.lon], [to.lat, to.lon]], {
                        color: '#f59e0b',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '10, 5'
                    }).addTo(map);
                    requestFlow.bindPopup('<b>Request/Compute Flow</b><br>From: ' + from.name + '<br>To: ' + to.name);
                }

                // Add a return flow to complete the cycle
                if (tesLocations.length > 2) {
                    var first = tesLocations[0];
                    var last = tesLocations[tesLocations.length - 1];
                    var returnFlow = L.polyline([[last.lat, last.lon], [first.lat, first.lon]], {
                        color: '#f59e0b',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '10, 5'
                    }).addTo(map);
                    returnFlow.bindPopup('<b>Return Flow</b><br>From: ' + last.name + '<br>To: ' + first.name);
                }
            }
        }

        function toggleFlowType(flowType) {
            currentFlowType = flowType;
            
            // Update button states
            document.querySelectorAll('.flow-toggle').forEach(function(btn) {
                btn.classList.remove('active', 'btn-primary');
                btn.classList.add('btn-secondary');
            });
            
            var activeBtn = document.querySelector('.flow-toggle[data-flow="' + flowType + '"]');
            if (activeBtn) {
                activeBtn.classList.add('active', 'btn-primary');
                activeBtn.classList.remove('btn-secondary');
            }
            
            // Refresh the map
            initFlowMap();
        }

        function refreshFlowMap() {
            console.log('Manually refreshing flow map...');
            if (document.getElementById('flow-map')) {
                initFlowMap();
            }
        }

        // Make refreshFlowMap available globally for debugging
        window.refreshFlowMap = refreshFlowMap;
        // === End Data and Request Flow Visualization Map ===

        // === Dynamic Workflow Process Stepper ===
        var workflowSteps = [
            { id: 'step1', label: 'Task Submission', icon: 'fa-upload' },
            { id: 'step2', label: 'Processing', icon: 'fa-cogs' },
            { id: 'step3', label: 'Routing', icon: 'fa-route' },
            { id: 'step4', label: 'Execution', icon: 'fa-play' },
            { id: 'step5', label: 'Output Collection', icon: 'fa-download' },
            { id: 'step6', label: 'Completion', icon: 'fa-check' }
        ];
        function updateWorkflowStepper(currentStep) {
            workflowSteps.forEach(function(step, idx) {
                var el = document.getElementById(step.id);
                if (!el) return;
                el.classList.remove('active', 'completed');
                if (idx < currentStep) el.classList.add('completed');
                else if (idx === currentStep) el.classList.add('active');
            });
        }
        // Poll backend for latest workflow/batch status
        function pollWorkflowStatus() {
            fetch('/api/latest_workflow_status')
                .then(res => res.json())
                .then(data => {
                    updateWorkflowStepper(data.currentStep);
                    // Always update latestPath and refresh map if changed
                    if (data.latestPath && JSON.stringify(data.latestPath) !== JSON.stringify(latestPath)) {
                        console.log('Workflow path changed:', data.latestPath);
                        latestPath = data.latestPath;
                        if (document.getElementById('workflow-map')) {
                            initWorkflowMap();
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error polling workflow status:', error);
                });
        }

        // Function to refresh map manually
        function refreshMap() {
            console.log('Manually refreshing map...');
            if (document.getElementById('workflow-map')) {
                initWorkflowMap();
            }
        }

        // Make refreshMap available globally for debugging
        window.refreshMap = refreshMap;

        document.addEventListener('DOMContentLoaded', function() {
            // ... existing code ...
            // Initialize workflow map and stepper
            if (document.getElementById('workflow-map')) {
                initWorkflowMap();
            }
            // Initialize flow map
            if (document.getElementById('flow-map')) {
                initFlowMap();
            }
            updateWorkflowStepper(0); // Default to first step
            setInterval(pollWorkflowStatus, 3000); // Poll every 3s
        });
        // === End Dynamic Workflow Process Stepper ===
    </script>

</body>
</html>
'''

@app.route('/')
def index():
    global batch_runs
    batch_runs = load_batch_runs()  # Always reload from file
    # Get workflow_path from query param or session
    workflow_path = request.args.get('workflow_path')
    if workflow_path:
        latest_path = workflow_path.split(',')
    else:
        # Fallback to batch/federated workflow path
        latest_path = []
        if batch_runs:
            latest_mode = batch_runs[-1]['mode']
            latest_type = batch_runs[-1].get('workflow_type', 'snakemake')
            filtered = [br for br in batch_runs if br['mode'] == latest_mode and br.get('workflow_type', 'snakemake') == latest_type]
            latest_path = [br['tes_name'] for br in filtered]
    return render_template_string(
        TEMPLATE,
        tes_instances=TES_INSTANCES,
        tes_gateway=TES_GATEWAY,
        tasks=submitted_tasks,
        workflow_runs=workflow_runs,
        batch_runs=batch_runs,
        tes_locations=tes_locations,
        storage_locations=storage_locations,
        latest_path=latest_path
    )

@app.route('/task_details')
def task_details():
    tes_url = request.args.get('tes_url')
    task_id = request.args.get('task_id')
    url = tes_url.rstrip('/') + f'/v1/tasks/{task_id}?view=FULL'
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None
    task_json = {}
    error = None
    try:
        resp = requests.get(url, headers=headers, auth=auth, timeout=10)
        resp.raise_for_status()
        task_json = resp.json()
    except Exception as e:
        error = str(e)
    # Determine if cancel is possible
    can_cancel = False
    state = task_json.get('state', '')
    if state not in ['COMPLETE', 'CANCELED', 'CANCELLED', 'EXECUTOR_ERROR', 'SYSTEM_ERROR']:
        can_cancel = True
    # Extract outputs and logs
    outputs = task_json.get('outputs', [])
    logs = task_json.get('logs', [])
    return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Details</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-o9N1j6kGQ8QbQvQ+1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw=" crossorigin="anonymous"/>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --main-bg: #fff;
            --main-bg-light: #f7f9fa;
            --main-bg-lighter: #f1f5f9;
            --main-bg-white: #fff;
            --sidebar-bg: #fff;
            --sidebar-text: #222b45;
            --sidebar-active: #f1f5f9;
            --card-bg: #fff;
            --card-bg-light: #f7f9fa;
            --card-bg-white: #fff;
            --text-primary: #222b45;
            --text-secondary: #4b5563;
            --text-muted: #94a3b8;
            --border-color: #e5e7eb;
            --border-color-light: #f1f5f9;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #2563eb;
            --shadow: 0 2px 8px rgba(0,0,0,0.04);
            --hover-bg: #f1f5f9;
            --hover-bg-light: #f7f9fa;
            --btn-bg: #4b5563;
            --btn-bg-hover: #374151;
            --btn-text: #fff;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--main-bg);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        .main-content {
            max-width: 900px;
            margin: 2rem auto;
            padding: 2rem;
        }
        .card {
            background: var(--card-bg);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
        }
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .alert {
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid;
        }
        .alert-error {
            background: rgba(239, 68, 68, 0.08);
            border-left-color: var(--error-color);
            color: var(--error-color);
        }
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        .badge-success {
            background: rgba(34, 197, 94, 0.12);
            color: var(--success-color);
        }
        .badge-error {
            background: rgba(239, 68, 68, 0.12);
            color: var(--error-color);
        }
        .badge-warning {
            background: rgba(245, 158, 11, 0.12);
            color: var(--warning-color);
        }
        .badge-info {
            background: rgba(37, 99, 235, 0.12);
            color: var(--info-color);
        }
        .btn {
            padding: 0.5rem 1.25rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow);
            background: var(--btn-bg);
            color: var(--btn-text);
        }
        .btn:hover {
            background: var(--btn-bg-hover);
            color: var(--btn-text);
            transform: translateY(-1px);
        }
        pre, code {
            background: var(--main-bg-light);
            color: var(--text-secondary);
            border-radius: 0.5rem;
            padding: 1rem;
            font-size: 0.95em;
            overflow-x: auto;
        }
        ul {
            margin: 0 0 1rem 1.5rem;
        }
        .output-list, .log-list {
            list-style: none;
            padding: 0;
        }
        .output-list li, .log-list li {
            margin-bottom: 0.5rem;
        }
      </style>
    </head>
    <body>
    <div class="main-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Task Details</h2>
          {% if task_json.state %}
            <span class="badge badge-{{ 'success' if task_json.state.upper() == 'COMPLETE' else 'warning' if task_json.state.upper() == 'RUNNING' else 'error' if task_json.state.upper() in ['ERROR', 'FAILED'] else 'info' }}" style="margin-left:1rem;">{{ task_json.state }}</span>
          {% endif %}
        </div>
        {% if error %}<div class="alert alert-error">{{ error }}</div>{% endif %}
        <div style="margin-bottom:1.5rem;">
          <h4 style="margin-bottom:0.5rem;">Raw JSON</h4>
    <pre>{{ task_json | tojson(indent=2) }}</pre>
        </div>
        <div style="margin-bottom:1.5rem;">
          <h4 style="margin-bottom:0.5rem;">Outputs</h4>
          <ul class="output-list">
    {% for out in outputs %}
            <li><code>{{ out }}</code></li>
          {% else %}
            <li><span class="text-muted">No outputs</span></li>
    {% endfor %}
    </ul>
        </div>
        <div style="margin-bottom:1.5rem;">
          <h4 style="margin-bottom:0.5rem;">Logs</h4>
          <ul class="log-list">
    {% for log in logs %}
      <li><pre>{{ log }}</pre></li>
          {% else %}
            <li><span class="text-muted">No logs</span></li>
    {% endfor %}
    </ul>
        </div>
    {% if can_cancel %}
        <form method="post" action="/cancel_task" style="margin-bottom:1.5rem;">
      <input type="hidden" name="tes_url" value="{{ tes_url }}" />
      <input type="hidden" name="task_id" value="{{ task_id }}" />
          <button type="submit" class="btn btn-danger"><i class="fas fa-ban"></i> Cancel Task</button>
    </form>
    {% endif %}
        <a href="/" class="btn" style="background: #f3f4f6; color: #222b45;"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
      </div>
    </div>
    </body>
    </html>
    ''', task_json=task_json, outputs=outputs, logs=logs, error=error, can_cancel=can_cancel, tes_url=tes_url, task_id=task_id)

@app.route('/cancel_task', methods=['POST'])
def cancel_task():
    tes_url = request.form['tes_url']
    task_id = request.form['task_id']
    url = tes_url.rstrip('/') + f'/v1/tasks/{task_id}:cancel'
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None
    try:
        resp = requests.post(url, headers=headers, auth=auth, timeout=10)
        resp.raise_for_status()
        flash('Task cancel request sent.', 'success')
    except Exception as e:
        flash(f'Failed to cancel task: {e}', 'error')
    return redirect(url_for('index'))

@app.route('/submit', methods=['POST'])
def submit():
    tes_url = request.form['tes_instance']
    task_type = request.form.get('task_type', 'simple')
    input_url = request.form.get('input_url', '').strip()
    output_url = request.form.get('output_url', '').strip()
    distribution_logic = request.form.get('distribution_logic', None)
    results = []
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    if tes_url == TES_GATEWAY and distribution_logic:
        headers['X-ProTES-Distribution-Logic'] = distribution_logic
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None

    def build_payload():
        if task_type == 'simple':
            return {
                "executors": [
                    {
                        "image": "alpine",
                        "command": ["echo", "hello"]
                    }
                ]
            }
        else:
            # Complex task: md5sum input file, output to FTP
            ftp_url = output_url
            if ftp_url.startswith('ftp://') and FTP_USER and FTP_PASSWORD and '@' not in ftp_url:
                ftp_url = ftp_url.replace('ftp://', f'ftp://{FTP_USER}:{FTP_PASSWORD}@')
            return {
                "name": "md5sum",
                "description": "calculate md5sum of input file and write to output file",
                "executors": [
                    {
                        "command": ["md5sum", "/data/input"],
                        "image": "alpine",
                        "stdout": "/data/output",
                        "workdir": "/data"
                    }
                ],
                "inputs": [
                    {
                        "url": input_url,
                        "path": "/data/input"
                    }
                ],
                "outputs": [
                    {
                        "path": "/data/output",
                        "url": ftp_url,
                        "type": "FILE"
                    }
                ],
                "resources": {
                    "cpu_cores": 1,
                    "disk_gb": 1,
                    "preemptible": False,
                    "ram_gb": 1
                }
            }

    payload = build_payload()

    workflow_path = []
    if tes_url == 'all':
        for inst in TES_INSTANCES:
            url = inst['url'].rstrip('/') + '/v1/tasks'
            print(f"DEBUG: Submitting to {inst['name']}")
            print(f"DEBUG: URL: {url}")
            
            # Get instance-specific credentials
            creds = get_instance_credentials(inst['name'], inst['url'])
            instance_auth = (creds['user'], creds['password']) if creds['user'] and creds['password'] else None
            instance_token = creds['token']
            
            print(f"DEBUG: Instance auth: {instance_auth}")
            print(f"DEBUG: Instance token: {instance_token}")
            
            # Try different authentication methods based on TES instance type
            current_auth = instance_auth
            current_headers = headers.copy()
            
            # For TESK instances, try token-based auth first, then fallback to basic auth
            if 'tesk' in inst['name'].lower():
                print(f"DEBUG: Using token auth for TESK instance")
                if instance_token:
                    current_headers['Authorization'] = f'Bearer {instance_token}'
                    current_auth = None  # Don't use basic auth with token
                else:
                    print(f"DEBUG: No instance token found, using basic auth")
            # For Funnel instances, use basic auth
            elif 'funnel' in inst['name'].lower():
                print(f"DEBUG: Using basic auth for Funnel instance")
                current_auth = instance_auth
                if 'Authorization' in current_headers:
                    del current_headers['Authorization']
            
            print(f"DEBUG: Final headers: {current_headers}")
            print(f"DEBUG: Final auth: {current_auth}")
            
            try:
                resp = requests.post(url, json=payload, headers=current_headers, auth=current_auth, timeout=10)
                print(f"DEBUG: Response status: {resp.status_code}")
                print(f"DEBUG: Response headers: {dict(resp.headers)}")
                if resp.status_code >= 400:
                    print(f"DEBUG: Response text: {resp.text[:500]}")
                    
                    # If token auth failed for TESK, try basic auth as fallback
                    if resp.status_code in [401, 403] and 'tesk' in inst['name'].lower() and instance_token:
                        print(f"DEBUG: Token auth failed, trying basic auth fallback")
                        current_headers = headers.copy()
                        if 'Authorization' in current_headers:
                            del current_headers['Authorization']
                        current_auth = instance_auth
                        print(f"DEBUG: Fallback headers: {current_headers}")
                        print(f"DEBUG: Fallback auth: {current_auth}")
                        
                        resp = requests.post(url, json=payload, headers=current_headers, auth=current_auth, timeout=10)
                        print(f"DEBUG: Fallback response status: {resp.status_code}")
                        if resp.status_code >= 400:
                            print(f"DEBUG: Fallback response text: {resp.text[:500]}")
                
                resp.raise_for_status()
                task_id = resp.json().get('id', '')
                submitted_tasks.append({'tes_name': inst['name'], 'tes_url': inst['url'], 'task_id': task_id, 'status': 'SUBMITTED', 'type': task_type})
                results.append(f"Submitted to {inst['name']} (Task ID: {task_id})")
                workflow_path.append(inst['name'])
            except Exception as e:
                results.append(f"Failed to submit to {inst['name']}: {e}")
    else:
        inst = next((i for i in TES_INSTANCES if i['url'] == tes_url), None)
        url = tes_url.rstrip('/') + '/v1/tasks'
        print(f"DEBUG: Submitting to single instance")
        print(f"DEBUG: URL: {url}")
        print(f"DEBUG: Auth: {auth}")
        try:
            resp = requests.post(url, json=payload, headers=headers, auth=auth, timeout=10)
            resp.raise_for_status()
            task_id = resp.json().get('id', '')
            submitted_tasks.append({'tes_name': inst['name'] if inst else tes_url, 'tes_url': tes_url, 'task_id': task_id, 'status': 'SUBMITTED', 'type': task_type})
            results.append(f"Submitted to {inst['name'] if inst else tes_url} (Task ID: {task_id})")
            if inst:
                workflow_path = [inst['name']]
        except Exception as e:
            results.append(f"Failed to submit to {inst['name'] if inst else tes_url}: {e}")
    for r in results:
        flash(r, 'success' if 'Submitted' in r else 'error')
    # Pass the workflow path to the index for visualization
    return redirect(url_for('index', workflow_path=','.join(workflow_path)))

@app.route('/submit_workflow', methods=['POST'])
def submit_workflow():
    wf_type = request.form.get('wf_type', 'cwl')
    tes_url = request.form.get('wf_tes_instance', '')
    wf_distribution_logic = request.form.get('wf_distribution_logic', None)
    run_id = str(uuid.uuid4())
    log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'wf_{run_id}.log')
    tes_name = next((i['name'] for i in TES_INSTANCES if i['url'] == tes_url), 'TES Gateway' if tes_url == TES_GATEWAY else tes_url)
    status = 'SUBMITTED'
    cmd = []
    env = os.environ.copy()
    if tes_url == TES_GATEWAY and wf_distribution_logic:
        env['CWLTES_EXTRA_HEADERS'] = f'X-ProTES-Distribution-Logic:{wf_distribution_logic}'
    
    # Function to run commands in Docker container
    def run_in_docker(cmd, env_vars=None, volumes=None):
        """Run a command inside the Docker container"""
        docker_cmd = ['docker', 'run', '--rm']
        
        # Add environment variables
        if env_vars:
            for key, value in env_vars.items():
                docker_cmd.extend(['-e', f'{key}={value}'])
        
        # Add volume mounts
        if volumes:
            for host_path, container_path in volumes.items():
                docker_cmd.extend(['-v', f'{host_path}:{container_path}'])
        
        # Add the image name and command
        docker_cmd.extend(['tes-dashboard:latest'] + cmd)
        return docker_cmd
    
    try:
        if wf_type == 'cwl':
            cwl_file = request.files['cwl_file']
            cwl_input = request.files['cwl_input']
            cwl_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{cwl_file.filename}')
            cwl_input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{cwl_input.filename}')
            cwl_file.save(cwl_path)
            cwl_input.save(cwl_input_path)
            
            # Build cwl-tes command for Docker
            cwl_cmd = [
                'cwl-tes',
                '--tes', tes_url,
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                '/app/uploads/' + os.path.basename(cwl_path),
                '/app/uploads/' + os.path.basename(cwl_input_path)
            ]
            
            # Set up Docker environment variables
            docker_env = {
                'TES_URL': tes_url,
                'FUNNEL_SERVER_USER': FUNNEL_SERVER_USER,
                'FUNNEL_SERVER_PASSWORD': FUNNEL_SERVER_PASSWORD
            }
            if tes_url == TES_GATEWAY and wf_distribution_logic:
                docker_env['CWLTES_EXTRA_HEADERS'] = f'X-ProTES-Distribution-Logic:{wf_distribution_logic}'
            
            # Set up volume mounts
            volumes = {
                os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
            }
            
            # Build Docker command
            cmd = run_in_docker(cwl_cmd, docker_env, volumes)
        elif wf_type == 'snakemake':
            snakefile = request.files.get('snakefile')
            smk_dir = request.files.get('smk_dir')
            snakefile_path = None
            smk_dir_path = None
            if snakefile:
                snakefile_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{snakefile.filename}')
                snakefile.save(snakefile_path)
            if smk_dir:
                smk_dir_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{smk_dir.filename}')
                smk_dir.save(smk_dir_path)
            
            # Build snakemake command for Docker
            snakemake_cmd = [
                'snakemake',
                '--snakefile', '/app/uploads/' + os.path.basename(snakefile_path) if snakefile_path else '',
                '--tes', tes_url,
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                '--cores', '1',
                '--jobs', '1',
                '--forceall',
                '--rerun-incomplete'
            ]
            if smk_dir_path:
                snakemake_cmd.extend(['--directory', '/app/uploads/' + os.path.basename(smk_dir_path)])
            
            # Set up Docker environment variables
            docker_env = {
                'TES_URL': tes_url,
                'FUNNEL_SERVER_USER': FUNNEL_SERVER_USER,
                'FUNNEL_SERVER_PASSWORD': FUNNEL_SERVER_PASSWORD
            }
            
            # Set up volume mounts
            volumes = {
                os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
            }
            
            # Build Docker command
            cmd = run_in_docker(snakemake_cmd, docker_env, volumes)
        elif wf_type == 'nextflow':
            nextflow_file = request.files.get('nextflow_file')
            nextflow_config = request.files.get('nextflow_config')
            nextflow_params = request.form.get('nextflow_params', '{}')
            nextflow_path = None
            nextflow_config_path = None
            if nextflow_file:
                nextflow_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{nextflow_file.filename}')
                nextflow_file.save(nextflow_path)
            if nextflow_config:
                nextflow_config_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{nextflow_config.filename}')
                nextflow_config.save(nextflow_config_path)
            
            # Build nextflow command for Docker
            nextflow_cmd = [
                'nextflow',
                'run',
                '/app/uploads/' + os.path.basename(nextflow_path) if nextflow_path else '',
                '-profile', 'tes',
                '--outdir', f'/app/uploads/{run_id}_results',
                '--tes_url', tes_url,
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume'
            ]
            
            # Add config file if provided
            if nextflow_config_path:
                nextflow_cmd.extend(['-C', '/app/uploads/' + os.path.basename(nextflow_config_path)])
            
            # Add parameters if provided
            if nextflow_params and nextflow_params != '{}':
                nextflow_cmd.extend(['--params', nextflow_params])
            
            # Set up Docker environment variables
            docker_env = {
                'TES_URL': tes_url,
                'TES_USER': FUNNEL_SERVER_USER,
                'TES_PASSWORD': FUNNEL_SERVER_PASSWORD
            }
            
            # Set up volume mounts
            volumes = {
                os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
            }
            
            # Build Docker command
            cmd = run_in_docker(nextflow_cmd, docker_env, volumes)
        
        # Run the workflow in the background
        with open(log_file, 'w') as logf:
            subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
        workflow_runs.append({'type': wf_type, 'tes_name': tes_name, 'status': status, 'run_id': run_id, 'log_file': log_file})
        flash(f"Workflow submitted: {wf_type} (Run ID: {run_id})", 'success')
        
        # Create workflow path for map visualization
        workflow_path = [tes_name]
    except Exception as e:
        flash(f"Failed to submit workflow: {e}", 'error')
        return redirect(url_for('index'))
    
    # Pass the workflow path to the index for visualization
    return redirect(url_for('index', workflow_path=','.join(workflow_path)))

@app.route('/workflow_log/<run_id>')
def workflow_log(run_id):
    wf = next((w for w in workflow_runs if w['run_id'] == run_id), None)
    if not wf:
        return 'Log not found', 404
    log_file = wf['log_file']
    if not os.path.exists(log_file):
        return 'Log file not found', 404
    with open(log_file) as f:
        content = f.read()
    return f'<pre>{content}</pre>'

@app.route('/status')
def status():
    tes_url = request.args.get('tes_url')
    task_id = request.args.get('task_id')
    url = tes_url.rstrip('/') + f'/v1/tasks/{task_id}'
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None
    status = 'UNKNOWN'
    try:
        resp = requests.get(url, headers=headers, auth=auth, timeout=10)
        resp.raise_for_status()
        status = resp.json().get('state', 'UNKNOWN')
        # Update in-memory status
        for t in submitted_tasks:
            if t['tes_url'] == tes_url and t['task_id'] == task_id:
                t['status'] = status
    except Exception as e:
        flash(f"Failed to get status: {e}", 'error')
    return redirect(url_for('index'))

@app.route('/list_tasks')
def list_tasks():
    tes_url = request.args.get('tes_url')
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None
    error = None
    tasks = []
    try:
        url = tes_url.rstrip('/') + '/v1/tasks'
        resp = requests.get(url, headers=headers, auth=auth, timeout=10)
        resp.raise_for_status()
        tasks = resp.json().get('tasks', [])
    except Exception as e:
        error = str(e)
    # Visualization: count tasks by state
    state_counts = {}
    for t in tasks:
        state = t.get('state', 'UNKNOWN')
        state_counts[state] = state_counts.get(state, 0) + 1
    # Prepare data for Chart.js
    chart_labels = list(state_counts.keys())
    chart_data = list(state_counts.values())
    pie_colors = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(201, 203, 207, 0.7)'
    ]
    return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>All Tasks for TES Instance</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-o9N1j6kGQ8QbQvQ+1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw=" crossorigin="anonymous"/>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --main-bg: #fff;
            --main-bg-light: #f7f9fa;
            --main-bg-lighter: #f1f5f9;
            --main-bg-white: #fff;
            --sidebar-bg: #fff;
            --sidebar-text: #222b45;
            --sidebar-active: #f1f5f9;
            --card-bg: #fff;
            --card-bg-light: #f7f9fa;
            --card-bg-white: #fff;
            --text-primary: #222b45;
            --text-secondary: #4b5563;
            --text-muted: #94a3b8;
            --border-color: #e5e7eb;
            --border-color-light: #f1f5f9;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #2563eb;
            --shadow: 0 2px 8px rgba(0,0,0,0.04);
            --hover-bg: #f1f5f9;
            --hover-bg-light: #f7f9fa;
            --btn-bg: #4b5563;
            --btn-bg-hover: #374151;
            --btn-text: #fff;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--main-bg);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        .main-content {
            max-width: 1100px;
            margin: 2rem auto;
            padding: 2rem;
        }
        .card {
            background: var(--card-bg);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
        }
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .alert {
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid;
        }
        .alert-error {
            background: rgba(239, 68, 68, 0.08);
            border-left-color: var(--error-color);
            color: var(--error-color);
        }
        .table-container {
            overflow-x: auto;
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            box-shadow: var(--shadow);
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            background: var(--card-bg);
        }
        .table th, .table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        .table th {
            background: var(--main-bg-light);
            font-weight: 600;
            color: var(--text-primary);
        }
        .table tr:hover {
            background: var(--hover-bg-light);
        }
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        .badge-success {
            background: rgba(34, 197, 94, 0.12);
            color: var(--success-color);
        }
        .badge-error {
            background: rgba(239, 68, 68, 0.12);
            color: var(--error-color);
        }
        .badge-warning {
            background: rgba(245, 158, 11, 0.12);
            color: var(--warning-color);
        }
        .badge-info {
            background: rgba(37, 99, 235, 0.12);
            color: var(--info-color);
        }
        .btn {
            padding: 0.5rem 1.25rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow);
            background: var(--btn-bg);
            color: var(--btn-text);
        }
        .btn:hover {
            background: var(--btn-bg-hover);
            color: var(--btn-text);
            transform: translateY(-1px);
        }
      </style>
    </head>
    <body>
    <div class="main-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">All Tasks for TES Instance</h2>
        </div>
        {% if error %}<div class="alert alert-error">{{ error }}</div>{% endif %}
        <div class="table-container">
          <table class="table">
            <thead>
      <tr><th>Task ID</th><th>Name</th><th>State</th><th>Details</th></tr>
            </thead>
            <tbody>
      {% for t in tasks %}
      <tr>
                <td><code>{{ t['id'] }}</code></td>
        <td>{{ t.get('name', '') }}</td>
                <td>
                  <span class="badge badge-{{ 'success' if t.get('state','').upper() == 'COMPLETE' else 'warning' if t.get('state','').upper() == 'RUNNING' else 'error' if t.get('state','').upper() in ['ERROR', 'FAILED'] else 'info' }}">
                    {{ t.get('state', '') }}
                  </span>
                </td>
                <td><a href="/task_details?tes_url={{ tes_url }}&task_id={{ t['id'] }}" class="btn">Details</a></td>
      </tr>
      {% endfor %}
            </tbody>
    </table>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Task State Distribution</h3>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 2rem; align-items: flex-start;">
          <div>
    <canvas id="stateChart" width="400" height="200"></canvas>
          </div>
          <div>
    <canvas id="statePieChart" width="400" height="200"></canvas>
          </div>
          <div>
            <ul style="margin-top: 1rem;">
    {% for state, count in state_counts.items() %}
              <li><span class="badge badge-info">{{ state }}</span>: <b>{{ count }}</b></li>
    {% endfor %}
    </ul>
          </div>
        </div>
      </div>
      <a href="/" class="btn" style="margin-top: 1.5rem; background: #f3f4f6; color: #222b45;">&larr; Back to Dashboard</a>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      var ctx = document.getElementById('stateChart').getContext('2d');
      var stateChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: {{ chart_labels|tojson }},
          datasets: [{
            label: 'Number of Tasks',
            data: {{ chart_data|tojson }},
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
              precision: 0
            }
          }
        }
      });
      var pieCtx = document.getElementById('statePieChart').getContext('2d');
      var statePieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: {{ chart_labels|tojson }},
          datasets: [{
            data: {{ chart_data|tojson }},
            backgroundColor: {{ pie_colors|tojson }},
            borderColor: 'rgba(255,255,255,1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Task State Distribution (Pie Chart)'
            }
          }
        }
      });
    </script>
    </body>
    </html>
    ''', tasks=tasks, tes_url=tes_url, error=error, state_counts=state_counts, chart_labels=chart_labels, chart_data=chart_data, pie_colors=pie_colors)

@app.route('/service_info')
def service_info():
    tes_url = request.args.get('tes_url')
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None
    error = None
    info = {}
    try:
        url = tes_url.rstrip('/') + '/v1/service-info'
        resp = requests.get(url, headers=headers, auth=auth, timeout=10)
        resp.raise_for_status()
        info = resp.json()
    except Exception as e:
        error = str(e)
    return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Service Info</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-o9N1j6kGQ8QbQvQ+1Qw1Qw1Qw1Qw1Qw1Qw1Qw1Qw=" crossorigin="anonymous"/>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --main-bg: #fff;
            --main-bg-light: #f7f9fa;
            --main-bg-lighter: #f1f5f9;
            --main-bg-white: #fff;
            --sidebar-bg: #fff;
            --sidebar-text: #222b45;
            --sidebar-active: #f1f5f9;
            --card-bg: #fff;
            --card-bg-light: #f7f9fa;
            --card-bg-white: #fff;
            --text-primary: #222b45;
            --text-secondary: #4b5563;
            --text-muted: #94a3b8;
            --border-color: #e5e7eb;
            --border-color-light: #f1f5f9;
            --success-color: #22c55e;
            --error-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #2563eb;
            --shadow: 0 2px 8px rgba(0,0,0,0.04);
            --hover-bg: #f1f5f9;
            --hover-bg-light: #f7f9fa;
            --btn-bg: #4b5563;
            --btn-bg-hover: #374151;
            --btn-text: #fff;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--main-bg);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        .main-content {
            max-width: 900px;
            margin: 2rem auto;
            padding: 2rem;
        }
        .card {
            background: var(--card-bg);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
        }
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .alert {
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            border-left: 4px solid;
        }
        .alert-error {
            background: rgba(239, 68, 68, 0.08);
            border-left-color: var(--error-color);
            color: var(--error-color);
        }
        .btn {
            padding: 0.5rem 1.25rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow);
            background: var(--btn-bg);
            color: var(--btn-text);
        }
        .btn:hover {
            background: var(--btn-bg-hover);
            color: var(--btn-text);
            transform: translateY(-1px);
        }
        pre, code {
            background: var(--main-bg-light);
            color: var(--text-secondary);
            border-radius: 0.5rem;
            padding: 1rem;
            font-size: 0.95em;
            overflow-x: auto;
        }
      </style>
    </head>
    <body>
    <div class="main-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Service Info</h2>
        </div>
        {% if error %}<div class="alert alert-error">{{ error }}</div>{% endif %}
    <pre>{{ info | tojson(indent=2) }}</pre>
        <a href="/" class="btn" style="background: #f3f4f6; color: #222b45;"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
      </div>
    </div>
    </body>
    </html>
    ''', info=info, error=error)

@app.route('/batch_snakemake', methods=['POST'])
def batch_snakemake():
    batch_mode = request.form.get('batch_mode')
    snakefile = request.files.get('batch_snakefile')
    smk_dir = request.files.get('batch_smk_dir')
    run_ids = []
    workflow_path = []
    
    if not snakefile:
        flash('Snakefile is required.', 'error')
        return redirect(url_for('index'))
    
    # Function to run commands in Docker container
    def run_in_docker(cmd, env_vars=None, volumes=None):
        """Run a command inside the Docker container"""
        docker_cmd = ['docker', 'run', '--rm']
        
        # Add environment variables
        if env_vars:
            for key, value in env_vars.items():
                docker_cmd.extend(['-e', f'{key}={value}'])
        
        # Add volume mounts
        if volumes:
            for host_path, container_path in volumes.items():
                docker_cmd.extend(['-v', f'{host_path}:{container_path}'])
        
        # Add the image name and command
        docker_cmd.extend(['tes-dashboard:latest'] + cmd)
        return docker_cmd
    
    snakefile_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}_{snakefile.filename}')
    snakefile.save(snakefile_path)
    smk_dir_path = None
    if smk_dir and smk_dir.filename:
        smk_dir_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}_{smk_dir.filename}')
        smk_dir.save(smk_dir_path)
    env = os.environ.copy()
    if batch_mode == 'all':
        for inst in TES_INSTANCES:
            run_id = str(uuid.uuid4())
            log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
            # Build snakemake command for Docker
            snakemake_cmd = [
                'snakemake',
                '--snakefile', '/app/uploads/' + os.path.basename(snakefile_path),
                '--tes', inst['url'],
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                '--cores', '1',
                '--jobs', '1',
                '--forceall',
                '--rerun-incomplete'
            ]
            if smk_dir_path:
                snakemake_cmd.extend(['--directory', '/app/uploads/' + os.path.basename(smk_dir_path)])
            
            # Set up Docker environment variables
            docker_env = {
                'TES_URL': inst['url'],
                'FUNNEL_SERVER_USER': FUNNEL_SERVER_USER,
                'FUNNEL_SERVER_PASSWORD': FUNNEL_SERVER_PASSWORD
            }
            
            # Set up volume mounts
            volumes = {
                os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
            }
            
            # Build Docker command
            cmd = run_in_docker(snakemake_cmd, docker_env, volumes)
            with open(log_file, 'w') as logf:
                subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
            batch_runs.append({'mode': 'all', 'tes_name': inst['name'], 'status': 'SUBMITTED', 'run_id': run_id, 'log_file': log_file, 'workflow_type': 'snakemake'})
            save_batch_runs(batch_runs)
            run_ids.append(run_id)
            workflow_path.append(inst['name'])
        flash(f'Batch Snakemake submitted to all TES instances.', 'success')
    elif batch_mode == 'gateway':
        run_id = str(uuid.uuid4())
        log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
        # Build snakemake command for Docker
        snakemake_cmd = [
            'snakemake',
            '--snakefile', '/app/uploads/' + os.path.basename(snakefile_path),
            '--tes', TES_GATEWAY,
            '--user', FUNNEL_SERVER_USER,
            '--password', FUNNEL_SERVER_PASSWORD,
            '--cores', '1',
            '--jobs', '1',
            '--forceall',
            '--rerun-incomplete'
        ]
        if smk_dir_path:
            snakemake_cmd.extend(['--directory', '/app/uploads/' + os.path.basename(smk_dir_path)])
        
        # Set up Docker environment variables
        docker_env = {
            'TES_URL': TES_GATEWAY,
            'FUNNEL_SERVER_USER': FUNNEL_SERVER_USER,
            'FUNNEL_SERVER_PASSWORD': FUNNEL_SERVER_PASSWORD
        }
        
        # Set up volume mounts
        volumes = {
            os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
        }
        
        # Build Docker command
        cmd = run_in_docker(snakemake_cmd, docker_env, volumes)
        with open(log_file, 'w') as logf:
            subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
        batch_runs.append({'mode': 'gateway', 'tes_name': 'TES Gateway', 'status': 'SUBMITTED', 'run_id': run_id, 'log_file': log_file, 'workflow_type': 'snakemake'})
        save_batch_runs(batch_runs)
        run_ids.append(run_id)
        workflow_path = ['TES Gateway']
        flash(f'Federated Snakemake submitted via TES Gateway.', 'success')
    else:
        flash('Invalid batch mode.', 'error')
        return redirect(url_for('index'))
    
    # Pass the workflow path to the index for visualization
    return redirect(url_for('index', workflow_path=','.join(workflow_path)))

@app.route('/batch_nextflow', methods=['POST'])
def batch_nextflow():
    batch_mode = request.form.get('batch_mode')
    nextflow_file = request.files.get('batch_nextflow_file')
    nextflow_config = request.files.get('batch_nextflow_config')
    nextflow_params = request.form.get('batch_nextflow_params', '{}')
    run_ids = []
    workflow_path = []
    
    if not nextflow_file:
        flash('Nextflow script is required.', 'error')
        return redirect(url_for('index'))
    
    nextflow_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}_{nextflow_file.filename}')
    nextflow_file.save(nextflow_path)
    
    nextflow_config_path = None
    if nextflow_config and nextflow_config.filename:
        nextflow_config_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}_{nextflow_config.filename}')
        nextflow_config.save(nextflow_config_path)
    
    env = os.environ.copy()
    
    if batch_mode == 'all':
        for inst in TES_INSTANCES:
            run_id = str(uuid.uuid4())
            log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
            
            # Set TES environment variables
            env['TES_URL'] = inst['url']
            env['TES_USER'] = FUNNEL_SERVER_USER
            env['TES_PASSWORD'] = FUNNEL_SERVER_PASSWORD
            
            # Build nextflow command for Docker
            nextflow_cmd = [
                'nextflow',
                'run',
                '/app/uploads/' + os.path.basename(nextflow_path),
                '-profile', 'tes',
                '--outdir', f'/app/uploads/{run_id}_results',
                '--tes_url', inst['url'],
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume'
            ]
            
            # Add config file if provided
            if nextflow_config_path:
                nextflow_cmd.extend(['-C', '/app/uploads/' + os.path.basename(nextflow_config_path)])
            
            # Add parameters if provided
            if nextflow_params and nextflow_params != '{}':
                nextflow_cmd.extend(['--params', nextflow_params])
            
            # Set up Docker environment variables
            docker_env = {
                'TES_URL': inst['url'],
                'TES_USER': FUNNEL_SERVER_USER,
                'TES_PASSWORD': FUNNEL_SERVER_PASSWORD
            }
            
            # Set up volume mounts
            volumes = {
                os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
            }
            
            # Build Docker command
            cmd = run_in_docker(nextflow_cmd, docker_env, volumes)
            with open(log_file, 'w') as logf:
                subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
            batch_runs.append({
                'mode': 'all',
                'tes_name': inst['name'],
                'status': 'SUBMITTED',
                'run_id': run_id,
                'log_file': log_file,
                'workflow_type': 'nextflow'
            })
            save_batch_runs(batch_runs)
            run_ids.append(run_id)
            workflow_path.append(inst['name'])
        flash(f'Batch Nextflow submitted to all TES instances.', 'success')
    elif batch_mode == 'gateway':
        run_id = str(uuid.uuid4())
        log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
        
        # Set TES environment variables
        env['TES_URL'] = TES_GATEWAY
        env['TES_USER'] = FUNNEL_SERVER_USER
        env['TES_PASSWORD'] = FUNNEL_SERVER_PASSWORD
        
        # Build nextflow command for Docker
        nextflow_cmd = [
            'nextflow',
            'run',
            '/app/uploads/' + os.path.basename(nextflow_path),
            '-profile', 'tes',
            '--outdir', f'/app/uploads/{run_id}_results',
            '--tes_url', TES_GATEWAY,
            '--tes_user', FUNNEL_SERVER_USER,
            '--tes_password', FUNNEL_SERVER_PASSWORD,
            '-resume'
        ]
        
        # Add config file if provided
        if nextflow_config_path:
            nextflow_cmd.extend(['-C', '/app/uploads/' + os.path.basename(nextflow_config_path)])
        
        # Add parameters if provided
        if nextflow_params and nextflow_params != '{}':
            nextflow_cmd.extend(['--params', nextflow_params])
        
        # Set up Docker environment variables
        docker_env = {
            'TES_URL': TES_GATEWAY,
            'TES_USER': FUNNEL_SERVER_USER,
            'TES_PASSWORD': FUNNEL_SERVER_PASSWORD
        }
        
        # Set up volume mounts
        volumes = {
            os.path.abspath(app.config['UPLOAD_FOLDER']): '/app/uploads'
        }
        
        # Build Docker command
        cmd = run_in_docker(nextflow_cmd, docker_env, volumes)
        with open(log_file, 'w') as logf:
            subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
        batch_runs.append({
            'mode': 'gateway',
            'tes_name': 'TES Gateway',
            'status': 'SUBMITTED',
            'run_id': run_id,
            'log_file': log_file,
            'workflow_type': 'nextflow'
        })
        save_batch_runs(batch_runs)
        run_ids.append(run_id)
        workflow_path = ['TES Gateway']
        flash(f'Federated Nextflow submitted via TES Gateway.', 'success')
    else:
        flash('Invalid batch mode.', 'error')
    
    return redirect(url_for('index', workflow_path=','.join(workflow_path)))

@app.route('/batch_log/<run_id>')
def batch_log(run_id):
    br = next((b for b in batch_runs if b['run_id'] == run_id), None)
    if not br:
        return 'Log not found', 404
    log_file = br['log_file']
    if not os.path.exists(log_file):
        return 'Log file not found', 404
    with open(log_file) as f:
        content = f.read()
    return f'<pre>{content}</pre>'

@app.route('/debug_env')
def debug_env():
    import subprocess
    import sys
    def run_cmd(cmd):
        try:
            out = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, universal_newlines=True)
            return f"<pre>{out}</pre>"
        except Exception as e:
            return f"<pre>ERROR: {e}</pre>"
    
    def run_docker_cmd(cmd):
        try:
            docker_cmd = ['docker', 'run', '--rm', 'tes-dashboard:latest'] + cmd
            out = subprocess.check_output(docker_cmd, stderr=subprocess.STDOUT, universal_newlines=True)
            return f"<pre>{out}</pre>"
        except Exception as e:
            return f"<pre>ERROR: {e}</pre>"
    
    html = "<h2>Environment Debug</h2>"
    html += f"<b>sys.executable:</b> {sys.executable}<br>"
    html += f"<b>PATH:</b> {os.environ.get('PATH')}<br>"
    html += "<b>Docker nextflow -version:</b> " + run_docker_cmd(['nextflow', '-version']) + "<br>"
    html += "<b>Docker snakemake --version:</b> " + run_docker_cmd(['snakemake', '--version']) + "<br>"
    html += "<b>Docker cwl-tes --version:</b> " + run_docker_cmd(['cwl-tes', '--version']) + "<br>"
    html += "<b>Docker java -version:</b> " + run_docker_cmd(['java', '-version']) + "<br>"
    return html

# Add a new API endpoint to provide latest workflow status and path
@app.route('/api/latest_workflow_status')
def api_latest_workflow_status():
    # Determine the current step for the latest workflow or batch run
    # For demo: use the last batch_run or workflow_run, and map status to step
    step_map = {
        'SUBMITTED': 0,
        'RUNNING': 3,
        'COMPLETE': 5,
        'CANCELED': 5,
        'CANCELLED': 5,
        'ERROR': 5,
        'FAILED': 5
    }
    currentStep = 0
    latestPath = []
    # Prefer batch_runs, then workflow_runs
    if batch_runs:
        last = batch_runs[-1]
        currentStep = step_map.get(last.get('status', 'SUBMITTED').upper(), 0)
        latestPath = [last['tes_name']]
    elif workflow_runs:
        last = workflow_runs[-1]
        currentStep = step_map.get(last.get('status', 'SUBMITTED').upper(), 0)
        latestPath = [last['tes_name']]
    return {'currentStep': currentStep, 'latestPath': latestPath}

# Add debug endpoint
@app.route('/api/debug')
def api_debug():
    return {
        'tes_locations': tes_locations,
        'storage_locations': storage_locations,
        'tes_instances': TES_INSTANCES,
        'submitted_tasks': submitted_tasks,
        'workflow_runs': workflow_runs,
        'batch_runs': batch_runs,
        'latest_path': request.args.get('workflow_path', '').split(',') if request.args.get('workflow_path') else []
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)