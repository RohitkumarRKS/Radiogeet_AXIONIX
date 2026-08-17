# Radiogeet AXIONIX — Industrial Monitoring System

**Advanced X-Connected Intelligent Operational Network**

Radiogeet AXIONIX is a high-performance Django-based industrial web application designed for real-time tank level telemetry monitoring, alarm management, historical trends, reports, and data logging. It is built to interface with hardware devices like the Masibus Scanner (via Modbus RS485 serial communication) or run in a simulation mode for easy testing and development.

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Architecture](#2-project-architecture)
3. [Step-by-Step Setup Guide](#3-step-by-step-setup-guide)
   - [Step 1: Open Project Directory](#step-1-open-project-directory)
   - [Step 2: Create a Python Virtual Environment](#step-2-create-a-python-virtual-environment)
   - [Step 3: Activate the Virtual Environment](#step-3-activate-the-virtual-environment)
   - [Step 4: Install Dependencies](#step-4-install-dependencies)
   - [Step 5: Database Configuration (SQLite vs. Oracle)](#step-5-database-configuration-sqlite-vs-oracle)
   - [Step 6: Running Database Migrations](#step-6-running-database-migrations)
   - [Step 7: Create a Superuser / Admin Account](#step-7-create-a-superuser--admin-account)
4. [Running the Application](#4-running-the-application)
   - [Method A: Using the Automated Launcher (Recommended)](#method-a-using-the-automated-launcher-recommended)
   - [Method B: Standard Django Development Command](#method-b-standard-django-development-command)
5. [Telemetry Scanner & Simulator Mode](#5-telemetry-scanner--simulator-mode)
6. [Troubleshooting & Support](#6-troubleshooting--support)

---

## 1. Prerequisites

Before setting up the project, make sure you have the following installed on your system:
- **Python 3.10 or higher** (Ensure that you check the box to **"Add Python to PATH"** during installation).
- **Git** (optional, for version control).
- **Oracle Database Client** (Optional, only if using the default Oracle Database engine config).

---

## 2. Project Architecture

The workspace is structured as follows:
- **`core/`**: The core Django app containing models, views, forms, and business logic.
  - `modbus_daemon.py`: Background telemetry scanner polling Modbus RS485 registers.
  - `views.py`: Application controllers and API endpoints.
  - `models.py`: Database schemas (UserProfile, Tank, TankReading, Alarm, EventLog, etc.).
- **`radiogeet_axionix/`**: Main Django configuration directory (settings, root URLs, WSGI/ASGI configurations).
- **`static/` & `templates/`**: Frontend design assets (CSS, JS, SVG, and HTML views).
- **`launcher.py`**: A helper script to spin up the local development server and launch the app in your browser automatically.
- **`requirements.txt`**: List of Python package dependencies.
- **`db.sqlite3`**: Default pre-populated SQLite database for development.

---

## 3. Step-by-Step Setup Guide

### Step 1: Open Project Directory
Open your terminal (PowerShell, Command Prompt, or terminal of choice) and navigate to the project directory:
```bash
cd "D:\Radiogeet AXIONIX"
```

### Step 2: Create a Python Virtual Environment
Creating a virtual environment ensures that the dependencies of this project do not conflict with other Python projects on your machine:
```bash
python -m venv .venv
```

### Step 3: Activate the Virtual Environment
Activate the environment depending on your operating system:
* **Windows (PowerShell):**
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
* **Windows (Command Prompt):**
  ```cmd
  .\.venv\Scripts\activate.bat
  ```
* **macOS / Linux:**
  ```bash
  source .venv/bin/activate
  ```

Once activated, your terminal prompt will show `(.venv)` at the beginning of the line.

### Step 4: Install Dependencies
Install all required packages from `requirements.txt`:
```bash
pip install -r requirements.txt
```
*Note: If you plan to run with the default Oracle configuration, you may also need to install the Oracle DB client library:*
```bash
pip install oracledb
```

### Step 5: Database Configuration (SQLite vs. Oracle)

The project supports both SQLite and Oracle databases.

#### Option A: Quick Run with SQLite (Recommended for local dev)
The project comes with a pre-configured, populated local database (`db.sqlite3`). To switch the project to SQLite, open `radiogeet_axionix/settings.py` and replace the `DATABASES` setting with:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(BASE_DIR, "db.sqlite3"),
    }
}
```

#### Option B: Run with Oracle Database
If you prefer using Oracle Database (as configured in the default settings), make sure you have a local or remote Oracle Instance running and configure the credentials in `radiogeet_axionix/settings.py`:
```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.oracle",
        "NAME": "xe",
        "USER": "SYSTEM",
        "PASSWORD": "admin",  # Change to your Oracle password
        "HOST": "127.0.0.1",
        "PORT": "1521",
    }
}
```

### Step 6: Running Database Migrations
Apply the migrations to set up your database schema:
```bash
python manage.py migrate
```

### Step 7: Create a Superuser / Admin Account
To access the Django Admin dashboard (`http://127.0.0.1:8000/admin/`) and manage database entries directly:
```bash
python manage.py createsuperuser
```
Follow the prompts to enter a username, email, and password.

---

## 4. Running the Application

### Method A: Using the Automated Launcher (Recommended)
You can start the Django web server and automatically open the application in your web browser using the helper script:
```bash
python launcher.py
```
This script will:
1. Detect your `.venv` Python executable.
2. Start the Django server at `http://127.0.0.1:8000/` in `--noreload` mode.
3. Open your system's default browser to the web portal automatically after 2.5 seconds.

### Method B: Standard Django Development Command
Alternatively, you can run the standard Django development server manually:
```bash
python manage.py runserver
```
Once the server is running, open your web browser and navigate to:
`http://127.0.0.1:8000/`

---

## 5. Telemetry Scanner & Simulator Mode

The application includes a background worker thread (`core/modbus_daemon.py`) that queries Modbus registers to collect tank levels.

1. **Hardware Connection**: By default, the system scans a physical serial device (e.g. Masibus Scanner) on `COM3`. You can modify the active port and parameters under **Settings > Connection Configurations** in the web interface.
2. **Offline Simulator Mode**: If you do not have Modbus serial hardware connected, you can run the scanner in simulation mode. 
   - Go to **Settings** in the web application.
   - Set the COM Port parameter to `SIMULATOR`.
   - The daemon will automatically switch to querying mock data from the `SimulatedRegister` table, allowing you to test trends, alarm limits, and dashboards with artificial readings.

---

## 6. Troubleshooting & Support

- **Error: "Port COM3 not available" / "Device might be disconnected"**
  - Change the active port in Settings to `SIMULATOR` if you do not have hardware plugged in.
- **Error: "Oracle Client not installed"**
  - If you see database connection errors related to Oracle, switch to the SQLite configuration in `radiogeet_axionix/settings.py` (see Step 5).
- **Admin Access**:
  - Access the admin panel at `http://127.0.0.1:8000/admin/` using the superuser account you created in Step 7.
