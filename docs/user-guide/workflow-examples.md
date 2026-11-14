# Workflow Examples

This document provides example workflows known to run on TES and WES backends, including their inputs and configurations.

## TES (Task Execution Service) Examples

### Example 1: Simple Command Execution

A basic task that runs a simple shell command.

```json
{
  "name": "hello-world",
  "description": "A simple hello world task",
  "executors": [
    {
      "image": "ubuntu:latest",
      "command": ["echo", "Hello, World!"],
      "cwd": "/workspace"
    }
  ],
  "inputs": {}
}
```

### Example 2: File Download and Processing

A task that downloads a file from a URL and processes it.

```json
{
  "name": "download-and-process",
  "description": "Download a file and perform basic processing",
  "executors": [
    {
      "image": "ubuntu:latest",
      "command": [
        "bash",
        "-c",
        "wget https://example.com/data.txt -O /workspace/data.txt && wc -l /workspace/data.txt"
      ],
      "cwd": "/workspace"
    }
  ],
  "inputs": {
    "url": {
      "type": "string",
      "description": "URL of the file to download"
    }
  }
}
```

### Example 3: Python Script Execution

A task that runs a Python script with input parameters.

```json
{
  "name": "python-analysis",
  "description": "Run a Python analysis script",
  "executors": [
    {
      "image": "python:3.11-slim",
      "command": ["python", "/workspace/analyze.py"],
      "cwd": "/workspace",
      "env": [
        {
          "name": "INPUT_FILE",
          "value": "/data/input.csv"
        },
        {
          "name": "OUTPUT_FILE",
          "value": "/data/output.csv"
        }
      ]
    }
  ],
  "inputs": {
    "input_file": {
      "type": "string",
      "description": "Path to input CSV file"
    },
    "output_file": {
      "type": "string",
      "description": "Path to output CSV file"
    }
  }
}
```

### Example 4: With Volumes and Resources

A task with volume mounts and resource limits.

```json
{
  "name": "resource-intensive-task",
  "description": "Task with resource limits and volume mounts",
  "executors": [
    {
      "image": "ubuntu:latest",
      "command": ["bash", "/workspace/process.sh"],
      "cwd": "/workspace",
      "resources": {
        "cpu_cores": 2,
        "ram_gb": 4,
        "disk_gb": 10
      },
      "volumes": [
        {
          "name": "data-volume",
          "mount_path": "/data",
          "size_gb": 20,
          "access_mode": "READ_WRITE"
        }
      ]
    }
  ],
  "inputs": {}
}
```

## WES (Workflow Execution Service) Examples

### Example 1: CWL Hello World

A simple Common Workflow Language (CWL) workflow.

**Workflow Definition (hello.cwl):**

```yaml
cwlVersion: v1.0
class: Workflow
inputs:
  message:
    type: string
    default: "Hello, World!"
outputs:
  output:
    type: string
    outputSource: echo/output
steps:
  echo:
    run: echo.cwl
    in:
      message: message
    out: [output]
```

**Step Definition (echo.cwl):**

```yaml
cwlVersion: v1.0
class: CommandLineTool
baseCommand: echo
inputs:
  message:
    type: string
    inputBinding:
      position: 1
outputs:
  output:
    type: stdout
stdout: output.txt
```

**WES API Request:**

```json
{
  "workflow_type": "CWL",
  "workflow_type_version": "v1.0",
  "workflow_url": "s3://bucket/workflows/hello.cwl",
  "workflow_params": {
    "message": "Hello from WES!"
  }
}
```

### Example 2: WDL Simple Workflow

A basic Workflow Description Language (WDL) workflow.

**Workflow Definition (hello.wdl):**

```wdl
version 1.0

workflow hello {
  input {
    String name
  }
  
  output {
    String greeting = echo.greeting
  }
  
  call echo {
    input: name=name
  }
}

task echo {
  input {
    String name
  }
  
  command {
    echo "Hello, ${name}!"
  }
  
  output {
    String greeting = read_string(stdout())
  }
  
  runtime {
    docker: "ubuntu:latest"
  }
}
```

**WES API Request:**

```json
{
  "workflow_type": "WDL",
  "workflow_type_version": "v1.0",
  "workflow_url": "s3://bucket/workflows/hello.wdl",
  "workflow_params": {
    "name": "Krini User"
  }
}
```

### Example 3: Nextflow RNA-seq Pipeline

A Nextflow workflow for RNA-seq analysis.

**Workflow Definition (main.nf):**

```nextflow
#!/usr/bin/env nextflow

nextflow.enable.dsl=2

params.reads = "s3://bucket/reads/*.fastq.gz"
params.ref = "s3://bucket/reference/hg38.fa"
params.outdir = "results"

process fastqc {
  tag "${sample_id}"
  
  input:
  tuple val(sample_id), path(reads)
  
  output:
  tuple val(sample_id), path("${sample_id}_fastqc.html"), emit: fastqc
  
  """
  fastqc ${reads} -o .
  """
}

process align {
  tag "${sample_id}"
  
  input:
  tuple val(sample_id), path(reads)
  path(ref)
  
  output:
  tuple val(sample_id), path("${sample_id}.bam"), emit: bam
  
  """
  bwa mem ${ref} ${reads} | samtools sort -o ${sample_id}.bam
  """
}

workflow {
  Channel.fromFilePairs(params.reads, flat: true)
    .set { reads_ch }
  
  path(params.ref)
    .set { ref_ch }
  
  fastqc(reads_ch)
  align(reads_ch, ref_ch)
}
```

