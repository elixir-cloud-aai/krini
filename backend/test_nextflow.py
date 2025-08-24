#!/usr/bin/env python3
"""
Simple script to test if Nextflow is working correctly
"""
import subprocess
import os
import sys

def test_nextflow():
    print("=== Testing Nextflow Installation ===")
    
    # Set Nextflow home directory
    os.environ['NXF_HOME'] = '/app/.nextflow'
    
    # Test 1: Check if nextflow is in PATH
    try:
        result = subprocess.run(['which', 'nextflow'], capture_output=True, text=True)
        print(f"which nextflow: {result.stdout.strip()}")
        if result.returncode != 0:
            print("❌ nextflow not found in PATH")
            return False
    except Exception as e:
        print(f"❌ Error running 'which nextflow': {e}")
        return False
    
    # Test 2: Check file permissions
    nextflow_path = result.stdout.strip()
    if os.path.exists(nextflow_path):
        stat_info = os.stat(nextflow_path)
        print(f"File permissions: {oct(stat_info.st_mode)}")
        print(f"File owner: {stat_info.st_uid}")
        print(f"Executable: {os.access(nextflow_path, os.X_OK)}")
    
    # Test 3: Try to run nextflow version
    try:
        print("\n=== Testing nextflow -version ===")
        # Use -version instead of --version for Nextflow
        result = subprocess.run([nextflow_path, '-version'], 
                              capture_output=True, text=True, timeout=30)
        print(f"Return code: {result.returncode}")
        print(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
        
        if result.returncode == 0:
            print("✅ Nextflow version command successful")
            return True
        else:
            print("❌ Nextflow version command failed")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ Nextflow version command timed out")
        return False
    except Exception as e:
        print(f"❌ Error running nextflow version: {e}")
        return False

def test_java():
    print("\n=== Testing Java Installation ===")
    try:
        result = subprocess.run(['java', '-version'], capture_output=True, text=True)
        print(f"Java version return code: {result.returncode}")
        print(f"Java version output:\n{result.stderr}")  # Java version goes to stderr
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error testing Java: {e}")
        return False

if __name__ == "__main__":
    print(f"Current PATH: {os.environ.get('PATH', 'NOT SET')}")
    print(f"Current user: {os.getuid()}")
    print(f"Working directory: {os.getcwd()}")
    print(f"NXF_HOME: {os.environ.get('NXF_HOME', 'NOT SET')}")
    
    java_ok = test_java()
    nextflow_ok = test_nextflow()
    
    print(f"\n=== Summary ===")
    print(f"Java: {'✅' if java_ok else '❌'}")
    print(f"Nextflow: {'✅' if nextflow_ok else '❌'}")
    
    sys.exit(0 if (java_ok and nextflow_ok) else 1)
