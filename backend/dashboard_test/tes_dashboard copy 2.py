import os
from flask import Flask, render_template_string, request, redirect, url_for, flash, send_from_directory, send_file
from dotenv import load_dotenv
import requests
import subprocess
import uuid
import json

# Load environment variables from .env
load_dotenv('.env')

# Read TES instances from .tes_instances
TES_INSTANCES = []
if os.path.exists('.tes_instances'):
    with open('.tes_instances') as f:
        for line in f:
            if ',' in line:
                name, url = line.strip().split(',', 1)
                TES_INSTANCES.append({'name': name, 'url': url})

FUNNEL_SERVER_USER = os.getenv('FUNNEL_SERVER_USER', '')
FUNNEL_SERVER_PASSWORD = os.getenv('FUNNEL_SERVER_PASSWORD', '')
FTP_USER = os.getenv('FTP_USER', '')
FTP_PASSWORD = os.getenv('FTP_PASSWORD', '')
FTP_INSTANCE = os.getenv('FTP_INSTANCE', '')
TES_GATEWAY = os.getenv('TES_GATEWAY', '')

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
app.secret_key = 'supersecretkey'  # For flash messages
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

BATCH_RUNS_FILE = os.path.join(app.config['UPLOAD_FOLDER'], 'batch_runs.json')

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