**WES API Request:**

```json
{
  "workflow_type": "nextflow",
  "workflow_type_version": "22.10.0",
  "workflow_url": "s3://bucket/workflows/rnaseq/main.nf",
  "workflow_params": {
    "reads": "s3://bucket/reads/sample_*.fastq.gz",
    "ref": "s3://bucket/reference/hg38.fa",
    "outdir": "s3://bucket/results/rnaseq"
  },
  "workflow_engine_parameters": {
    "docker": true,
    "singularity": false
  }
}
```

### Example 4: Snakemake Variant Calling

A Snakemake workflow for variant calling.

**Workflow Definition (Snakefile):**

```python
configfile: "config.yaml"

rule all:
    input:
        expand("results/{sample}/variants.vcf", sample=config["samples"])

rule fastqc:
    input:
        "data/{sample}.fastq.gz"
    output:
        "results/{sample}/fastqc.html"
    shell:
        "fastqc {input} -o results/{wildcards.sample}"

rule bwa_mem:
    input:
        reads="data/{sample}.fastq.gz",
        ref=config["reference"]
    output:
        bam="results/{sample}/aligned.bam"
    threads: 4
    shell:
        "bwa mem -t {threads} {input.ref} {input.reads} | "
        "samtools sort -@ {threads} -o {output.bam}"

rule call_variants:
    input:
        bam="results/{sample}/aligned.bam",
        ref=config["reference"]
    output:
        vcf="results/{sample}/variants.vcf"
    shell:
        "bcftools mpup -f {input.ref} {input.bam} | "
        "bcftools call -mv -o {output.vcf}"
```

**Configuration (config.yaml):**

```yaml
samples:
  - sample1
  - sample2
reference: "data/reference/hg38.fa"
```

**WES API Request:**

```json
{
  "workflow_type": "SMK",
  "workflow_type_version": "6.0.0",
  "workflow_url": "s3://bucket/workflows/variant-calling/Snakefile",
  "workflow_params": {
    "config": "s3://bucket/workflows/variant-calling/config.yaml"
  },
  "tags": {
    "project": "variant-calling",
    "pipeline": "snakemake"
  }
}
```

## Input File Examples

### TES Input with File URIs

```json
{
  "name": "file-processing",
  "executors": [
    {
      "image": "ubuntu:latest",
      "command": ["cat", "/input/data.txt"],
      "cwd": "/workspace"
    }
  ],
  "inputs": {
    "input_file": {
      "type": "FILE",
      "location": "s3://bucket/data/input.txt",
      "path": "/input/data.txt"
    }
  }
}
```

### WES Input with Multiple Parameters

```json
{
  "workflow_type": "CWL",
  "workflow_type_version": "v1.0",
  "workflow_url": "s3://bucket/workflows/alignment.cwl",
  "workflow_params": {
    "reads": {
      "class": "File",
      "location": "s3://bucket/reads/sample.fastq.gz"
    },
    "reference": {
      "class": "File",
      "location": "s3://bucket/reference/hg38.fa"
    },
    "output_dir": "s3://bucket/results/alignment",
    "threads": 8,
    "memory_gb": 16
  }
}
```

## Best Practices

### Workflow Design

1. **Container Images**: Use specific version tags (e.g., `python:3.11-slim` instead of `python:latest`)
2. **Resource Management**: Specify CPU, memory, and disk requirements explicitly
3. **Error Handling**: Include proper error handling and logging in your workflows
4. **Idempotency**: Design workflows that can be safely re-run without side effects

### Input Management

1. **Validation**: Validate input parameters before execution
2. **Default Values**: Provide sensible defaults for optional parameters
3. **Documentation**: Document all input parameters with clear descriptions
4. **Type Safety**: Use appropriate data types for parameters

### Output Management

1. **Structured Output**: Use standardized output formats (JSON, CSV, VCF, etc.)
2. **Metadata**: Include metadata about the workflow execution in outputs
3. **Versioning**: Track workflow versions with corresponding output schemas
4. **Cleanup**: Implement cleanup of temporary files and resources

## Testing Workflows

Before deploying workflows to production:

1. **Local Testing**: Test workflows locally using Docker/Singularity
2. **Small Datasets**: Verify with small test datasets before processing large data
3. **Parameter Validation**: Test with various input parameter combinations
4. **Resource Monitoring**: Monitor resource usage during test runs

## Additional Resources

- [CWL Documentation](https://www.commonwl.org/)
- [WDL Documentation](https://github.com/openwdl/wdl)
- [Nextflow Documentation](https://www.nextflow.io/docs/latest/)
- [Snakemake Documentation](https://snakemake.readthedocs.io/)
- [GA4GH Task Execution Service API](https://ga4gh.github.io/task-execution-service/)
- [GA4GH Workflow Execution Service API](https://ga4gh.github.io/workflow-execution-service/)
