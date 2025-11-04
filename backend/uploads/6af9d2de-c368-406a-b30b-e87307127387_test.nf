process sayHello {
    output:
        path 'hello.txt'
    """
    echo 'Hello from Nextflow!' > hello.txt
    """
}

workflow {
    sayHello()
} 