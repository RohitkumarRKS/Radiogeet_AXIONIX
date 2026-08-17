import sys
import os
import threading
import time
import socket
import urllib.request
import traceback

# ---- Determine base directory (frozen EXE vs script) ----
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS
    # Write logs next to the EXE file, not inside _MEIPASS
    exe_dir = os.path.dirname(sys.executable)
    log_path = os.path.join(exe_dir, 'app_debug.log')
    error_log = os.path.join(exe_dir, 'app_error.log')
    try:
        _log_file = open(log_path, 'a', encoding='utf-8')
        sys.stdout = _log_file
        sys.stderr = _log_file
    except Exception:
        try:
            sys.stdout = open(os.devnull, 'w')
            sys.stderr = open(os.devnull, 'w')
        except Exception:
            pass
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    exe_dir = base_dir
    error_log = os.path.join(base_dir, 'app_error.log')

# ---- sys.path: ensure Django apps are discoverable ----
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

# ---- Django env setup ----
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'radiogeet_axionix.settings')
os.environ['RUNNING_AS_EXE'] = 'True'

# ---- Imports ----
from django.core.management import execute_from_command_line

import webview
import pystray
from PIL import Image


# =========================================
# Utilities
# =========================================

def get_free_port():
    """Find a free TCP port on localhost."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


def load_tray_icon():
    """
    Try to load icon.ico → icon.png → logo.png → fallback placeholder.
    Returns a PIL Image ready for pystray.
    """
    candidates = [
        os.path.join(base_dir, 'static', 'images', 'icon2.ico'),
        os.path.join(base_dir, 'static', 'images', 'icon2.png'),
        os.path.join(base_dir, 'static', 'images', 'logo.png'),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                img = Image.open(path)
                img.load()
                # pystray works best with RGBA
                img = img.convert('RGBA')
                return img, path
            except Exception:
                continue
    # Fallback: generate a simple blue square
    img = Image.new('RGBA', (64, 64), color=(73, 109, 137, 255))
    return img, None


# =========================================
# Django server thread
# =========================================

def start_django(port):
    """Run Django migrations then start the dev server."""
    try:
        execute_from_command_line([sys.argv[0], 'migrate', '--noinput'])
    except Exception as e:
        with open(error_log, 'a', encoding='utf-8') as f:
            f.write(f"[MIGRATION ERROR] {e}\n{traceback.format_exc()}\n")

    try:
        execute_from_command_line([sys.argv[0], 'runserver', f'127.0.0.1:{port}', '--noreload'])
    except Exception as e:
        with open(error_log, 'a', encoding='utf-8') as f:
            f.write(f"[SERVER ERROR] {e}\n{traceback.format_exc()}\n")


# =========================================
# Wait for server then navigate
# =========================================

def wait_for_server_and_navigate(window, port):
    """Poll until Django responds, then load the dashboard URL."""
    url = f'http://127.0.0.1:{port}/'
    while True:
        try:
            urllib.request.urlopen(url, timeout=2)
            window.load_url(url)
            break
        except Exception:
            pass
        time.sleep(1)


# =========================================
# System tray icon
# =========================================

def setup_tray(window):
    """Create the system tray icon with Show/Exit options."""
    def show_window(icon, item):
        window.show()
        window.restore()

    def quit_app(icon, item):
        icon.stop()
        window.destroy()
        os._exit(0)

    image, _ = load_tray_icon()

    menu = pystray.Menu(
        pystray.MenuItem('Open Dashboard', show_window, default=True),
        pystray.MenuItem('Exit', quit_app)
    )

    tray_icon = pystray.Icon("RadiogeetAXIONIX", image, "Radiogeet AXIONIX", menu)
    tray_icon.run()


# =========================================
# Main entry point
# =========================================

if __name__ == '__main__':
    port = get_free_port()

    # Start Django server in background thread
    server_thread = threading.Thread(target=start_django, args=(port,), daemon=True)
    server_thread.start()

    # Loading splash HTML shown while Django boots
    loading_html = """
    <html>
    <head>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: #0a0e1a;
                color: #f3f4f6;
                font-family: 'Segoe UI', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                text-align: center;
            }
            h1 { color: #3b82f6; font-size: 2rem; letter-spacing: 2px; margin-bottom: 12px; }
            p { color: #9ca3af; font-size: 0.9rem; margin: 4px 0; }
            .loader {
                margin-top: 28px;
                width: 40px; height: 40px;
                border: 3px solid rgba(59,130,246,0.2);
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 0.9s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <h1>RADIOGEET AXIONIX</h1>
        <p>Initializing Application...</p>
        <p style="color:#64748b; font-size:0.8rem;">Please wait — applying database migrations on first launch.</p>
        <div class="loader"></div>
    </body>
    </html>
    """

    # Enable downloads for CSV/Excel exports
    webview.settings['ALLOW_DOWNLOADS'] = True

    # Create the main webview window
    window = webview.create_window(
        'Radiogeet AXIONIX',
        html=loading_html,
        width=1280,
        height=820,
        min_size=(900, 600),
        background_color='#0a0e1a',
    )

    # Intercept the close button → hide to tray instead of quitting
    def on_closing():
        window.hide()
        return False  # Returning False cancels the close/destroy

    window.events.closing += on_closing

    # Start background thread: wait for Django, then navigate
    nav_thread = threading.Thread(
        target=wait_for_server_and_navigate,
        args=(window, port),
        daemon=True
    )
    nav_thread.start()

    # Start system tray in background thread
    tray_thread = threading.Thread(target=setup_tray, args=(window,), daemon=True)
    tray_thread.start()

    # Determine window icon path
    _, icon_path = load_tray_icon()
    ico_path = os.path.join(base_dir, 'static', 'images', 'icon2.ico')
    if os.path.exists(ico_path):
        icon_path = ico_path

    # Start pywebview GUI loop (blocks until window is destroyed)
    webview.start(
        private_mode=False,
        debug=False,
        icon=icon_path,
    )
