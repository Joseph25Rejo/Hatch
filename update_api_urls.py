#!/usr/bin/env python3
"""
Script to update API URLs in frontend files between local and production environments.
"""

import os
import re
from pathlib import Path

def update_api_urls(environment='local'):
    """
    Update all API URLs in frontend files.
    
    Args:
        environment (str): 'local' or 'production'
    """
    
    if environment == 'local':
        old_url = 'https://hatchplatform-dcdphngyewcwcuc4.centralindia-01.azurewebsites.net'
        new_url = 'http://localhost:5000'
        print("Switching to LOCAL development environment...")
    else:
        old_url = 'http://localhost:5000'
        new_url = 'https://hatchplatform-dcdphngyewcwcuc4.centralindia-01.azurewebsites.net'
        print("Switching to PRODUCTION environment...")
    
    # Find all .tsx files in frontend directory
    frontend_dir = Path('frontend/app')
    if not frontend_dir.exists():
        print("Error: frontend/app directory not found")
        return
    
    updated_files = []
    
    for file_path in frontend_dir.rglob('*.tsx'):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Count occurrences of old URL
            count = content.count(old_url)
            if count > 0:
                # Replace URLs
                new_content = content.replace(old_url, new_url)
                
                # Write back to file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                updated_files.append((file_path.relative_to(Path('.')), count))
                print(f"Updated {file_path.relative_to(Path('.'))}: {count} URLs")
        
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    print(f"\nSummary: Updated {len(updated_files)} files")
    print(f"Total URLs updated: {sum(count for _, count in updated_files)}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) != 2 or sys.argv[1] not in ['local', 'production']:
        print("Usage: python update_api_urls.py [local|production]")
        sys.exit(1)
    
    update_api_urls(sys.argv[1])