#!/usr/bin/env python3
"""Serves the repository on 127.0.0.1 for the demo: python3 demo/serve.py [port], then open
http://127.0.0.1:<port>/demo/. Unlike `python3 -m http.server`, it answers Range requests, without
which a browser can only seek within what it has downloaded so far."""
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANGE = re.compile(r'bytes=(\d*)-(\d*)$')


class RangeHandler(SimpleHTTPRequestHandler):
    remaining = None

    def end_headers(self):
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        match = RANGE.match(self.headers.get('Range', '').strip())
        if not match or not os.path.isfile(path) or match.groups() == ('', ''):
            return super().send_head()
        size = os.path.getsize(path)
        first, last = match.groups()
        start, end = (size - int(last), size - 1) if first == '' else (int(first), int(last) if last else size - 1)
        start, end = max(start, 0), min(end, size - 1)
        if start > end:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        source = open(path, 'rb')
        source.seek(start)
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self.remaining = end - start + 1
        return source

    def copyfile(self, source, outputfile):
        if self.remaining is None:
            super().copyfile(source, outputfile)
            return
        while self.remaining > 0:
            chunk = source.read(min(1 << 16, self.remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            self.remaining -= len(chunk)
        self.remaining = None


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(RangeHandler, directory=ROOT))
    print(f'http://127.0.0.1:{port}/demo/')
    server.serve_forever()
