from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"
    verbose_name = "Radiogeet AXIONIX Core"

    def ready(self):
        import os
        import sys
        from django.db.models.signals import post_migrate
        
        # Connect signal to auto-create admin user after migrations
        post_migrate.connect(self.create_default_admin, sender=self)
        
        # Only start when running the Django web server (runserver) or as PyInstaller EXE
        if 'runserver' in sys.argv or os.environ.get('RUNNING_AS_EXE') == 'True':
            # Start if noreload is active, or if reloader's main process is active, or if EXE
            if os.environ.get('RUN_MAIN') == 'true' or '--noreload' in sys.argv or os.environ.get('RUNNING_AS_EXE') == 'True':
                from .modbus_daemon import start_modbus_daemon
                start_modbus_daemon()

    def create_default_admin(self, sender, **kwargs):
        """Auto-create a default admin user on fresh installations."""
        try:
            from django.contrib.auth.models import User
            from .models import UserProfile
            
            if not User.objects.filter(username='admin').exists():
                print("[AXIONIX] Creating default admin user...")
                admin_user = User.objects.create_superuser('admin', 'admin@radiogeet.com', 'admin123')
                
                # Assign a profile so the login flow works correctly
                UserProfile.objects.get_or_create(
                    user=admin_user,
                    defaults={
                        'role': 'Admin',
                        'is_active_user': True,
                    }
                )
                print("[AXIONIX] Default admin user created successfully.")
        except Exception as e:
            print(f"[AXIONIX] Could not create default admin: {e}")
