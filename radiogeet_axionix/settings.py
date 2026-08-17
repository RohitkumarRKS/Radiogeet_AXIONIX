import os

import sys
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = "django-insecure-r@d10g33t-ax10n1x-s3cr3t-k3y-2026!#$%^&*()"

DEBUG = True

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "radiogeet_axionix.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [os.path.join(BASE_DIR, "templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "radiogeet_axionix.wsgi.application"

def get_db_path():
    if os.environ.get('RUNNING_AS_EXE') == 'True':
        import shutil
        import sys
        
        # Where the PyInstaller bundled files are extracted
        meipass = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
        bundled_db = os.path.join(meipass, 'db.sqlite3')
        
        target_db = None
        
        # Candidate 1: ProgramData (All Users)
        program_data = os.environ.get('PROGRAMDATA')
        if program_data:
            dir_path = os.path.join(program_data, 'RadiogeetAxionix')
            try:
                os.makedirs(dir_path, exist_ok=True)
                test_file = os.path.join(dir_path, '.write_test')
                with open(test_file, 'w') as f:
                    f.write('1')
                os.remove(test_file)
                target_db = os.path.join(dir_path, 'db.sqlite3')
            except Exception:
                pass
        
        # Candidate 2: Local AppData (C:\Users\<username>\AppData\Local\RadiogeetAxionix)
        if not target_db:
            local_app_data = os.environ.get('LOCALAPPDATA')
            if local_app_data:
                dir_path = os.path.join(local_app_data, 'RadiogeetAxionix')
                try:
                    os.makedirs(dir_path, exist_ok=True)
                    target_db = os.path.join(dir_path, 'db.sqlite3')
                except Exception:
                    pass
                
        # Candidate 3: User's Profile
        if not target_db:
            user_profile = os.environ.get('USERPROFILE') or os.path.expanduser('~')
            if user_profile:
                dir_path = os.path.join(user_profile, '.radiogeet_axionix')
                try:
                    os.makedirs(dir_path, exist_ok=True)
                    target_db = os.path.join(dir_path, 'db.sqlite3')
                except Exception:
                    pass
                
        # Fallback to local folder where the exe is running
        if not target_db:
            exe_dir = os.path.dirname(os.path.abspath(sys.executable))
            target_db = os.path.join(exe_dir, 'db.sqlite3')
            
        # Copy the pre-configured db with all tanks into the target path if missing
        if target_db and not os.path.exists(target_db):
            try:
                if os.path.exists(bundled_db):
                    shutil.copy2(bundled_db, target_db)
            except Exception:
                pass
                
        return target_db
    else:
        return os.path.join(BASE_DIR, 'db.sqlite3')

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": get_db_path(),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "Asia/Kolkata"

USE_I18N = True

USE_TZ = True

USE_L10N = True

STATIC_URL = "/static/"

STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")

STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]

MEDIA_URL = "/media/"

MEDIA_ROOT = os.path.join(BASE_DIR, "media/")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Login redirect
LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'dashboard'

# Ensure session stays active
SESSION_COOKIE_AGE = 1209600  # 2 weeks
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

LOGOUT_REDIRECT_URL = "/login/"
