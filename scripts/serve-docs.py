#!/usr/bin/env python3
"""Serve `docs/` for local reading, with caching disabled.

`python3 -m http.server` is almost right, but it sends `Last-Modified` and no
`Cache-Control`. With no `Cache-Control` a browser falls back to *heuristic*
freshness — it may reuse a cached response without revalidating at all — and
docsify fetches every page as an ordinary XHR for a `.md` file. The symptom is
editing a page, reloading, and still reading the old text.

So: send `no-store`, and ignore conditional requests, which a browser that
cached a page before this server existed would still be sending.
"""

from __future__ import annotations

import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("DOCS_PORT", "4000"))
DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, "docs")

CONDITIONAL_HEADERS = ("If-Modified-Since", "If-None-Match")


class NoCacheHandler(SimpleHTTPRequestHandler):
    # Keep-alive; the default HTTP/1.0 opens a fresh connection per file, and
    # docsify asks for several on every navigation.
    protocol_version = "HTTP/1.1"

    def send_head(self):
        # Drop revalidation headers so every response is a full 200 carrying
        # the bytes on disk. Without this a browser holding a pre-`no-store`
        # cache entry gets a 304 and redraws the stale page.
        for header in CONDITIONAL_HEADERS:
            while header in self.headers:
                del self.headers[header]
        return super().send_head()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


def main() -> None:
    handler = partial(NoCacheHandler, directory=DOCS_DIR)
    with ThreadingHTTPServer(("127.0.0.1", PORT), handler) as httpd:
        print(f"docs → http://localhost:{PORT}  (Ctrl+C to stop)")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == "__main__":
    main()
