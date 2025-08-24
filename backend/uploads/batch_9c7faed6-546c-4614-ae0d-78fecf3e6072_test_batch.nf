#!/usr/bin/env nextflow

nextflow.enable.dsl=2

process sayHello {
    input:
    val name

    output:
    stdout

    script:
    """
    echo "Hello, $name!"
    """
}

workflow {
    sayHello("Batch Processing Test")
}