# HTML template (simple, for demo)
TEMPLATE = '''
<!DOCTYPE html>
<html>
<head>
    <title>TES Dashboard</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            background: #f7f9fa; 
        }
        .container { 
            max-width: 1000px; 
            margin: 40px auto; 
            background: #fff; 
            box-shadow: 0 2px 12px rgba(0,0,0,0.07); 
            border-radius: 12px; 
            padding: 32px 40px 40px 40px;
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { margin-bottom: 16px; }
        h2 { margin-top: 36px; margin-bottom: 12px; }
        h3 { margin-top: 24px; margin-bottom: 8px; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 16px; 
            background: #fafbfc;
            border-radius: 8px;
            overflow: hidden;
        }
        th, td { 
            border: 1px solid #e3e6ea; 
            padding: 10px 8px; 
            text-align: left; 
        }
        th { 
            background: #f0f4f8; 
            font-weight: 600;
        }
        tr:nth-child(even) { background: #f7f9fa; }
        .success { color: #27ae60; font-weight: 500; }
        .error { color: #c0392b; font-weight: 500; }
        .form-section, .wf-section, .utility-section, .batch-section {
            margin-bottom: 36px; 
            border: 1px solid #e3e6ea; 
            background: #f9fafb;
            padding: 24px 24px 12px 24px; 
            border-radius: 10px; 
            box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        label { font-weight: 500; margin-right: 8px; }
        input[type="text"], select, input[type="file"] {
            margin: 0 8px 12px 0; 
            padding: 6px 8px; 
            border: 1px solid #d1d5db; 
            border-radius: 5px; 
            font-size: 1em;
        }
        button {
            background: #3498db;
            color: #fff;
            border: none;
            border-radius: 5px;
            padding: 8px 18px;
            font-size: 1em;
            font-weight: 500;
            margin: 8px 8px 8px 0;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background: #217dbb;
        }
        ul { margin: 10px 0 10px 20px; }
        pre { background: #f4f6f8; padding: 12px; border-radius: 6px; }
        .error, .success { margin-bottom: 10px; }
        @media (max-width: 700px) {
            .container { padding: 10px; }
            table, th, td { font-size: 0.95em; }
        }
    </style>
</head>
<body>
<div class="container">
    <h1>TES Dashboard</h1>
    {% with messages = get_flashed_messages(with_categories=true) %}
      {% if messages %}
        <ul>
        {% for category, message in messages %}
          <li class="{{ category }}">{{ message }}</li>
        {% endfor %}
        </ul>
      {% endif %}
    {% endwith %}
    <div class="batch-section">
      <h2>Batch Snakemake Workflow Execution</h2>
      <form method="post" action="/batch_snakemake" enctype="multipart/form-data">
        <label for="batch_snakefile">Snakefile:</label>
        <input type="file" name="batch_snakefile" id="batch_snakefile" required />
        <label for="batch_smk_dir">Workflow Directory (optional, zipped):</label>
        <input type="file" name="batch_smk_dir" id="batch_smk_dir" />
        <button type="submit" name="batch_mode" value="all">Run on All TES Instances</button>
        <button type="submit" name="batch_mode" value="gateway">Run via TES Gateway (Federated)</button>
      </form>
    </div>
    <div class="batch-section">
      <h2>Batch Nextflow Workflow Execution</h2>
      <form method="post" action="/batch_nextflow" enctype="multipart/form-data">
        <label for="batch_nextflow_file">Nextflow Script (.nf):</label>
        <input type="file" name="batch_nextflow_file" id="batch_nextflow_file" required />
        <label for="batch_nextflow_config">Nextflow Config (optional):</label>
        <input type="file" name="batch_nextflow_config" id="batch_nextflow_config" />
        <label for="batch_nextflow_params">Parameters (JSON, optional):</label>
        <input type="text" name="batch_nextflow_params" id="batch_nextflow_params" placeholder='{"param1": "value1", "param2": "value2"}' />
        <button type="submit" name="batch_mode" value="all">Run on All TES Instances</button>
        <button type="submit" name="batch_mode" value="gateway">Run via TES Gateway (Federated)</button>
      </form>
    </div>
    <div class="utility-section">
      <h2>TES Utilities</h2>
      <form method="get" action="/list_tasks" style="display:inline-block;">
        <label for="list_tasks_instance">List Tasks for:</label>
        <select name="tes_url" id="list_tasks_instance">
            {% for inst in tes_instances %}
                <option value="{{ inst.url }}">{{ inst.name }}</option>
            {% endfor %}
            {% if tes_gateway %}
                <option value="{{ tes_gateway }}">TES Gateway</option>
            {% endif %}
        </select>
        <button type="submit">List Tasks</button>
      </form>
      <form method="get" action="/service_info" style="display:inline-block; margin-left:20px;">
        <label for="service_info_instance">Service Info for:</label>
        <select name="tes_url" id="service_info_instance">
            {% for inst in tes_instances %}
                <option value="{{ inst.url }}">{{ inst.name }}</option>
            {% endfor %}
            {% if tes_gateway %}
                <option value="{{ tes_gateway }}">TES Gateway</option>
            {% endif %}
        </select>
        <button type="submit">Service Info</button>
      </form>
    </div>
    <div class="form-section">
    <form method="post" action="/submit" enctype="multipart/form-data">
        <label for="tes_instance">Select TES Instance:</label>
        <select name="tes_instance" id="tes_instance" onchange="toggleDistributionLogic()">
            <option value="all">All Instances</option>
            {% for inst in tes_instances %}
                <option value="{{ inst.url }}">{{ inst.name }}</option>
            {% endfor %}
            {% if tes_gateway %}
                <option value="{{ tes_gateway }}">TES Gateway</option>
            {% endif %}
        </select>
        <span id="dist-logic-span" style="display:none;">
            <label for="distribution_logic">Distribution Logic:</label>
            <select name="distribution_logic" id="distribution_logic">
                <option value="random">Random</option>
                <option value="distance">Distance-based</option>
            </select>
        </span>
        <label for="task_type">Task Type:</label>
        <select name="task_type" id="task_type" onchange="toggleComplexFields()">
            <option value="simple">Simple (echo hello)</option>
            <option value="complex">Complex (with input/output)</option>
        </select>
        <div id="complex-fields" style="display:none; margin-top:10px;">
            <label for="input_url">Input File URL:</label>
            <input type="text" name="input_url" id="input_url" placeholder="https://..." />
            <label for="output_url">Output File URL:</label>
            <input type="text" name="output_url" id="output_url" placeholder="ftp://..." />
        </div>
        <button type="submit">Submit Task</button>
    </form>
    </div>
    <div class="wf-section">
    <h2>Submit Workflow (CWL or Snakemake)</h2>
    <form method="post" action="/submit_workflow" enctype="multipart/form-data">
        <label for="wf_type">Workflow Type:</label>
        <select name="wf_type" id="wf_type" onchange="toggleWfFields()">
            <option value="cwl">CWL</option>
            <option value="snakemake">Snakemake</option>
            <option value="nextflow">Nextflow</option>
        </select>
        <div id="cwl-fields">
            <label for="cwl_file">CWL Workflow File:</label>
            <input type="file" name="cwl_file" id="cwl_file" required />
            <label for="cwl_input">CWL Input File (YAML/JSON):</label>
            <input type="file" name="cwl_input" id="cwl_input" required />
        </div>
        <div id="snakemake-fields" style="display:none;">
            <label for="snakefile">Snakefile:</label>
            <input type="file" name="snakefile" id="snakefile" />
            <label for="smk_dir">Workflow Directory (optional, zipped):</label>
            <input type="file" name="smk_dir" id="smk_dir" />
        </div>
        <div id="nextflow-fields" style="display:none;">
            <label for="nextflow_file">Nextflow Script (.nf):</label>
            <input type="file" name="nextflow_file" id="nextflow_file" />
            <label for="nextflow_config">Nextflow Config (optional):</label>
            <input type="file" name="nextflow_config" id="nextflow_config" />
            <label for="nextflow_params">Parameters (JSON, optional):</label>
            <input type="text" name="nextflow_params" id="nextflow_params" placeholder='{"param1": "value1", "param2": "value2"}' />
        </div>
        <label for="wf_tes_instance">Select TES Instance:</label>
        <select name="wf_tes_instance" id="wf_tes_instance" onchange="toggleWfDistributionLogic()">
            {% for inst in tes_instances %}
                <option value="{{ inst.url }}">{{ inst.name }}</option>
            {% endfor %}
            {% if tes_gateway %}
                <option value="{{ tes_gateway }}">TES Gateway</option>
            {% endif %}
        </select>
        <span id="wf-dist-logic-span" style="display:none;">
            <label for="wf_distribution_logic">Distribution Logic:</label>
            <select name="wf_distribution_logic" id="wf_distribution_logic">
                <option value="random">Random</option>
                <option value="distance">Distance-based</option>
            </select>
        </span>
        <button type="submit">Submit Workflow</button>
    </form>
    </div>
    <h2>Submitted Tasks</h2>
    <table>
        <tr><th>TES Instance</th><th>Task ID</th><th>Status</th><th>Type</th><th>Details</th></tr>
        {% for task in tasks %}
        <tr>
            <td>{{ task['tes_name'] }}</td>
            <td>{{ task['task_id'] }}</td>
            <td>{{ task['status'] }}</td>
            <td>{{ task['type'] }}</td>
            <td><a href="/task_details?tes_url={{ task['tes_url'] }}&task_id={{ task['task_id'] }}">Details</a></td>
        </tr>
        {% endfor %}
    </table>
    <h2>Workflow Runs</h2>
    <table>
        <tr><th>Workflow Type</th><th>TES Instance</th><th>Status</th><th>Run ID</th><th>Log</th></tr>
        {% for wf in workflow_runs %}
        <tr>
            <td>{{ wf['type'] }}</td>
            <td>{{ wf['tes_name'] }}</td>
            <td>{{ wf['status'] }}</td>
            <td>{{ wf['run_id'] }}</td>
            <td><a href="/workflow_log/{{ wf['run_id'] }}">View Log</a></td>
        </tr>
        {% endfor %}
    </table>
    <h2>Batch/Federated Workflow Runs</h2>
    <table>
        <tr><th>Mode</th><th>Workflow Type</th><th>TES Instance</th><th>Status</th><th>Run ID</th><th>Log</th></tr>
        {% for br in batch_runs %}
        <tr>
          <td>{{ br['mode'] }}</td>
          <td>{{ br.get('workflow_type', 'snakemake') }}</td>
          <td>{{ br['tes_name'] }}</td>
          <td>{{ br['status'] }}</td>
          <td>{{ br['run_id'] }}</td>
          <td><a href="/batch_log/{{ br['run_id'] }}">View Log</a></td>
        </tr>
        {% endfor %}
    </table>
</div>
<script>
function toggleComplexFields() {
    var taskType = document.getElementById('task_type').value;
    var complexFields = document.getElementById('complex-fields');
    if (taskType === 'complex') {
        complexFields.style.display = 'block';
    } else {
        complexFields.style.display = 'none';
    }
}
function toggleDistributionLogic() {
    var tesInstance = document.getElementById('tes_instance').value;
    var distLogicSpan = document.getElementById('dist-logic-span');
    if (tesInstance === '{{ tes_gateway }}') {
        distLogicSpan.style.display = 'inline';
    } else {
        distLogicSpan.style.display = 'none';
    }
}
function toggleWfFields() {
    var wfType = document.getElementById('wf_type').value;
    var cwlFields = document.getElementById('cwl-fields');
    var snakemakeFields = document.getElementById('snakemake-fields');
    var nextflowFields = document.getElementById('nextflow-fields');
    var cwlFile = document.getElementById('cwl_file');
    var cwlInput = document.getElementById('cwl_input');
    var nextflowFile = document.getElementById('nextflow_file');
    
    // Hide all fields first
    cwlFields.style.display = 'none';
    snakemakeFields.style.display = 'none';
    nextflowFields.style.display = 'none';
    
    // Remove required attributes
    if (cwlFile) cwlFile.removeAttribute('required');
    if (cwlInput) cwlInput.removeAttribute('required');
    if (nextflowFile) nextflowFile.removeAttribute('required');
    
    if (wfType === 'cwl') {
        cwlFields.style.display = 'block';
        if (cwlFile) cwlFile.setAttribute('required', 'required');
        if (cwlInput) cwlInput.setAttribute('required', 'required');
    } else if (wfType === 'snakemake') {
        snakemakeFields.style.display = 'block';
    } else if (wfType === 'nextflow') {
        nextflowFields.style.display = 'block';
        if (nextflowFile) nextflowFile.setAttribute('required', 'required');
    }
}
function toggleWfDistributionLogic() {
    var wfTesInstance = document.getElementById('wf_tes_instance').value;
    var wfDistLogicSpan = document.getElementById('wf-dist-logic-span');
    if (wfTesInstance === '{{ tes_gateway }}') {
        wfDistLogicSpan.style.display = 'inline';
    } else {
        wfDistLogicSpan.style.display = 'none';
    }
}
window.onload = function() {
    toggleComplexFields();
    toggleDistributionLogic();
    toggleWfFields();
    toggleWfDistributionLogic();
};
</script>
</body>
</html>
'''

