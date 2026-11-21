import urllib.request
import subprocess
import time
import sys

server_script = r'C:\Users\user\.gemini\antigravity\scratch\jkssb-prep-pwa\scripts\serve.py'
proc = subprocess.Popen([sys.executable, server_script, '8088'])
time.sleep(1.5)

try:
    urls = [
        'http://localhost:8088/index.html',
        'http://localhost:8088/manifest.json',
        'http://localhost:8088/data/posts_syllabus.json',
        'http://localhost:8088/data/dataset_manifest.json',
        'http://localhost:8088/data/questions_starter.json',
        'http://localhost:8088/data/packs/pack_01.json'
    ]
    all_ok = True
    for u in urls:
        resp = urllib.request.urlopen(u, timeout=5)
        ctype = resp.headers.get('Content-Type')
        data_len = len(resp.read())
        print(f"PASS: {u} -> Status {resp.status}, Content-Type: {ctype}, Size: {data_len:,} bytes")
    print("\nALL PWA ENDPOINTS VERIFIED SUCCESSFULLY!")
finally:
    proc.terminate()
