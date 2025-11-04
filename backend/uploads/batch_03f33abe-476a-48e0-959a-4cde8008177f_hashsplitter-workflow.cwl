#!/usr/bin/env cwlrunner

class: Workflow

cwlVersion: v1.0

inputs:
  - id: input
    type: File
    doc: "to be hashed all the ways"

outputs:
  - id: output
    type: File
    outputSource: unify/output

steps:
  - id: md5
    run: hashsplitter-tool-md5.cwl.yml
    in:
      - { id: input, source: input }
    out:
      - { id: output }

  - id: sha1
    run: hashsplitter-tool-sha1.cwl.yml
    in:
      - { id: input, source: input }
    out:
      - { id: output }

  - id: whirlpool
    run: hashsplitter-tool-whirlpool.cwl.yml
    in:
      - { id: input, source: input }
    out:
      - { id: output }

  - id: unify
    run: hashsplitter-tool-unify.cwl.yml
    in:
      - { id: md5, source: md5/output }
      - { id: sha1, source: sha1/output }
      - { id: whirlpool, source: whirlpool/output }
    out:
      - { id: output }