@app.route('/')
def index():
    global batch_runs
    batch_runs = load_batch_runs()  # Always reload from file
    return render_template_string(
        TEMPLATE,
        tes_instances=TES_INSTANCES,
        tes_gateway=TES_GATEWAY,
        tasks=submitted_tasks,
        workflow_runs=workflow_runs,
        batch_runs=batch_runs
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
    <h2>Task Details</h2>
    {% if error %}<div class="error">{{ error }}</div>{% endif %}
    <pre>{{ task_json | tojson(indent=2) }}</pre>
    <h3>Outputs</h3>
    <ul>
    {% for out in outputs %}
      <li>{{ out }}</li>
    {% endfor %}
    </ul>
    <h3>Logs</h3>
    <ul>
    {% for log in logs %}
      <li><pre>{{ log }}</pre></li>
    {% endfor %}
    </ul>
    {% if can_cancel %}
    <form method="post" action="/cancel_task">
      <input type="hidden" name="tes_url" value="{{ tes_url }}" />
      <input type="hidden" name="task_id" value="{{ task_id }}" />
      <button type="submit">Cancel Task</button>
    </form>
    {% endif %}
    <a href="/">Back to Dashboard</a>
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
            # Use FTP credentials in output_url if needed
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

    if tes_url == 'all':
        for inst in TES_INSTANCES:
            url = inst['url'].rstrip('/') + '/v1/tasks'
            try:
                resp = requests.post(url, json=payload, headers=headers, auth=auth, timeout=10)
                resp.raise_for_status()
                task_id = resp.json().get('id', '')
                submitted_tasks.append({'tes_name': inst['name'], 'tes_url': inst['url'], 'task_id': task_id, 'status': 'SUBMITTED', 'type': task_type})
                results.append(f"Submitted to {inst['name']} (Task ID: {task_id})")
            except Exception as e:
                results.append(f"Failed to submit to {inst['name']}: {e}")
    else:
        inst = next((i for i in TES_INSTANCES if i['url'] == tes_url), None)
        url = tes_url.rstrip('/') + '/v1/tasks'
        try:
            resp = requests.post(url, json=payload, headers=headers, auth=auth, timeout=10)
            resp.raise_for_status()
            task_id = resp.json().get('id', '')
            submitted_tasks.append({'tes_name': inst['name'] if inst else tes_url, 'tes_url': tes_url, 'task_id': task_id, 'status': 'SUBMITTED', 'type': task_type})
            results.append(f"Submitted to {inst['name'] if inst else tes_url} (Task ID: {task_id})")
        except Exception as e:
            results.append(f"Failed to submit to {inst['name'] if inst else tes_url}: {e}")
    for r in results:
        flash(r, 'success' if 'Submitted' in r else 'error')
    return redirect(url_for('index'))

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
    try:
        if wf_type == 'cwl':
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
                'nextflow',
                'run',
                nextflow_path if nextflow_path else '',
                '-profile', 'tes',
                '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
                '--tes_url', tes_url,
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume',
                '-session', run_id  # Add unique session ID
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
    <h2>All Tasks for TES Instance</h2>
    {% if error %}<div class="error">{{ error }}</div>{% endif %}
    <table>
      <tr><th>Task ID</th><th>Name</th><th>State</th><th>Details</th></tr>
      {% for t in tasks %}
      <tr>
        <td>{{ t['id'] }}</td>
        <td>{{ t.get('name', '') }}</td>
        <td>{{ t.get('state', '') }}</td>
        <td><a href="/task_details?tes_url={{ tes_url }}&task_id={{ t['id'] }}">Details</a></td>
      </tr>
      {% endfor %}
    </table>
    <h3>Task State Distribution</h3>
    <canvas id="stateChart" width="400" height="200"></canvas>
    <canvas id="statePieChart" width="400" height="200"></canvas>
    <ul>
    {% for state, count in state_counts.items() %}
      <li>{{ state }}: {{ count }}</li>
    {% endfor %}
    </ul>
    <a href="/">Back to Dashboard</a>
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
    <h2>Service Info</h2>
    {% if error %}<div class="error">{{ error }}</div>{% endif %}
    <pre>{{ info | tojson(indent=2) }}</pre>
    <a href="/">Back to Dashboard</a>
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
                'nextflow',
                'run',
                nextflow_path,
                '-profile', 'tes',
                '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
                '--tes_url', inst['url'],
                '--tes_user', FUNNEL_SERVER_USER,
                '--tes_password', FUNNEL_SERVER_PASSWORD,
                '-resume',
                '-session', run_id  # Add unique session ID
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
            'nextflow',
            'run',
            nextflow_path,
            '-profile', 'tes',
            '--outdir', os.path.join(app.config['UPLOAD_FOLDER'], f'{run_id}_results'),
            '--tes_url', TES_GATEWAY,
            '--tes_user', FUNNEL_SERVER_USER,
            '--tes_password', FUNNEL_SERVER_PASSWORD,
            '-resume',
            '-session', run_id  # Add unique session ID
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
    return f'<pre>{content}</pre>'

if __name__ == '__main__':
    app.run(debug=False)