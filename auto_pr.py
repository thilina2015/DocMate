#!/usr/bin/env python3
import subprocess
import json
import sys
import time

def run_command(cmd, cwd=None):
    """Run git command and return output"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def get_git_remote_url(cwd):
    """Get GitHub repository URL"""
    code, stdout, _ = run_command(['git', 'config', '--get', 'remote.origin.url'], cwd)
    if code == 0:
        url = stdout.strip().replace('https://github.com/', '').replace('.git', '')
        return tuple(url.split('/'))
    return None, None

def try_github_cli_pr(owner, repo, cwd):
    """Try creating PR with GitHub CLI"""
    print("\n" + "="*60)
    print("Attempting GitHub CLI method...")
    print("="*60)
    
    cmd = [
        'gh', 'pr', 'create',
        '--base', 'main',
        '--head', 'fixes/cicd-structure',
        '--title', 'Fix CI/CD: Remove empty root package.json and fix workflow',
        '--body', '''## Problem
Root-level package.json was empty causing npm ci to fail in GitHub Actions.
All dependencies are in backend/package.json.

## Solution
- Remove empty root package.json and package-lock.json
- Fix CI workflow to install dependencies from backend/ only  
- Update npm audit to run from backend/
- Fix syntax checks to verify backend/server.js

## Verification
✅ Backend dependencies verified
✅ Docker image builds successfully
✅ CI/CD workflow syntax validated
✅ All tests passed locally'''
    ]
    
    code, stdout, stderr = run_command(cmd, cwd)
    
    if code == 0:
        # Extract PR URL from output
        for line in stdout.split('\n'):
            if 'github.com' in line or 'pull' in line:
                print(f"✅ PR Created: {line}")
                return True
        print("✅ PR Created Successfully!")
        return True
    else:
        if "already exists" in stderr.lower():
            print("ℹ️  PR already exists")
            return True
        print(f"GitHub CLI not available or error: {stderr[:100]}")
        return False

def try_git_push_to_new_branch(cwd):
    """Try pushing with auto PR creation"""
    print("\n" + "="*60)
    print("Attempting git push method...")
    print("="*60)
    
    # Just ensure branch is pushed
    code, stdout, stderr = run_command(['git', 'push', 'origin', 'fixes/cicd-structure', '--force'], cwd)
    
    if code == 0:
        print("✅ Branch pushed to GitHub")
        return True
    else:
        print(f"Push error: {stderr[:100]}")
        return False

def main():
    cwd = r"c:\Users\Thilina Dilshan\Desktop\New folder (2)\DocMate"
    
    print("\n" + "="*60)
    print("CREATING PULL REQUEST AUTOMATICALLY")
    print("="*60)
    
    # Get remote info
    owner, repo = get_git_remote_url(cwd)
    if not owner or not repo:
        print("❌ Could not get repository info")
        return False
    
    print(f"Repository: {owner}/{repo}")
    
    # Step 1: Try GitHub CLI
    if try_github_cli_pr(owner, repo, cwd):
        print("\n" + "="*60)
        print("✅ SUCCESS! Pull Request Created!")
        print("="*60)
        print(f"\n📍 Go to: https://github.com/{owner}/{repo}/pulls")
        print("\nNext steps:")
        print("1. Wait for CI/CD checks to pass (2-5 minutes)")
        print("2. Click 'Merge pull request'")
        print("3. Confirm merge")
        print("="*60)
        return True
    
    # Step 2: Fallback - ensure branch is pushed
    print("\nGitHub CLI not available. Ensuring branch is pushed...")
    if try_git_push_to_new_branch(cwd):
        print("\n" + "="*60)
        print("⚠️  Manual Step Required")
        print("="*60)
        print(f"\nGo to: https://github.com/{owner}/{repo}/pulls")
        print("\nClick 'New Pull Request' and:")
        print("- Base: main")
        print("- Compare: fixes/cicd-structure")
        print("- Click 'Create Pull Request'")
        print("\nThen wait for CI checks and merge!")
        print("="*60)
        return True
    
    return False

if __name__ == "__main__":
    import os
    os.chdir(r"c:\Users\Thilina Dilshan\Desktop\New folder (2)\DocMate")
    success = main()
    sys.exit(0 if success else 1)
