#!/usr/bin/env nextflow

/*
 * Test Nextflow workflow for geographic mapping demonstration
 */

// Parameters
params.greeting = 'Hello World!'
params.output_dir = './results'

// Create a simple process
process sayHello {
    publishDir params.output_dir, mode: 'copy'

    output:
    file 'hello.txt'

    script:
    """
    echo "${params.greeting}" > hello.txt
    echo "This is a test workflow for TES geographic mapping" >> hello.txt
    echo "Timestamp: \$(date)" >> hello.txt
    """
}

workflow {
    sayHello()
}
