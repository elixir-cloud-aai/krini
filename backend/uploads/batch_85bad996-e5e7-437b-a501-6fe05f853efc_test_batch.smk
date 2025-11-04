rule all:
    input:
        "output.txt"

rule hello:
    output:
        "output.txt" 
    shell:
        "echo Hello from Snakemake batch! > {output}"
