"""
Lightweight Python server for JKSSB Prep Master PWA.
Serves static assets with correct MIME types for Service Worker, Manifest, and JSON data.
"""

import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class PWAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable Service Worker and offline caching headers
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def guess_type(self, path):
        if path.endswith('.json'):
            return 'application/json'
        if path.endswith('.webmanifest') or path.endswith('manifest.json'):
            return 'application/manifest+json'
        if path.endswith('.svg'):
            return 'image/svg+xml'
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.css'):
            return 'text/css'
        return super().guess_type(path)

def run():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    # Try finding an open port if 8080 is occupied
    for p in range(port, port + 20):
        try:
            with socketserver.TCPServer(("", p), PWAHandler) as httpd:
                print("=" * 60)
                print(f"  JKSSB Prep Master PWA is Running!")
                print(f"  Local URL:  http://localhost:{p}")
                print(f"  Root Dir:   {DIRECTORY}")
                print("=" * 60)
                print("  Press Ctrl+C to stop the server.")
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == '__main__':
    run()
