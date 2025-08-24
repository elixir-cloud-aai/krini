import os
os.environ['PATH'] = '/usr/local/bin:/usr/bin:' + os.environ.get('PATH', '')
from flask import Flask, render_template_string, request, redirect, url_for, flash, send_from_directory, send_file, session, jsonify
from dotenv import load_dotenv
from pathlib import Path
from flask_cors import CORS
import requests
import subprocess
import uuid
import json
from datetime import datetime
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
# Configure CORS to allow requests from React frontend
CORS(app, 
     origins=['http://localhost:3000', 'http://127.0.0.1:3000'], 
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
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
save_batch_runs(batch_runs)  # Store batch/federated workflow runs

# HTML template (modern, professional dark theme)
TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TES Dashboard - Professional</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
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
            height: 500px;
            border-radius: 0.75rem;
            overflow: hidden;
            border: 1px solid var(--border-color);
            background: var(--card-bg);
            position: relative;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        #workflow-map::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(37,99,235,0.02) 0%, rgba(34,197,94,0.02) 100%);
            pointer-events: none;
            z-index: 1;
        }

        #workflow-map .leaflet-container {
            border-radius: 0.75rem;
            z-index: 2;
            position: relative;
        }

        .map-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            background: rgba(255,255,255,0.95);
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            color: var(--text-primary);
        }

        .map-error {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.2);
            padding: 1rem 2rem;
            border-radius: 0.5rem;
            text-align: center;
            color: var(--error-color);
            font-weight: 500;
        }

        .map-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: flex;
            gap: 0.5rem;
        }

        .map-control-btn {
            background: rgba(255,255,255,0.95);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .map-control-btn:hover {
            background: rgba(255,255,255,1);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .map-legend {
            position: absolute;
            bottom: 10px;
            left: 10px;
            z-index: 1000;
            background: rgba(255,255,255,0.95);
            border: 1px solid var(--border-color);
            border-radius: 0.5rem;
            padding: 0.75rem;
            font-size: 0.875rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .map-legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
        }

        .map-legend-item:last-child {
            margin-bottom: 0;
        }

        .map-legend-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.8);
        }

        .tes-marker {
            filter: grayscale(0.3) brightness(0.9);
            transition: all 0.3s ease;
        }

        .tes-marker:hover {
            filter: none;
            transform: scale(1.1);
        }

        .tes-marker-active {
            filter: none !important;
            animation: pulse-glow 2s infinite alternate;
        }

        @keyframes pulse-glow {
            0% { 
                box-shadow: 0 0 0 0 rgba(37,99,235,0.4);
                transform: scale(1);
            }
            100% { 
                box-shadow: 0 0 0 12px rgba(37,99,235,0);
                transform: scale(1.05);
            }
        }

        .tes-marker-active i {
            animation: bounce 1s infinite alternate;
        }

        @keyframes bounce {
            0% { transform: translateY(0); }
            100% { transform: translateY(-3px); }
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

        /* TES Instance Summary Table Improvements */
        .tes-summary-table {
          font-size: 0.97em;
          min-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .tes-summary-table th, .tes-summary-table td {
          padding: 0.55rem 0.7rem;
          vertical-align: middle;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          max-width: 220px;
        }
        .tes-summary-table th {
          font-size: 0.98em;
          font-weight: 600;
          background: var(--main-bg-light);
          color: var(--text-primary);
          border-bottom: 1.5px solid var(--border-color);
        }
        .tes-summary-table td {
          font-size: 0.96em;
          color: var(--text-secondary);
          background: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
        }
        .tes-summary-table td a {
          color: #2563eb;
          text-decoration: underline;
          font-size: 0.96em;
          word-break: break-all;
        }
        .tes-summary-table .badge-info {
          font-size: 0.92em;
          padding: 0.18em 0.7em;
          border-radius: 0.7em;
          background: #f1f5f9;
          color: #2563eb;
          margin-left: 0.2em;
        }
        @media (max-width: 900px) {
          .tes-summary-table th, .tes-summary-table td {
            max-width: 120px;
            font-size: 0.93em;
            padding: 0.4rem 0.4rem;
          }
          .tes-summary-table .badge-info {
            font-size: 0.88em;
            padding: 0.13em 0.5em;
          }
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
                <div class="nav-item">
                    <a href="#topology-map" class="nav-link" onclick="showTab('topology-map', event)">
                        <i class="fas fa-map-marked-alt"></i>
                        Topology Map
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
                                        <a href="/task_log/{{ task['task_id'] }}" class="btn btn-secondary btn-sm" style="margin-left:0.5rem;">
                                            <i class="fas fa-file-alt"></i> View Log
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

            <!-- Topology Map Tab -->
            <div id="topology-map" class="tab-content">
                <div class="content-header">
                    <h2>Topology Map</h2>
                    <p>Explore the global distribution of TES instances with interactive icons, animated workflow paths, and beautiful info cards.</p>
                </div>
                <div class="card" style="box-shadow: 0 4px 24px rgba(37,99,235,0.08);">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-globe-europe"></i> TES Instance Topology</h3>
                        <p class="card-subtitle">Geographic distribution of TES instances with animated markers and info popups</p>
                    </div>
                    <div id="topology-leaflet-map" style="min-height: 540px; height: 540px; border-radius: 1rem; overflow: hidden; border: 2px solid var(--border-color); background: var(--card-bg); box-shadow: 0 8px 32px rgba(37,99,235,0.10);"></div>
                    <div id="topology-legend" style="margin-top: 1rem; display: flex; gap: 2rem; align-items: center;">
                        <span><i class="fas fa-map-marker-alt" style="color:#2563eb;"></i> TES Instance</span>
                        <span><i class="fas fa-database" style="color:#f59e0b;"></i> Storage</span>
                        <span><i class="fas fa-long-arrow-alt-right" style="color:#2563eb;"></i> Input Data</span>
                        <span><i class="fas fa-long-arrow-alt-right" style="color:#22c55e;"></i> Output Data</span>
                        <span><i class="fas fa-undo-alt" style="color:#22c55e;"></i> Local Output</span>
                    </div>
                </div>
                <div class="card" style="margin-top:2rem; box-shadow: 0 4px 24px rgba(37,99,235,0.08);">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-server"></i> TES Instance Summary</h3>
                        <p class="card-subtitle">All registered TES instances with location and status</p>
                    </div>
                    <div class="table-container">
                        <table class="table" style="font-size:0.9em;">
                            <thead>
                                <tr>
                                    <th><i class="fas fa-server"></i> Name</th>
                                    <th><i class="fas fa-globe"></i> Country</th>
                                    <th><i class="fas fa-network-wired"></i> IP</th>
                                    <th><i class="fas fa-link"></i> URL</th>
                                    <th><i class="fas fa-map-marker-alt"></i> Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for inst in tes_locations %}
                                <tr>
                                    <td><i class="fas fa-server" style="color:#2563eb;"></i> {{ inst.name }}</td>
                                    <td>{{ inst.country or 'N/A' }}</td>
                                    <td><code>{{ inst.ip or 'N/A' }}</code></td>
                                    <td><a href="{{ inst.url }}" target="_blank" style="color:#2563eb; text-decoration:underline;">{{ inst.url }}</a></td>
                                    <td>{% if inst.lat and inst.lon %}<span class="badge badge-info">{{ inst.lat|round(2) }}, {{ inst.lon|round(2) }}</span>{% else %}<span class="badge badge-warning">Unknown</span>{% endif %}</td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>
                <!-- Static Topology SVG Map (Presentation Style) -->
                <div class="card" style="margin-top:2rem; box-shadow: 0 4px 24px rgba(37,99,235,0.08);">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-project-diagram"></i> Static Topology Diagram (Presentation Style)</h3>
                        <p class="card-subtitle">A clear, step-by-step map showing how workflows and data move through the system</p>
                    </div>
                    <div style="overflow-x:auto; text-align:center; padding:2rem 0;">
                        <!-- Static SVG container -->
                        <div id="topology-static-svg">
                            <svg viewBox="0 0 1100 600" width="95%" style="max-width:1100px; height:auto; background:transparent;">
                                <!-- User Node (Submit) -->
                                <g id="user-node-submit">
                                    <circle cx="100" cy="300" r="38" fill="#e0e7ff" stroke="#6366f1" stroke-width="4"/>
                                    <text x="100" y="310" font-size="38" text-anchor="middle" alignment-baseline="middle">👤</text>
                                    <text x="100" y="355" font-size="18" text-anchor="middle" fill="#222">User</text>
                                    <text x="100" y="280" font-size="13" text-anchor="middle" fill="#6366f1">(You)</text>
                                </g>
                                <!-- Input Storage Node (Upper Left) -->
                                <g id="input-storage-node">
                                    <rect x="320" y="120" width="110" height="70" rx="16" fill="#fffbe6" stroke="#f59e0b" stroke-width="4"/>
                                    <text x="375" y="160" font-size="32" text-anchor="middle" alignment-baseline="middle">🗄️</text>
                                    <text x="375" y="190" font-size="16" text-anchor="middle" fill="#b08900">Input Storage</text>
                                </g>
                                <!-- TES Compute Node (Center) -->
                                <g id="tes-node">
                                    <rect x="520" y="260" width="180" height="90" rx="18" fill="#fff" stroke="#2563eb" stroke-width="5"/>
                                    <text x="610" y="315" font-size="38" text-anchor="middle" alignment-baseline="middle">⚙️</text>
                                    <text x="610" y="345" font-size="16" text-anchor="middle" fill="#2563eb">TES Compute</text>
                                </g>
                                <!-- Output Storage Node (Lower Right) -->
                                <g id="output-storage-node">
                                    <rect x="820" y="420" width="110" height="70" rx="16" fill="#fffbe6" stroke="#f59e0b" stroke-width="4"/>
                                    <text x="875" y="460" font-size="32" text-anchor="middle" alignment-baseline="middle">🗄️</text>
                                    <text x="875" y="490" font-size="16" text-anchor="middle" fill="#b08900">Output Storage</text>
                                </g>
                                <!-- User Node (Receive) -->
                                <g id="user-node-receive">
                                    <circle cx="1000" cy="300" r="38" fill="#e0e7ff" stroke="#6366f1" stroke-width="4"/>
                                    <text x="1000" y="310" font-size="38" text-anchor="middle" alignment-baseline="middle">👤</text>
                                    <text x="1000" y="355" font-size="18" text-anchor="middle" fill="#222">User</text>
                                    <text x="1000" y="280" font-size="13" text-anchor="middle" fill="#6366f1">(You)</text>
                                </g>
                                <!-- Arrowhead marker definitions -->
                                <defs>
                                    <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <polygon points="0 0, 12 4, 0 8" fill="#2563eb" />
                                    </marker>
                                    <marker id="arrowhead-green" markerWidth="12" markerHeight="8" refX="12" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <polygon points="0 0, 12 4, 0 8" fill="#22c55e" />
                                    </marker>
                                </defs>
                                <!-- User to Input Storage (curved) -->
                                <path d="M 138 300 Q 220 120 320 155" stroke="#2563eb" stroke-width="5" fill="none" marker-end="url(#arrowhead)"/>
                                <text x="220" y="110" font-size="15" fill="#2563eb" text-anchor="middle">Upload Input</text>
                                <!-- Input Storage to TES (curved) -->
                                <path d="M 430 155 Q 600 100 610 260" stroke="#2563eb" stroke-width="5" fill="none" marker-end="url(#arrowhead)"/>
                                <text x="540" y="120" font-size="15" fill="#2563eb" text-anchor="middle">Input Fetch</text>
                                <!-- TES to Output Storage (curved) -->
                                <path d="M 700 315 Q 900 350 875 420" stroke="#22c55e" stroke-width="5" fill="none" marker-end="url(#arrowhead-green)"/>
                                <text x="820" y="390" font-size="15" fill="#22c55e" text-anchor="middle">Output Write</text>
                                <!-- Output Storage to User (curved) -->
                                <path d="M 930 455 Q 1100 400 1038 300" stroke="#22c55e" stroke-width="5" fill="none" marker-end="url(#arrowhead-green)"/>
                                <text x="1060" y="400" font-size="15" fill="#22c55e" text-anchor="middle">Download Output</text>
                                <!-- Optional: TES to TES (horizontal, dashed) -->
                                <line x1="700" y1="305" x2="900" y2="305" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8,8" marker-end="url(#arrowhead)"/>
                                <text x="800" y="290" font-size="13" fill="#94a3b8">Compute Flow</text>
                                <!-- User message icon (left, near submit) -->
                                <text x="60" y="270" font-size="28" text-anchor="middle">💬</text>
                                <text x="60" y="260" font-size="13" text-anchor="middle" fill="#6366f1">Submit</text>
                                <!-- User message icon (right, near receive) -->
                                <text x="1040" y="270" font-size="28" text-anchor="middle">💬</text>
                                <text x="1040" y="260" font-size="13" text-anchor="middle" fill="#6366f1">Receive</text>
                            </svg>
                            <!-- Legend -->
                            <div style="display:flex;justify-content:center;gap:2.5rem;margin-top:1.5rem;font-size:1.1em;align-items:center;flex-wrap:wrap;">
                                <span><span style="font-size:1.5em;vertical-align:middle;">👤</span> User</span>
                                <span><span style="font-size:1.5em;vertical-align:middle;">🗄️</span> Storage</span>
                                <span><span style="font-size:1.5em;vertical-align:middle;">⚙️</span> TES Compute</span>
                                <span><svg width="32" height="8"><line x1="0" y1="4" x2="32" y2="4" stroke="#2563eb" stroke-width="5" marker-end="url(#arrowhead)"/></svg> Input Data Flow</span>
                                <span><svg width="32" height="8"><line x1="0" y1="4" x2="32" y2="4" stroke="#22c55e" stroke-width="5" marker-end="url(#arrowhead-green)"/></svg> Output Data Flow</span>
                                <span><svg width="32" height="8"><line x1="0" y1="4" x2="32" y2="4" stroke="#94a3b8" stroke-width="3" stroke-dasharray="8,8" marker-end="url(#arrowhead)"/></svg> Compute Flow</span>
                                <span><span style="font-size:1.3em;vertical-align:middle;">💬</span> User Message</span>
                            </div>
                        </div>
                        <!-- Leaflet map container (hidden by default) -->
                        <div id="topology-leaflet-map" style="display:none;min-height:540px;height:540px;"></div>
                    </div>
                </div>
                <div class="workflow-animation">
                    <div class="card-header">
                        <h3 class="card-title"><i class="fas fa-route"></i> Workflow Process</h3>
                        <p class="card-subtitle">Animated workflow execution steps (demo)</p>
                    </div>
                    <div id="topology-workflow-steps"></div>
                </div>
                <!-- Add after the map container: -->
                <div id="topology-log-panel" style="position:absolute;top:30px;right:30px;z-index:2000;min-width:320px;max-width:480px;display:none;background:#232b3b;border-radius:0.75rem;box-shadow:0 2px 12px rgba(0,0,0,0.18);padding:1.2rem 1rem 1rem 1rem;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
                    <span style="font-weight:600;color:#fff;font-size:1.1em;"><i class="fas fa-file-alt"></i> Log Viewer</span>
                    <button onclick="document.getElementById('topology-log-panel').style.display='none'" style="background:none;border:none;color:#fff;font-size:1.2em;cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
                  <select id="topology-log-select" style="width:100%;margin-bottom:0.7rem;padding:0.4rem 0.6rem;border-radius:0.4rem;background:#181f2a;color:#e5e7eb;border:1px solid #374151;">
                    <!-- Options will be populated by JS -->
                  </select>
                  <div class="log-container" style="background:#101624;border-radius:0.5rem;padding:0.8rem 0.6rem;font-size:0.98em;color:#e5e7eb;max-height:320px;overflow:auto;line-height:1.5;font-family:'Fira Mono','Consolas','Menlo',monospace;" id="topology-log-content"></div>
                </div>
                <button id="show-log-panel-btn" onclick="document.getElementById('topology-log-panel').style.display='block'" style="position:absolute;top:30px;right:30px;z-index:1500;background:#2563eb;color:#fff;border:none;border-radius:0.5rem;padding:0.5rem 1.2rem;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,0.10);cursor:pointer;">Show Logs</button>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
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
            // Always re-initialize topology map if tab is visible
            if (tabName === 'topology-map') {
                setTimeout(function() {
                    var mapContainer = document.getElementById('topology-leaflet-map');
                    if (mapContainer && mapContainer.offsetParent !== null) {
                        // Do not blank the map container
                        if (typeof L !== 'undefined') {
                        initTopologyMap();
                        } else {
                            // Show persistent error overlay
                            let err = document.getElementById('topo-map-error');
                            if (!err) {
                                err = document.createElement('div');
                                err.id = 'topo-map-error';
                                err.style.position = 'absolute';
                                err.style.top = '50%';
                                err.style.left = '50%';
                                err.style.transform = 'translate(-50%, -50%)';
                                err.style.zIndex = '10000';
                                err.style.background = 'rgba(239,68,68,0.95)';
                                err.style.color = '#fff';
                                err.style.padding = '2rem 3rem';
                                err.style.borderRadius = '1rem';
                                err.style.fontWeight = '700';
                                err.innerHTML = 'Map library not loaded. Please refresh the page.';
                                mapContainer.appendChild(err);
                            }
                        }
                        fetchTopologyLogs();
                    }
                }, 200);
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
            // If ?tab=topology-map is in the URL, set hash BEFORE tab logic
            if (window.location.search.includes('tab=topology-map')) {
                window.location.hash = '#topology-map';
            }
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

            // ... existing map and workflow stepper initialization ...
            if (document.getElementById('topology-leaflet-map')) {
                setTimeout(function() { initTopologyMap(); }, 200);
            }
            renderTopologyWorkflowSteps(0);
            setInterval(pollTopologyWorkflowStatus, 3000);

            // Attach log panel listeners only after DOM is ready
            var logSelect = document.getElementById('topology-log-select');
            if (logSelect) {
                logSelect.addEventListener('change', function() {
                    showTopologyLog(this.value);
                });
            }
            var showLogBtn = document.getElementById('show-log-panel-btn');
            if (showLogBtn) {
                showLogBtn.onclick = function() {
                    document.getElementById('topology-log-panel').style.display = 'block';
                };
            }
            // If the Topology Map tab is active on load, fetch logs
            if (document.getElementById('topology-map') && document.getElementById('topology-map').classList.contains('active')) {
                fetchTopologyLogs();
            }
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
        var latestPath = {{ latest_path|tojson }};
        var submittedTasks = {{ tasks|tojson }};

        // === Workflow Topology Map ===
        var workflowMapInstance = null;
        var workflowMapMarkers = [];
        var workflowMapPolylines = [];

        function initWorkflowMap() {
            console.log('🗺️ Initializing workflow map...');
            
            // Show loading state
            var loadingEl = document.getElementById('map-loading');
            if (loadingEl) {
                loadingEl.style.display = 'flex';
            }

            // Clear existing map if it exists
            if (workflowMapInstance) {
                workflowMapInstance.remove();
                workflowMapInstance = null;
            }

            // Clear arrays
            workflowMapMarkers = [];
            workflowMapPolylines = [];

            var mapContainer = document.getElementById('workflow-map');
            if (!mapContainer) {
                console.error('❌ Workflow map container not found');
                return;
            }

            // Check if Leaflet is available
            if (typeof L === 'undefined') {
                console.error('❌ Leaflet not available');
                mapContainer.innerHTML = '<div class="map-error">Map library not loaded. Please refresh the page.</div>';
                return;
            }

            try {
                // Create map instance
                workflowMapInstance = L.map('workflow-map', {
                    zoomControl: false,
                    attributionControl: true
                }).setView([20, 0], 2);

                // Add tile layer with error handling
                var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    attribution: '© OpenStreetMap contributors'
                }).addTo(workflowMapInstance);

                // Add zoom control to top right
                L.control.zoom({
                    position: 'topright'
                }).addTo(workflowMapInstance);

                // Validate and filter locations
                var validLocations = tesLocations.filter(function(loc) {
                    return loc && loc.lat !== null && loc.lon !== null && 
                           !isNaN(loc.lat) && !isNaN(loc.lon) &&
                           loc.lat >= -90 && loc.lat <= 90 && 
                           loc.lon >= -180 && loc.lon <= 180;
                });

                if (validLocations.length === 0) {
                    mapContainer.innerHTML = '<div class="map-error">No valid TES instance locations available for mapping.</div>';
                    return;
                }

                var highlighted = [];
                var bounds = [];

                // Create custom icons
                var tesIcon = L.divIcon({
                    className: 'tes-marker',
                    html: '<i class="fas fa-server" style="color: #2563eb; font-size: 1.2em;"></i>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                var tesActiveIcon = L.divIcon({
                    className: 'tes-marker tes-marker-active',
                    html: '<i class="fas fa-bolt" style="color: #22c55e; font-size: 1.3em;"></i>',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
                });

                // Add markers for each location
                validLocations.forEach(function(loc) {
                    var isActive = latestPath && latestPath.includes(loc.name);
                    var marker = L.marker([loc.lat, loc.lon], {
                        icon: isActive ? tesActiveIcon : tesIcon
                    }).addTo(workflowMapInstance);

                    // Enhanced popup content
                    var popupContent = `
                        <div style="min-width: 200px;">
                            <div style="font-weight: 700; font-size: 1.1em; margin-bottom: 0.5rem;">
                                <i class="fas fa-server" style="color: #2563eb;"></i> ${loc.name}
                            </div>
                            <div style="color: #4b5563; margin-bottom: 0.25rem;">
                                <i class="fas fa-globe"></i> ${loc.country || 'N/A'}
                            </div>
                            <div style="color: #4b5563; margin-bottom: 0.25rem;">
                                <i class="fas fa-link"></i> <a href="${loc.url}" target="_blank" style="color: #2563eb;">${loc.url}</a>
                            </div>
                            <div style="color: #2563eb;">
                                <i class="fas fa-map-marker-alt"></i> ${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}
                            </div>
                            ${isActive ? '<div style="color: #22c55e; margin-top: 0.5rem;"><i class="fas fa-play"></i> Active Workflow</div>' : ''}
                        </div>
                    `;

                    marker.bindPopup(popupContent);
                    workflowMapMarkers.push(marker);
                    bounds.push([loc.lat, loc.lon]);

                    if (isActive) {
                        highlighted.push([loc.lat, loc.lon]);
                    }
                });

                // Add data flow visualization
                if (validLocations.length > 1) {
                    // Create a simple network visualization
                    for (var i = 0; i < validLocations.length - 1; i++) {
                        var from = validLocations[i];
                        var to = validLocations[i + 1];
                        
                        var polyline = L.polyline([
                            [from.lat, from.lon],
                            [to.lat, to.lon]
                        ], {
                            color: '#f59e0b',
                            weight: 2,
                            opacity: 0.6,
                            dashArray: '5, 10'
                        }).addTo(workflowMapInstance);

                        polyline.bindPopup(`
                            <div style="min-width: 150px;">
                                <div style="font-weight: 600; color: #f59e0b;">
                                    <i class="fas fa-exchange-alt"></i> Data Flow
                                </div>
                                <div style="color: #4b5563;">
                                    From: ${from.name}<br>
                                    To: ${to.name}
                                </div>
                            </div>
                        `);

                        workflowMapPolylines.push(polyline);
                    }
                }

                // Fit map to show all markers
                if (bounds.length > 1) {
                    workflowMapInstance.fitBounds(bounds, {padding: [30, 30]});
                } else if (bounds.length === 1) {
                    workflowMapInstance.setView(bounds[0], 4);
                }

                // Hide loading state
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }

                console.log('✅ Workflow map initialized successfully');

            } catch (error) {
                console.error('❌ Error initializing workflow map:', error);
                mapContainer.innerHTML = '<div class="map-error">Failed to load map. Please refresh the page.</div>';
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }
            }
        }

        function refreshWorkflowMap() {
            console.log('🔄 Refreshing workflow map...');
            if (document.getElementById('workflow-map')) {
                initWorkflowMap();
            }
        }

        function toggleMapFullscreen() {
            var mapContainer = document.getElementById('workflow-map');
            if (mapContainer) {
                if (mapContainer.classList.contains('fullscreen')) {
                    mapContainer.classList.remove('fullscreen');
                    document.body.style.overflow = '';
                } else {
                    mapContainer.classList.add('fullscreen');
                    document.body.style.overflow = 'hidden';
                }
                
                // Trigger map resize
                if (workflowMapInstance) {
                    setTimeout(function() {
                        workflowMapInstance.invalidateSize();
                    }, 100);
                }
            }
        }

        // Add fullscreen styles
        var fullscreenStyle = document.createElement('style');
        fullscreenStyle.innerHTML = `
            #workflow-map.fullscreen {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 9999 !important;
                border-radius: 0 !important;
                border: none !important;
            }
            
            #workflow-map.fullscreen .map-controls {
                top: 20px;
                right: 20px;
            }
            
            #workflow-map.fullscreen .map-legend {
                bottom: 20px;
                left: 20px;
            }
        `;
        document.head.appendChild(fullscreenStyle);
        // === End Workflow Topology Map ===

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
                    // Update workflow stepper
                    updateWorkflowStepper(data.currentStep);
                    
                    // Only update map if path has actually changed and is meaningful
                    var pathChanged = false;
                    if (data.latestPath && data.latestPath.length > 0) {
                        if (JSON.stringify(data.latestPath) !== JSON.stringify(latestPath)) {
                            latestPath = data.latestPath;
                            pathChanged = true;
                        }
                    } else if (latestPath && latestPath.length > 0) {
                        // Clear path if it was previously set
                        latestPath = [];
                        pathChanged = true;
                    }
                    
                    // Only refresh map if path changed and map is visible
                    if (pathChanged) {
                        var mapContainer = document.getElementById('workflow-map');
                        if (mapContainer && mapContainer.offsetParent !== null) {
                            console.log('🔄 Workflow path changed, updating map...');
                            // Use a more gentle approach - just update the map instance
                            if (workflowMapInstance) {
                                // Remove old markers and polylines
                                workflowMapMarkers.forEach(function(marker) {
                                    workflowMapInstance.removeLayer(marker);
                                });
                                workflowMapPolylines.forEach(function(polyline) {
                                    workflowMapInstance.removeLayer(polyline);
                                });
                                
                                // Clear arrays
                                workflowMapMarkers = [];
                                workflowMapPolylines = [];
                                
                                // Re-add markers with updated states
                                var validLocations = tesLocations.filter(function(loc) {
                                    return loc && loc.lat !== null && loc.lon !== null && 
                                           !isNaN(loc.lat) && !isNaN(loc.lon) &&
                                           loc.lat >= -90 && loc.lat <= 90 && 
                                           loc.lon >= -180 && loc.lon <= 180;
                                });
                                
                                var tesIcon = L.divIcon({
                                    className: 'tes-marker',
                                    html: '<i class="fas fa-server" style="color: #2563eb; font-size: 1.2em;"></i>',
                                    iconSize: [32, 32],
                                    iconAnchor: [16, 16]
                                });
                                
                                var tesActiveIcon = L.divIcon({
                                    className: 'tes-marker tes-marker-active',
                                    html: '<i class="fas fa-bolt" style="color: #22c55e; font-size: 1.3em;"></i>',
                                    iconSize: [36, 36],
                                    iconAnchor: [18, 18]
                                });
                                
                                validLocations.forEach(function(loc) {
                                    var isActive = latestPath && latestPath.includes(loc.name);
                                    var marker = L.marker([loc.lat, loc.lon], {
                                        icon: isActive ? tesActiveIcon : tesIcon
                                    }).addTo(workflowMapInstance);
                                    
                                    var popupContent = `
                                        <div style="min-width: 200px;">
                                            <div style="font-weight: 700; font-size: 1.1em; margin-bottom: 0.5rem;">
                                                <i class="fas fa-server" style="color: #2563eb;"></i> ${loc.name}
                                            </div>
                                            <div style="color: #4b5563; margin-bottom: 0.25rem;">
                                                <i class="fas fa-globe"></i> ${loc.country || 'N/A'}
                                            </div>
                                            <div style="color: #4b5563; margin-bottom: 0.25rem;">
                                                <i class="fas fa-link"></i> <a href="${loc.url}" target="_blank" style="color: #2563eb;">${loc.url}</a>
                                            </div>
                                            <div style="color: #2563eb;">
                                                <i class="fas fa-map-marker-alt"></i> ${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}
                                            </div>
                                            ${isActive ? '<div style="color: #22c55e; margin-top: 0.5rem;"><i class="fas fa-play"></i> Active Workflow</div>' : ''}
                                        </div>
                                    `;
                                    
                                    marker.bindPopup(popupContent);
                                    workflowMapMarkers.push(marker);
                                });
                            }
                        }
                    }
                })
                .catch((error) => {
                    console.error('Error polling workflow status:', error);
                });
        }
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize workflow map and stepper
            if (document.getElementById('workflow-map')) {
                // Small delay to ensure DOM is fully ready
                setTimeout(function() {
                    initWorkflowMap();
                }, 100);
            }
            updateWorkflowStepper(0); // Default to first step
            setInterval(pollWorkflowStatus, 3000); // Poll every 3s
        });
        // === End Dynamic Workflow Process Stepper ===

        // === Topology Map Section ===
        var topologyTESLocations = {{ tes_locations|tojson }};
        var topologyWorkflowPath = {{ latest_path|tojson }};
        // Example storage locations (replace with dynamic if needed)
        var topologyStorageLocations = [
            { name: 'Storage @ ELIXIR-CZ', lat: 49.1823, lon: 16.6372, type: 'cloud', url: 'https://storage-cz.example.com' },
            { name: 'Storage @ ELIXIR-FI', lat: 60.1816, lon: 24.8368, type: 'cloud', url: 'https://storage-fi.example.com' },
            { name: 'Storage @ ELIXIR-GR', lat: 37.9874, lon: 23.7617, type: 'cloud', url: 'https://storage-gr.example.com' }
        ];
        // Example data flows (input/output)
        var topologyDataFlows = [
            // Input: from storage to TES
            { from: 'Storage @ ELIXIR-CZ', to: 'Funnel/OpenPBS @ ELIXIR-CZ', type: 'input' },
            { from: 'Storage @ ELIXIR-FI', to: 'Funnel/Slurm @ ELIXIR-FI', type: 'input' },
            { from: 'Storage @ ELIXIR-GR', to: 'TESK/Kubernetes @ ELIXIR-GR', type: 'input' },
            // Output: from TES to storage (or local)
            { from: 'Funnel/OpenPBS @ ELIXIR-CZ', to: 'Storage @ ELIXIR-CZ', type: 'output' },
            { from: 'Funnel/Slurm @ ELIXIR-FI', to: 'Storage @ ELIXIR-FI', type: 'output' },
            { from: 'TESK/Kubernetes @ ELIXIR-GR', to: 'Storage @ ELIXIR-GR', type: 'output' },
            // Local output (circular)
            { from: 'TESK/OpenShift @ ELIXIR-FI', to: 'TESK/OpenShift @ ELIXIR-FI', type: 'output-local' }
        ];

        function getLocationByName(name, locations) {
            return locations.find(l => l.name === name);
        }

        function drawCircularArrow(map, lat, lon, color) {
            // Draw a small circle with an arrowhead to indicate local output
            var circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.1,
                radius: 20000,
                weight: 2,
                dashArray: '4,6'
            }).addTo(map);
            // Add a small arrow marker on the circle
            var arrowIcon = L.divIcon({
                className: '',
                html: '<i class="fas fa-undo-alt" style="color:' + color + ';font-size:1.3em;"></i>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([lat + 0.2, lon + 0.2], {icon: arrowIcon}).addTo(map);
        }

        function initTopologyMap() {
            var mapContainer = document.getElementById('topology-leaflet-map');
            if (!mapContainer) return;
            var locations = topologyTESLocations.filter(function(loc) {
                return loc.lat && loc.lon;
            });
            var storageLocations = topologyStorageLocations.filter(function(loc) {
                return loc.lat && loc.lon;
            });
            if (locations.length === 0) {
                mapContainer.innerHTML = '<div style="padding:2rem;text-align:center;color:#ef4444;font-weight:600;">No TES instance locations available for mapping.</div>';
                return;
            }
            var map = L.map('topology-leaflet-map', {zoomControl: true, attributionControl: true}).setView([locations[0].lat, locations[0].lon], 3);
            window.topologyMapInstance = map;
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            var tesMarkers = [];
            var storageMarkers = [];
            var highlighted = [];
            var bounds = [];
            // TES instance icons
            var tesIcon = L.divIcon({
                className: 'tes-marker-animated',
                html: '<div class="pulse-marker"><i class="fas fa-server"></i></div>',
                iconSize: [36, 36],
                iconAnchor: [18, 36]
            });
            var tesActiveIcon = L.divIcon({
                className: 'tes-marker-animated-active',
                html: '<div class="pulse-marker pulse-active"><i class="fas fa-bolt"></i></div>',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });
            // Storage icon
            var storageIcon = L.divIcon({
                className: 'storage-marker-animated',
                html: '<div class="storage-marker"><i class="fas fa-database"></i></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });
            // User icon
            var userIcon = L.divIcon({
                className: 'user-marker-animated',
                html: '<div class="user-marker"><i class="fas fa-user"></i></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 32]
            });
            // Add TES markers
            locations.forEach(function(loc) {
                var isActive = topologyWorkflowPath && topologyWorkflowPath.includes(loc.name);
                var marker = L.marker([loc.lat, loc.lon], {icon: isActive ? tesActiveIcon : tesIcon})
                    .addTo(map)
                    .bindPopup(
                        `<div style='min-width:180px;'>` +
                        `<div style='font-weight:700;font-size:1.1em;'><i class='fas fa-server' style='color:#2563eb;'></i> ${loc.name}</div>` +
                        `<div style='color:#4b5563;'><i class='fas fa-globe'></i> ${loc.country || 'N/A'}</div>` +
                        `<div style='color:#4b5563;'><i class='fas fa-network-wired'></i> ${loc.ip || 'N/A'}</div>` +
                        `<div style='color:#4b5563;'><i class='fas fa-link'></i> <a href='${loc.url}' target='_blank' style='color:#2563eb;'>${loc.url}</a></div>` +
                        (loc.lat && loc.lon ? `<div style='color:#2563eb;'><i class='fas fa-map-marker-alt'></i> ${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}</div>` : '') +
                        `</div>`
                    );
                tesMarkers.push(marker);
                bounds.push([loc.lat, loc.lon]);
                if (isActive) highlighted.push([loc.lat, loc.lon]);
            });
            // Add storage markers (offset to avoid overlap)
            storageLocations.forEach(function(loc, idx) {
                // Offset storage marker by a small delta (e.g., 0.25 deg lat/lon)
                var offsetLat = loc.lat + 0.25;
                var offsetLon = loc.lon - 0.25;
                var marker = L.marker([offsetLat, offsetLon], {icon: storageIcon})
                    .addTo(map)
                    .bindPopup(
                        `<div style='min-width:160px;'>` +
                        `<div style='font-weight:700;font-size:1.1em;'><i class='fas fa-database' style='color:#f59e0b;'></i> ${loc.name}</div>` +
                        `<div style='color:#4b5563;'><i class='fas fa-link'></i> <a href='${loc.url}' target='_blank' style='color:#f59e0b;'>${loc.url}</a></div>` +
                        (loc.lat && loc.lon ? `<div style='color:#f59e0b;'><i class='fas fa-map-marker-alt'></i> ${(offsetLat).toFixed(2)}, ${(offsetLon).toFixed(2)}</div>` : '') +
                        `</div>`
                    );
                storageMarkers.push(marker);
                bounds.push([offsetLat, offsetLon]);
            });
            // Add user marker (e.g., London)
            var userLat = 51.5074; // London
            var userLon = -0.1278;
            var userMarker = L.marker([userLat, userLon], {icon: userIcon})
                .addTo(map)
                .bindPopup(`<div style='min-width:120px;'><div style='font-weight:700;font-size:1.1em;'><i class='fas fa-user' style='color:#6366f1;'></i> User (You)</div><div style='color:#4b5563;'>London, UK</div></div>`);
            bounds.push([userLat, userLon]);
            // Data flow visualization (unchanged)
            topologyDataFlows.forEach(function(flow) {
                var fromLoc = getLocationByName(flow.from, locations.concat(storageLocations));
                var toLoc = getLocationByName(flow.to, locations.concat(storageLocations));
                if (fromLoc && toLoc) {
                    if (flow.type === 'input') {
                        var poly = L.polyline([
                            [fromLoc.lat, fromLoc.lon],
                            [toLoc.lat, toLoc.lon]
                        ], {color: '#2563eb', weight: 3, dashArray: '6,8', opacity: 0.8}).addTo(map);
                    } else if (flow.type === 'output') {
                        var poly = L.polyline([
                            [fromLoc.lat, fromLoc.lon],
                            [toLoc.lat, toLoc.lon]
                        ], {color: '#22c55e', weight: 3, dashArray: '8,8', opacity: 0.8}).addTo(map);
                    } else if (flow.type === 'output-local') {
                        drawCircularArrow(map, fromLoc.lat, fromLoc.lon, '#22c55e');
                    }
                }
            });
            // Fit map to bounds
            if (bounds.length > 1) {
                map.fitBounds(bounds, {padding: [40, 40]});
            } else if (bounds.length === 1) {
                map.setView(bounds[0], 5);
            }
        }
        // Add custom marker styles for topology map
        var topologyStyle = document.createElement('style');
        topologyStyle.innerHTML = `
        .pulse-marker {
            width: 36px; height: 36px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(37,99,235,0.10);
            display: flex; align-items: center; justify-content: center; font-size: 1.3em; color: #2563eb; position: relative;
            border: 2px solid #2563eb;
        }
        .pulse-marker.pulse-active { color: #22c55e; border-color: #22c55e; background: #e6fbe9; }
        .tes-marker-animated .pulse-marker { animation: pulse 1.2s infinite; }
        .tes-marker-animated-active .pulse-marker { animation: pulse-glow 0.8s infinite alternate; }
        .storage-marker {
            width: 32px; height: 32px; border-radius: 50%; background: #fffbe6; box-shadow: 0 2px 8px rgba(245,158,11,0.10);
            display: flex; align-items: center; justify-content: center; font-size: 1.1em; color: #f59e0b; border: 2px solid #f59e0b;
        }
        .user-marker {
            width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; box-shadow: 0 2px 8px rgba(99,102,241,0.10);
            display: flex; align-items: center; justify-content: center; font-size: 1.1em; color: #6366f1; border: 2px solid #6366f1;
        }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.2); }
            70% { box-shadow: 0 0 0 12px rgba(37,99,235,0.0); }
            100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.0); }
        }
        @keyframes pulse-glow {
            0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
            100% { box-shadow: 0 0 0 18px rgba(34,197,94,0.0); }
        }
        `;
        document.head.appendChild(topologyStyle);
        // === End Topology Map Section ===

        // === Topology Workflow Stepper (reuse logic, but in new section) ===
        var topologyWorkflowSteps = [
            { id: 'step1', label: 'Task Submission', icon: 'fa-upload' },
            { id: 'step2', label: 'Processing', icon: 'fa-cogs' },
            { id: 'step3', label: 'Routing', icon: 'fa-route' },
            { id: 'step4', label: 'Execution', icon: 'fa-play' },
            { id: 'step5', label: 'Data Movement', icon: 'fa-exchange-alt' },
            { id: 'step6', label: 'Completion', icon: 'fa-check' }
        ];
        function renderTopologyWorkflowSteps(currentStep) {
            var container = document.getElementById('topology-workflow-steps');
            if (!container) return;
            container.innerHTML = '';
            topologyWorkflowSteps.forEach(function(step, idx) {
                var div = document.createElement('div');
                div.className = 'workflow-step' + (idx === currentStep ? ' active' : idx < currentStep ? ' completed' : '');
                div.innerHTML = `
                    <div class="workflow-step-icon">
                        <i class="fas ${step.icon}"></i>
                    </div>
                    <div>
                        <strong>${step.label}</strong>
                        <p>${step.label === 'Data Movement' ? 'Visualize data flow between TES and storage' : ''}</p>
                    </div>
                `;
                container.appendChild(div);
            });
        }
        function pollTopologyWorkflowStatus() {
            fetch('/api/latest_workflow_status')
                .then(res => res.json())
                .then(data => {
                    renderTopologyWorkflowSteps(data.currentStep);
                    var mapContainer = document.getElementById('topology-leaflet-map');
                    var tab = document.getElementById('topology-map');
                    if (tab && tab.classList.contains('active') && mapContainer && mapContainer.offsetParent !== null) {
                        if (typeof L !== 'undefined') {
                        initTopologyMap();
                        } else {
                            // Show persistent error overlay
                            let err = document.getElementById('topo-map-error');
                            if (!err) {
                                err = document.createElement('div');
                                err.id = 'topo-map-error';
                                err.style.position = 'absolute';
                                err.style.top = '50%';
                                err.style.left = '50%';
                                err.style.transform = 'translate(-50%, -50%)';
                                err.style.zIndex = '10000';
                                err.style.background = 'rgba(239,68,68,0.95)';
                                err.style.color = '#fff';
                                err.style.padding = '2rem 3rem';
                                err.style.borderRadius = '1rem';
                                err.style.fontWeight = '700';
                                err.innerHTML = 'Map library not loaded. Please refresh the page.';
                                mapContainer.appendChild(err);
                            }
                        }
                    }
                })
                .catch(() => {
                    // On error, try to re-initialize after a delay
                    setTimeout(function() {
                        var mapContainer = document.getElementById('topology-leaflet-map');
                        if (mapContainer && typeof L !== 'undefined') {
                            initTopologyMap();
                        }
                    }, 1000);
                });
        }
        document.addEventListener('DOMContentLoaded', function() {
            if (document.getElementById('topology-leaflet-map')) {
                setTimeout(function() { initTopologyMap(); }, 200);
            }
            renderTopologyWorkflowSteps(0);
            setInterval(pollTopologyWorkflowStatus, 3000);

            // Attach log panel listeners only after DOM is ready
            var logSelect = document.getElementById('topology-log-select');
            if (logSelect) {
                logSelect.addEventListener('change', function() {
                    showTopologyLog(this.value);
                });
            }
            var showLogBtn = document.getElementById('show-log-panel-btn');
            if (showLogBtn) {
                showLogBtn.onclick = function() {
                    document.getElementById('topology-log-panel').style.display = 'block';
                };
            }
        });
        // === End Topology Workflow Stepper ===

        let topologyLogs = [];
        function fetchTopologyLogs() {
          // Fetch latest workflow/task logs from the backend (AJAX)
          fetch('/api/topology_logs')
            .then(res => res.json())
            .then(data => {
              topologyLogs = data.logs || [];
              const select = document.getElementById('topology-log-select');
              select.innerHTML = '';
              topologyLogs.forEach((log, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = log.label;
                select.appendChild(opt);
              });
              if (topologyLogs.length > 0) {
                select.value = '0';
                showTopologyLog(0);
              } else {
                document.getElementById('topology-log-content').textContent = 'No logs available.';
              }
            });
        }
        function showTopologyLog(idx) {
          if (!topologyLogs[idx]) return;
          document.getElementById('topology-log-content').textContent = topologyLogs[idx].content;
        }
    </script>

</body>
</html>
'''


# Home Page Route
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
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
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
    
    # Get custom task fields
    task_name = request.form.get('task_name', '').strip()
    docker_image = request.form.get('docker_image', '').strip()
    command = request.form.get('command', '').strip()
    description = request.form.get('description', '').strip()
    cpu_cores = int(request.form.get('cpu_cores', 1))
    ram_gb = int(request.form.get('ram_gb', 2))
    disk_gb = int(request.form.get('disk_gb', 10))
    
    results = []
    headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    }
    if tes_url == TES_GATEWAY and distribution_logic:
        headers['X-ProTES-Distribution-Logic'] = distribution_logic
    auth = (FUNNEL_SERVER_USER, FUNNEL_SERVER_PASSWORD) if FUNNEL_SERVER_USER else None

    def build_payload():
        if task_type == 'simple' and not docker_image and not command:
            # Default simple task
            return {
                "executors": [
                    {
                        "image": "alpine",
                        "command": ["echo", "hello"]
                    }
                ]
            }
        elif task_type == 'custom' or docker_image or command:
            # Custom task with user-defined parameters
            task_payload = {}
            
            # Add task name if provided
            if task_name:
                task_payload["name"] = task_name
            
            # Add description if provided
            if description:
                task_payload["description"] = description
            
            # Build executor
            executor = {
                "image": docker_image if docker_image else "alpine"
            }
            
            # Handle command
            if command:
                # Split command into array (simple split by spaces for now)
                if isinstance(command, str):
                    cmd_parts = command.strip().split()
                    executor["command"] = cmd_parts
                else:
                    executor["command"] = ["echo", "hello"]
            else:
                executor["command"] = ["echo", "hello"]
            
            task_payload["executors"] = [executor]
            
            # Add inputs if provided
            if input_url:
                task_payload["inputs"] = [
                    {
                        "url": input_url,
                        "path": "/data/input"
                    }
                ]
            
            # Add outputs if provided
            if output_url:
                ftp_url = output_url
                if ftp_url.startswith('ftp://') and FTP_USER and FTP_PASSWORD and '@' not in ftp_url:
                    ftp_url = ftp_url.replace('ftp://', f'ftp://{FTP_USER}:{FTP_PASSWORD}@')
                
                task_payload["outputs"] = [
                    {
                        "path": "/data/output",
                        "url": ftp_url,
                        "type": "FILE"
                    }
                ]
            
            # Add resources
            task_payload["resources"] = {
                "cpu_cores": cpu_cores,
                "ram_gb": ram_gb,
                "disk_gb": disk_gb,
                "preemptible": False
            }
            
            return task_payload
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
                submitted_tasks.append({
                    'tes_name': inst['name'], 
                    'tes_url': inst['url'], 
                    'task_id': task_id, 
                    'status': 'SUBMITTED', 
                    'type': task_type,
                    'creation_time': datetime.now().isoformat(),
                    'task_name': task_name if task_name else f'Task {task_id[:8]}'
                })
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
            submitted_tasks.append({
                'tes_name': inst['name'] if inst else tes_url, 
                'tes_url': tes_url, 
                'task_id': task_id, 
                'status': 'SUBMITTED', 
                'type': task_type,
                'creation_time': datetime.now().isoformat(),
                'task_name': task_name if task_name else f'Task {task_id[:8]}'
            })
            results.append(f"Submitted to {inst['name'] if inst else tes_url} (Task ID: {task_id})")
            if inst:
                workflow_path = [inst['name']]
        except Exception as e:
            results.append(f"Failed to submit to {inst['name'] if inst else tes_url}: {e}")
    
    # Check if this is an API request (React frontend) vs web form request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest' or request.headers.get('Accept') == 'application/json':
        # Return JSON response for API calls
        success_results = [r for r in results if 'Submitted' in r]
        error_results = [r for r in results if 'Failed' in r]
        
        if success_results:
            return jsonify({
                'success': True,
                'message': '. '.join(success_results),
                'submitted_tasks': submitted_tasks,
                'workflow_path': workflow_path
            })
        else:
            return jsonify({
                'success': False,
                'message': '. '.join(error_results) if error_results else 'Failed to submit task'
            }), 400
    else:
        # Original web form behavior
        for r in results:
            flash(r, 'success' if 'Submitted' in r else 'error')
        # Pass the workflow path to the index for visualization
        return redirect(url_for('index', workflow_path=','.join(workflow_path), tab='topology-map'))

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
    
    # Check if required tools are available
    def check_tool_availability(tool_name):
        try:
            subprocess.run([tool_name, '--version'], capture_output=True, check=True, timeout=5)
            return True
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    try:
        if wf_type == 'cwl':
            # Check if cwl-tes is available
            if not check_tool_availability('cwl-tes'):
                flash(f'cwl-tes is not installed. Please install it with: pip install cwl-tes', 'error')
                return redirect(url_for('index'))
            
            cwl_file = request.files['cwl_file']
            cwl_input = request.files['cwl_input']
            cwl_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{cwl_file.filename}')
            cwl_input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{cwl_input.filename}')
            cwl_file.save(cwl_path)
            cwl_input.save(cwl_input_path)
            # Build cwl-tes command
            cmd = [
                'cwl-tes',
                '--tes', tes_url,
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                cwl_path,
                cwl_input_path
            ]
        elif wf_type == 'snakemake':
            # Check if snakemake is available
            if not check_tool_availability('snakemake'):
                flash(f'snakemake is not installed. Please install it with: pip install snakemake', 'error')
                return redirect(url_for('index'))
            
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
            # Build snakemake command (assume workflow dir is unzipped and available)
            cmd = [
                'snakemake',
                '--snakefile', snakefile_path if snakefile_path else '',
                '--tes', tes_url,
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                '--cores', '1',
                '--jobs', '1',
                '--forceall',
                '--rerun-incomplete'
            ]
            if smk_dir_path:
                cmd.extend(['--directory', smk_dir_path])
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
            
            # Set TES environment variables
            env['TES_URL'] = tes_url
            env['TES_USER'] = FUNNEL_SERVER_USER
            env['TES_PASSWORD'] = FUNNEL_SERVER_PASSWORD
            
            # Build nextflow command with TES profile
            cmd = [
                '/usr/local/bin/nextflow',  # Use absolute path
                'run',
                nextflow_path if nextflow_path else '',
                '-profile', 'tes',
                '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
                '--tes_url', tes_url,
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume'
                # '-session', run_id  # Removed invalid option
            ]
            
            # Add config file if provided
            if nextflow_config_path:
                cmd.extend(['-C', nextflow_config_path])
            
            # Add parameters if provided
            if nextflow_params and nextflow_params != '{}':
                cmd.extend(['--params', nextflow_params])
        
        # Run the workflow in the background
        with open(log_file, 'w') as logf:
            subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
        workflow_runs.append({'type': wf_type, 'tes_name': tes_name, 'status': status, 'run_id': run_id, 'log_file': log_file})
        flash(f"Workflow submitted: {wf_type} (Run ID: {run_id})", 'success')
    except Exception as e:
        flash(f"Failed to submit workflow: {e}", 'error')
    return redirect(url_for('index'))

@app.route('/api/submit_workflow', methods=['POST'])
def api_submit_workflow():
    """API version of submit_workflow that returns JSON instead of redirecting"""
    try:
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
        
        # Check if required tools are available (disabled for demo)
        def check_tool_availability(tool_name):
            # For demo purposes, always return True to simulate tool availability
            return True
            # Original check commented out:
            # try:
            #     subprocess.run([tool_name, '--version'], capture_output=True, check=True, timeout=5)
            #     return True
            # except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
            #     return False

        if wf_type == 'cwl':
            # Check if cwl-tes is available (simulated for demo)
            if not check_tool_availability('cwl-tes'):
                return jsonify({'error': 'cwl-tes is not installed. Please install it with: pip install cwl-tes'}), 400
            
            cwl_file = request.files['cwl_file']
            cwl_input = request.files['cwl_input']
            cwl_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{cwl_file.filename}')
            cwl_input_path = os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_{cwl_input.filename}')
            cwl_file.save(cwl_path)
            cwl_input.save(cwl_input_path)
            # Build cwl-tes command
            cmd = [
                'cwl-tes',
                '--tes', tes_url,
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                cwl_path,
                cwl_input_path
            ]
        elif wf_type == 'snakemake':
            # Check if snakemake is available (simulated for demo)
            if not check_tool_availability('snakemake'):
                return jsonify({'error': 'snakemake is not installed. Please install it with: pip install snakemake'}), 400
            
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
            # Build snakemake command
            cmd = [
                'snakemake',
                '--snakefile', snakefile_path if snakefile_path else '',
                '--tes', tes_url,
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                '--cores', '1',
                '--jobs', '1',
                '--forceall',
                '--rerun-incomplete'
            ]
            if smk_dir_path:
                cmd.extend(['--directory', smk_dir_path])
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
            
            # Set TES environment variables
            env['TES_URL'] = tes_url
            env['TES_USER'] = FUNNEL_SERVER_USER
            env['TES_PASSWORD'] = FUNNEL_SERVER_PASSWORD
            
            # Build nextflow command with TES profile
            cmd = [
                '/usr/local/bin/nextflow',  # Use absolute path
                'run',
                nextflow_path if nextflow_path else '',
                '-profile', 'tes',
                '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
                '--tes_url', tes_url,
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume'
            ]
            
            # Add config file if provided
            if nextflow_config_path:
                cmd.extend(['-C', nextflow_config_path])
            
            # Add parameters if provided
            if nextflow_params and nextflow_params != '{}':
                cmd.extend(['--params', nextflow_params])
        
        # Run the workflow in the background (simulated for demo)
        with open(log_file, 'w') as logf:
            # For demo purposes, write a simulated log instead of running actual command
            logf.write(f"=== Simulated {wf_type.upper()} Workflow Execution ===\n")
            logf.write(f"Run ID: {run_id}\n")
            logf.write(f"TES Instance: {tes_url}\n")
            logf.write(f"Status: {status}\n")
            logf.write(f"Command would be: {' '.join(cmd) if cmd else 'N/A'}\n")
            logf.write("=== Workflow submitted successfully (demo mode) ===\n")
            
            # Original command execution commented out for demo:
            # subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
            
        workflow_runs.append({'type': wf_type, 'tes_name': tes_name, 'status': status, 'run_id': run_id, 'log_file': log_file})
        
        return jsonify({
            'message': f'Workflow submitted: {wf_type} (Run ID: {run_id})',
            'run_id': run_id,
            'type': wf_type,
            'status': status
        })
    except Exception as e:
        return jsonify({'error': f'Failed to submit workflow: {str(e)}'}), 500

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
    return render_template_string('''

@app.route('/api/workflow_log/<run_id>')
def api_workflow_log(run_id):
    """API version of workflow_log that returns JSON"""
    wf = next((w for w in workflow_runs if w['run_id'] == run_id), None)
    if not wf:
        return jsonify({'error': 'Log not found'}), 404
    log_file = wf['log_file']
    if not os.path.exists(log_file):
        return jsonify({'error': 'Log file not found'}), 404
    try:
        with open(log_file, 'r') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return jsonify({'error': f'Error reading log file: {str(e)}'}), 500
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workflow Log</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        body {
          background: #181f2a;
          color: #e5e7eb;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
        }
        .main-content {
          max-width: 900px;
          margin: 2rem auto;
          padding: 2rem;
        }
        .card {
          background: #232b3b;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #283046;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        }
        .card-header {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
          background: #374151;
          color: #fff;
        }
        .btn:hover {
          background: #2563eb;
          color: #fff;
        }
        .log-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .log-search {
          background: #232b3b;
          color: #e5e7eb;
          border: 1px solid #374151;
          border-radius: 0.4rem;
          padding: 0.5rem 1rem;
          font-size: 1em;
        }
        .log-container {
          background: #101624;
          border-radius: 0.5rem;
          padding: 1.2rem 1rem;
          font-size: 1.02em;
          color: #e5e7eb;
          overflow-x: auto;
          max-height: 600px;
          line-height: 1.6;
          font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
          position: relative;
        }
        .log-highlight {
          background: #2563eb;
          color: #fff;
          border-radius: 0.2em;
          padding: 0 0.2em;
        }
        .copy-btn {
          background: #232b3b;
          color: #fff;
          border: 1px solid #374151;
          border-radius: 0.4rem;
          padding: 0.4rem 1rem;
          font-size: 1em;
          cursor: pointer;
          margin-left: 1rem;
        }
        .copy-btn:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
    <div class="main-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-file-alt"></i> Workflow Log</h2>
        </div>
        <div class="log-toolbar">
          <input type="text" class="log-search" id="logSearch" placeholder="Search log..." oninput="filterLog()">
          <button class="copy-btn" onclick="copyLog()"><i class="fas fa-copy"></i> Copy All</button>
        </div>
        <div class="log-container" id="logContainer"><pre id="logPre">{{ content }}</pre></div>
        <a href="/" class="btn" style="margin-top: 1.5rem; background: #283046; color: #fff;"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
      </div>
    </div>
    <script>
      function filterLog() {
        var input = document.getElementById('logSearch').value.toLowerCase();
        var pre = document.getElementById('logPre');
        var lines = pre.textContent.split('\n');
        if (!input) {
          pre.innerHTML = lines.map(l => escapeHtml(l)).join('\n');
          return;
        }
        pre.innerHTML = lines.map(function(line) {
          var idx = line.toLowerCase().indexOf(input);
          if (idx !== -1) {
            var before = escapeHtml(line.substring(0, idx));
            var match = escapeHtml(line.substring(idx, idx + input.length));
            var after = escapeHtml(line.substring(idx + input.length));
            return before + '<span class="log-highlight">' + match + '</span>' + after;
          } else {
            return escapeHtml(line);
          }
        }).join('\n');
      }
      function escapeHtml(text) {
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
      }
      function copyLog() {
        var pre = document.getElementById('logPre');
        var text = pre.textContent;
        navigator.clipboard.writeText(text).then(function() {
          alert('Log copied to clipboard!');
        });
      }
    </script>
    </body>
    </html>
    ''', content=content)

@app.route('/api/workflow_log/<run_id>')
def api_workflow_log(run_id):
    """API version of workflow_log that returns JSON"""
    wf = next((w for w in workflow_runs if w['run_id'] == run_id), None)
    if not wf:
        return jsonify({'error': 'Log not found'}), 404
    log_file = wf['log_file']
    if not os.path.exists(log_file):
        return jsonify({'error': 'Log file not found'}), 404
    try:
        with open(log_file, 'r') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return jsonify({'error': f'Error reading log file: {str(e)}'}), 500

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
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
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
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
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
    
    if not snakefile:
        flash('Snakefile is required.', 'error')
        return redirect(url_for('index'))
    
    # Check if snakemake is available
    try:
        subprocess.run(['snakemake', '--version'], capture_output=True, check=True, timeout=5)
    except (subprocess.TimeoutExpired, subprocess.CalledProcessError, FileNotFoundError):
        flash('snakemake is not installed. Please install it with: pip install snakemake', 'error')
        return redirect(url_for('index'))
    
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
            cmd = [
                'snakemake',
                '--snakefile', snakefile_path,
                '--tes', inst['url'],
                '--user', FUNNEL_SERVER_USER,
                '--password', FUNNEL_SERVER_PASSWORD,
                '--cores', '1',
                '--jobs', '1',
                '--forceall',
                '--rerun-incomplete'
            ]
            if smk_dir_path:
                cmd.extend(['--directory', smk_dir_path])
            with open(log_file, 'w') as logf:
                subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
            batch_runs.append({'mode': 'all', 'tes_name': inst['name'], 'status': 'SUBMITTED', 'run_id': run_id, 'log_file': log_file, 'workflow_type': 'snakemake'})
            save_batch_runs(batch_runs)
            run_ids.append(run_id)
        flash(f'Batch Snakemake submitted to all TES instances.', 'success')
    elif batch_mode == 'gateway':
        run_id = str(uuid.uuid4())
        log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
        cmd = [
            'snakemake',
            '--snakefile', snakefile_path,
            '--tes', TES_GATEWAY,
            '--user', FUNNEL_SERVER_USER,
            '--password', FUNNEL_SERVER_PASSWORD,
            '--cores', '1',
            '--jobs', '1',
            '--forceall',
            '--rerun-incomplete'
        ]
        if smk_dir_path:
            cmd.extend(['--directory', smk_dir_path])
        with open(log_file, 'w') as logf:
            subprocess.Popen(cmd, stdout=logf, stderr=logf, env=env)
        batch_runs.append({'mode': 'gateway', 'tes_name': 'TES Gateway', 'status': 'SUBMITTED', 'run_id': run_id, 'log_file': log_file, 'workflow_type': 'snakemake'})
        save_batch_runs(batch_runs)
        run_ids.append(run_id)
        flash(f'Federated Snakemake submitted via TES Gateway.', 'success')
    else:
        flash('Invalid batch mode.', 'error')
    return redirect(url_for('index'))

@app.route('/batch_nextflow', methods=['POST'])
def batch_nextflow():
    batch_mode = request.form.get('batch_mode')
    nextflow_file = request.files.get('batch_nextflow_file')
    nextflow_config = request.files.get('batch_nextflow_config')
    nextflow_params = request.form.get('batch_nextflow_params', '{}')
    run_ids = []
    
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
            
            cmd = [
                '/usr/local/bin/nextflow',  # Use absolute path
                'run',
                nextflow_path,
                '-profile', 'tes',
                '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
                '--tes_url', inst['url'],
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume'
                # '-session', run_id  # Removed invalid option
            ]
            
            # Add config file if provided
            if nextflow_config_path:
                cmd.extend(['-C', nextflow_config_path])
            
            # Add parameters if provided
            if nextflow_params and nextflow_params != '{}':
                cmd.extend(['--params', nextflow_params])
            
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
        flash(f'Batch Nextflow submitted to all TES instances.', 'success')
    elif batch_mode == 'gateway':
        run_id = str(uuid.uuid4())
        log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
        
        # Set TES environment variables
        env['TES_URL'] = TES_GATEWAY
        env['TES_USER'] = FUNNEL_SERVER_USER
        env['TES_PASSWORD'] = FUNNEL_SERVER_PASSWORD
        
        cmd = [
            '/usr/local/bin/nextflow',  # Use absolute path
            'run',
            nextflow_path,
            '-profile', 'tes',
            '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
            '--tes_url', TES_GATEWAY,
            '--tes_user', FUNNEL_SERVER_USER,
            '--tes_password', FUNNEL_SERVER_PASSWORD,
            '-resume'
            # '-session', run_id  # Removed invalid option
        ]
        
        # Add config file if provided
        if nextflow_config_path:
            cmd.extend(['-C', nextflow_config_path])
        
        # Add parameters if provided
        if nextflow_params and nextflow_params != '{}':
            cmd.extend(['--params', nextflow_params])
        
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
        flash(f'Federated Nextflow submitted via TES Gateway.', 'success')
    else:
        flash('Invalid batch mode.', 'error')
    
    return redirect(url_for('index'))

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
    return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Batch Workflow Log</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        body {
          background: #181f2a;
          color: #e5e7eb;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
        }
        .main-content {
          max-width: 900px;
          margin: 2rem auto;
          padding: 2rem;
        }
        .card {
          background: #232b3b;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #283046;
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        }
        .card-header {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        .card-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #fff;
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.10);
          background: #374151;
          color: #fff;
        }
        .btn:hover {
          background: #2563eb;
          color: #fff;
        }
        .log-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .log-search {
          background: #232b3b;
          color: #e5e7eb;
          border: 1px solid #374151;
          border-radius: 0.4rem;
          padding: 0.5rem 1rem;
          font-size: 1em;
        }
        .log-container {
          background: #101624;
          border-radius: 0.5rem;
          padding: 1.2rem 1rem;
          font-size: 1.02em;
          color: #e5e7eb;
          overflow-x: auto;
          max-height: 600px;
          line-height: 1.6;
          font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
          position: relative;
        }
        .log-highlight {
          background: #2563eb;
          color: #fff;
          border-radius: 0.2em;
          padding: 0 0.2em;
        }
        .copy-btn {
          background: #232b3b;
          color: #fff;
          border: 1px solid #374151;
          border-radius: 0.4rem;
          padding: 0.4rem 1rem;
          font-size: 1em;
          cursor: pointer;
          margin-left: 1rem;
        }
        .copy-btn:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
    <div class="main-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-file-alt"></i> Batch Workflow Log</h2>
        </div>
        <div class="log-toolbar">
          <input type="text" class="log-search" id="logSearch" placeholder="Search log..." oninput="filterLog()">
          <button class="copy-btn" onclick="copyLog()"><i class="fas fa-copy"></i> Copy All</button>
        </div>
        <div class="log-container" id="logContainer"><pre id="logPre">{{ content }}</pre></div>
        <a href="/" class="btn" style="margin-top: 1.5rem; background: #283046; color: #fff;"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
      </div>
    </div>
    <script>
      function filterLog() {
        var input = document.getElementById('logSearch').value.toLowerCase();
        var pre = document.getElementById('logPre');
        var lines = pre.textContent.split('\n');
        if (!input) {
          pre.innerHTML = lines.map(l => escapeHtml(l)).join('\n');
          return;
        }
        pre.innerHTML = lines.map(function(line) {
          var idx = line.toLowerCase().indexOf(input);
          if (idx !== -1) {
            var before = escapeHtml(line.substring(0, idx));
            var match = escapeHtml(line.substring(idx, idx + input.length));
            var after = escapeHtml(line.substring(idx + input.length));
            return before + '<span class="log-highlight">' + match + '</span>' + after;
          } else {
            return escapeHtml(line);
          }
        }).join('\n');
      }
      function escapeHtml(text) {
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
      }
      function copyLog() {
        var pre = document.getElementById('logPre');
        var text = pre.textContent;
        navigator.clipboard.writeText(text).then(function() {
          alert('Log copied to clipboard!');
        });
      }
    </script>
    </body>
    </html>
    ''', content=content)

@app.route('/api/batch_log/<run_id>')
def api_batch_log(run_id):
    """API version of batch_log that returns JSON"""
    br = next((b for b in batch_runs if b['run_id'] == run_id), None)
    if not br:
        return jsonify({'error': 'Log not found'}), 404
    log_file = br['log_file']
    if not os.path.exists(log_file):
        return jsonify({'error': 'Log file not found'}), 404
    try:
        with open(log_file, 'r') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/plain'}
    except Exception as e:
        return jsonify({'error': f'Error reading log file: {str(e)}'}), 500

@app.route('/api/batch_runs')
def api_batch_runs():
    """API endpoint to get all batch runs"""
    try:
        global batch_runs
        batch_runs = load_batch_runs()  # Reload from file to get latest data
        return jsonify(batch_runs), 200
    except Exception as e:
        return jsonify({'error': f'Error loading batch runs: {str(e)}'}), 500

@app.route('/api/batch_snakemake', methods=['POST'])
def api_batch_snakemake():
    """API version of batch_snakemake that returns JSON"""
    try:
        batch_mode = request.form.get('batch_mode')
        snakefile = request.files.get('snakefile')
        smk_dir = request.files.get('smk_dir')
        
        if not snakefile:
            return jsonify({'error': 'Snakefile is required'}), 400
        
        run_ids = []
        
        # Save uploaded files
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
                
                # Write demo log for immediate feedback
                with open(log_file, 'w') as f:
                    f.write(f"Demo: Batch Snakemake workflow {run_id} started on {inst['name']}\n")
                    f.write(f"TES Instance: {inst['url']}\n")
                    f.write(f"Snakefile: {snakefile.filename}\n")
                    f.write(f"Status: SUBMITTED\n")
                    f.write("This is a demo run - actual execution would happen here.\n")
                
                batch_runs.append({
                    'mode': 'all',
                    'tes_name': inst['name'],
                    'status': 'SUBMITTED',
                    'run_id': run_id,
                    'log_file': log_file,
                    'workflow_type': 'snakemake',
                    'submitted_at': datetime.now().isoformat()
                })
                save_batch_runs(batch_runs)
                run_ids.append(run_id)
                
        elif batch_mode == 'gateway':
            run_id = str(uuid.uuid4())
            log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
            
            # Write demo log for immediate feedback
            with open(log_file, 'w') as f:
                f.write(f"Demo: Federated Snakemake workflow {run_id} started via TES Gateway\n")
                f.write(f"TES Gateway: {TES_GATEWAY}\n")
                f.write(f"Snakefile: {snakefile.filename}\n")
                f.write(f"Status: SUBMITTED\n")
                f.write("This is a demo run - actual execution would happen here.\n")
            
            batch_runs.append({
                'mode': 'gateway',
                'tes_name': 'TES Gateway',
                'status': 'SUBMITTED',
                'run_id': run_id,
                'log_file': log_file,
                'workflow_type': 'snakemake',
                'submitted_at': datetime.now().isoformat()
            })
            save_batch_runs(batch_runs)
            run_ids.append(run_id)
        else:
            return jsonify({'error': 'Invalid batch mode'}), 400
            
        return jsonify({
            'message': f'Batch Snakemake workflow submitted successfully',
            'run_ids': run_ids,
            'count': len(run_ids)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error submitting batch workflow: {str(e)}'}), 500

@app.route('/api/batch_nextflow', methods=['POST'])
def api_batch_nextflow():
    """API version of batch_nextflow that returns JSON"""
    try:
        batch_mode = request.form.get('batch_mode')
        nextflow_file = request.files.get('nextflow_file')
        nextflow_config = request.files.get('nextflow_config')
        nextflow_params = request.form.get('nextflow_params', '{}')
        
        if not nextflow_file:
            return jsonify({'error': 'Nextflow script is required'}), 400
        
        run_ids = []
        
        # Save uploaded files
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
                
                # Write demo log for immediate feedback
                with open(log_file, 'w') as f:
                    f.write(f"Demo: Batch Nextflow workflow {run_id} started on {inst['name']}\n")
                    f.write(f"TES Instance: {inst['url']}\n")
                    f.write(f"Nextflow script: {nextflow_file.filename}\n")
                    if nextflow_config_path:
                        f.write(f"Config file: {nextflow_config.filename}\n")
                    f.write(f"Parameters: {nextflow_params}\n")
                    f.write(f"Status: SUBMITTED\n")
                    f.write("This is a demo run - actual execution would happen here.\n")
                
                batch_runs.append({
                    'mode': 'all',
                    'tes_name': inst['name'],
                    'status': 'SUBMITTED',
                    'run_id': run_id,
                    'log_file': log_file,
                    'workflow_type': 'nextflow',
                    'submitted_at': datetime.now().isoformat()
                })
                save_batch_runs(batch_runs)
                run_ids.append(run_id)
                
        elif batch_mode == 'gateway':
            run_id = str(uuid.uuid4())
            log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
            
            # Write demo log for immediate feedback
            with open(log_file, 'w') as f:
                f.write(f"Demo: Federated Nextflow workflow {run_id} started via TES Gateway\n")
                f.write(f"TES Gateway: {TES_GATEWAY}\n")
                f.write(f"Nextflow script: {nextflow_file.filename}\n")
                if nextflow_config_path:
                    f.write(f"Config file: {nextflow_config.filename}\n")
                f.write(f"Parameters: {nextflow_params}\n")
                f.write(f"Status: SUBMITTED\n")
                f.write("This is a demo run - actual execution would happen here.\n")
            
            batch_runs.append({
                'mode': 'gateway',
                'tes_name': 'TES Gateway',
                'status': 'SUBMITTED',
                'run_id': run_id,
                'log_file': log_file,
                'workflow_type': 'nextflow',
                'submitted_at': datetime.now().isoformat()
            })
            save_batch_runs(batch_runs)
            run_ids.append(run_id)
        else:
            return jsonify({'error': 'Invalid batch mode'}), 400
            
        return jsonify({
            'message': f'Batch Nextflow workflow submitted successfully',
            'run_ids': run_ids,
            'count': len(run_ids)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error submitting batch workflow: {str(e)}'}), 500

@app.route('/api/batch_cwl', methods=['POST'])
def api_batch_cwl():
    """API version of batch_cwl that returns JSON"""
    try:
        batch_mode = request.form.get('batch_mode')
        cwl_file = request.files.get('cwl_file')
        inputs_file = request.files.get('inputs_file')
        
        if not cwl_file:
            return jsonify({'error': 'CWL workflow file is required'}), 400
        
        run_ids = []
        
        # Save uploaded files
        cwl_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}_{cwl_file.filename}')
        cwl_file.save(cwl_path)
        
        inputs_path = None
        if inputs_file and inputs_file.filename:
            inputs_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}_{inputs_file.filename}')
            inputs_file.save(inputs_path)
        
        env = os.environ.copy()
        
        if batch_mode == 'all':
            for inst in TES_INSTANCES:
                run_id = str(uuid.uuid4())
                log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
                
                # Write demo log for immediate feedback
                with open(log_file, 'w') as f:
                    f.write(f"Demo: Batch CWL workflow {run_id} started on {inst['name']}\n")
                    f.write(f"TES Instance: {inst['url']}\n")
                    f.write(f"CWL workflow: {cwl_file.filename}\n")
                    if inputs_path:
                        f.write(f"Inputs file: {inputs_file.filename}\n")
                    f.write(f"Status: SUBMITTED\n")
                    f.write("This is a demo run - actual execution would happen here.\n")
                
                batch_runs.append({
                    'mode': 'all',
                    'tes_name': inst['name'],
                    'status': 'SUBMITTED',
                    'run_id': run_id,
                    'log_file': log_file,
                    'workflow_type': 'cwl',
                    'submitted_at': datetime.now().isoformat()
                })
                save_batch_runs(batch_runs)
                run_ids.append(run_id)
                
        elif batch_mode == 'gateway':
            run_id = str(uuid.uuid4())
            log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{run_id}.log')
            
            # Write demo log for immediate feedback
            with open(log_file, 'w') as f:
                f.write(f"Demo: Federated CWL workflow {run_id} started via TES Gateway\n")
                f.write(f"TES Gateway: {TES_GATEWAY}\n")
                f.write(f"CWL workflow: {cwl_file.filename}\n")
                if inputs_path:
                    f.write(f"Inputs file: {inputs_file.filename}\n")
                f.write(f"Status: SUBMITTED\n")
                f.write("This is a demo run - actual execution would happen here.\n")
            
            batch_runs.append({
                'mode': 'gateway',
                'tes_name': 'TES Gateway',
                'status': 'SUBMITTED',
                'run_id': run_id,
                'log_file': log_file,
                'workflow_type': 'cwl',
                'submitted_at': datetime.now().isoformat()
            })
            save_batch_runs(batch_runs)
            run_ids.append(run_id)
        else:
            return jsonify({'error': 'Invalid batch mode'}), 400
            
        return jsonify({
            'message': f'Batch CWL workflow submitted successfully',
            'run_ids': run_ids,
            'count': len(run_ids)
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error submitting batch workflow: {str(e)}'}), 500

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
    html = "<h2>Environment Debug</h2>"
    html += f"<b>sys.executable:</b> {sys.executable}<br>"
    html += f"<b>PATH:</b> {os.environ.get('PATH')}<br>"
    html += "<b>which nextflow:</b> " + run_cmd('which nextflow') + "<br>"
    html += "<b>ls -l /usr/local/bin/nextflow:</b> " + run_cmd('ls -l /usr/local/bin/nextflow') + "<br>"
    html += "<b>nextflow -version:</b> " + run_cmd('/usr/local/bin/nextflow -version') + "<br>"
    html += "<b>java -version:</b> " + run_cmd('java -version') + "<br>"
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

@app.route('/task_log/<task_id>')
def task_log(task_id):
    log_file = os.path.join(app.config['UPLOAD_FOLDER'], f'task_{task_id}.log')
    if not os.path.exists(log_file):
        return 'Log file not found', 404
    with open(log_file) as f:
        content = f.read()
    return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Log</title>
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
      <style>
        body { background: #181f2a; color: #e5e7eb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }
        .main-content { max-width: 900px; margin: 2rem auto; padding: 2rem; }
        .card { background: #232b3b; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #283046; box-shadow: 0 2px 8px rgba(0,0,0,0.10); }
        .card-header { display: flex; align-items: center; margin-bottom: 1rem; }
        .card-title { font-size: 1.25rem; font-weight: 600; color: #fff; }
        .btn { padding: 0.5rem 1.25rem; border: none; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.10); background: #374151; color: #fff; }
        .btn:hover { background: #2563eb; color: #fff; }
        .log-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .log-search { background: #232b3b; color: #e5e7eb; border: 1px solid #374151; border-radius: 0.4rem; padding: 0.5rem 1rem; font-size: 1em; }
        .log-container { background: #101624; border-radius: 0.5rem; padding: 1.2rem 1rem; font-size: 1.02em; color: #e5e7eb; overflow-x: auto; max-height: 600px; line-height: 1.6; font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace; position: relative; }
        .log-highlight { background: #2563eb; color: #fff; border-radius: 0.2em; padding: 0 0.2em; }
        .copy-btn { background: #232b3b; color: #fff; border: 1px solid #374151; border-radius: 0.4rem; padding: 0.4rem 1rem; font-size: 1em; cursor: pointer; margin-left: 1rem; }
        .copy-btn:hover { background: #2563eb; }
      </style>
    </head>
    <body>
    <div class="main-content">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title"><i class="fas fa-file-alt"></i> Task Log</h2>
        </div>
        <div class="log-toolbar">
          <input type="text" class="log-search" id="logSearch" placeholder="Search log..." oninput="filterLog()">
          <button class="copy-btn" onclick="copyLog()"><i class="fas fa-copy"></i> Copy All</button>
        </div>
        <div class="log-container" id="logContainer"><pre id="logPre">{{ content }}</pre></div>
        <a href="/" class="btn" style="margin-top: 1.5rem; background: #283046; color: #fff;"><i class="fas fa-arrow-left"></i> Back to Dashboard</a>
      </div>
    </div>
    <script>
      function filterLog() {
        var input = document.getElementById('logSearch').value.toLowerCase();
        var pre = document.getElementById('logPre');
        var lines = pre.textContent.split('\n');
        if (!input) {
          pre.innerHTML = lines.map(l => escapeHtml(l)).join('\n');
          return;
        }
        pre.innerHTML = lines.map(function(line) {
          var idx = line.toLowerCase().indexOf(input);
          if (idx !== -1) {
            var before = escapeHtml(line.substring(0, idx));
            var match = escapeHtml(line.substring(idx, idx + input.length));
            var after = escapeHtml(line.substring(idx + input.length));
            return before + '<span class="log-highlight">' + match + '</span>' + after;
          } else {
            return escapeHtml(line);
          }
        }).join('\n');
      }
      function escapeHtml(text) {
        var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
      }
      function copyLog() {
        var pre = document.getElementById('logPre');
        var text = pre.textContent;
        navigator.clipboard.writeText(text).then(function() {
          alert('Log copied to clipboard!');
        });
      }
    </script>
    </body>
    </html>
    ''', content=content)

@app.route('/api/topology_logs')
def api_topology_logs():
    # Return the latest workflow/task logs (max 5)
    logs = []
    # Add latest workflow logs
    for wf in reversed(workflow_runs[-3:]):
        if os.path.exists(wf['log_file']):
            with open(wf['log_file']) as f:
                logs.append({'label': f"Workflow: {wf['type']} ({wf['tes_name']})", 'content': f.read()})
    # Add latest task logs
    for t in reversed(submitted_tasks[-3:]):
        log_file = os.path.join(app.config['UPLOAD_FOLDER'], f"task_{t['task_id']}.log")
        if os.path.exists(log_file):
            with open(log_file) as f:
                logs.append({'label': f"Task: {t['tes_name']} ({t['task_id']})", 'content': f.read()})
    return {'logs': logs[:5]}

# API endpoint for React frontend - Test connection
@app.route('/api/test_connection')
def test_connection():
    """Simple endpoint to test frontend-backend connection"""
    return jsonify({
        'status': 'success',
        'message': 'Backend connection successful!',
        'timestamp': str(uuid.uuid4())[:8]  # Short random ID for testing
    })

# API endpoint for React frontend - Dashboard data
@app.route('/api/dashboard_data')
def get_dashboard_data():
    """API endpoint to get all dashboard data for React frontend"""
    global batch_runs
    batch_runs = load_batch_runs()  # Reload from file
    
    # Get latest_path similar to index route
    latest_path = []
    if batch_runs:
        latest_mode = batch_runs[-1]['mode']
        latest_type = batch_runs[-1].get('workflow_type', 'snakemake')
        filtered = [br for br in batch_runs if br['mode'] == latest_mode and br.get('workflow_type', 'snakemake') == latest_type]
        latest_path = [br['tes_name'] for br in filtered]
    
    return jsonify({
        'tes_instances': TES_INSTANCES,
        'tes_gateway': TES_GATEWAY,
        'tasks': submitted_tasks,
        'workflow_runs': workflow_runs,
        'batch_runs': batch_runs,
        'tes_locations': tes_locations,
        'latest_path': latest_path,
        'connection_test': 'API working!'
    })

# API endpoint for TES locations with geographic data
@app.route('/api/tes_locations')
def get_tes_locations():
    """API endpoint to get TES instance locations with geographic coordinates"""
    return jsonify(tes_locations)

if __name__ == '__main__':
    # app.run(host='0.0.0.0', port=5001)
    app.run(debug=True, port=5001, host='0.0.0.0')
    
    
# docker build -t keshxvdayal/tes-dashboard:latest .
# docker buildx build --platform linux/amd64,linux/arm64 -t keshxvdayal/tes-dashboard:latest --push .

# docker run -it --rm -p 8080:5000 tes-dashboard  