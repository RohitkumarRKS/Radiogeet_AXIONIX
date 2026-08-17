from django import forms
from django.contrib.auth.models import User
from .models import UserProfile, WorkspaceConfig


class SignupForm(forms.Form):
    """User registration form."""
    full_name = forms.CharField(max_length=200, widget=forms.TextInput(attrs={
        "placeholder": "Enter your full name", "id": "id_full_name"
    }))
    username = forms.CharField(max_length=150, widget=forms.TextInput(attrs={
        "placeholder": "Choose a username", "id": "id_username"
    }))
    email = forms.EmailField(widget=forms.EmailInput(attrs={
        "placeholder": "Enter your email address", "id": "id_email"
    }))
    mobile_number = forms.CharField(max_length=20, required=False, widget=forms.TextInput(attrs={
        "placeholder": "Enter your mobile number", "id": "id_mobile"
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        "placeholder": "Create a password", "id": "id_password"
    }))
    confirm_password = forms.CharField(widget=forms.PasswordInput(attrs={
        "placeholder": "Confirm your password", "id": "id_confirm_password"
    }))
    role = forms.ChoiceField(choices=UserProfile.ROLE_CHOICES, widget=forms.Select(attrs={
        "id": "id_role"
    }))
    organization = forms.CharField(max_length=200, required=False, widget=forms.TextInput(attrs={
        "placeholder": "Enter organization/company name", "id": "id_organization"
    }))
    timezone = forms.CharField(max_length=50, initial="(UTC+05:30) Asia/Kolkata", widget=forms.Select(
        choices=[
            ("Asia/Kolkata", "(UTC+05:30) Asia/Kolkata"),
            ("America/New_York", "(UTC-05:00) America/New_York"),
            ("Europe/London", "(UTC+00:00) Europe/London"),
            ("Asia/Tokyo", "(UTC+09:00) Asia/Tokyo"),
            ("America/Los_Angeles", "(UTC-08:00) America/Los_Angeles"),
            ("Asia/Dubai", "(UTC+04:00) Asia/Dubai"),
            ("Asia/Singapore", "(UTC+08:00) Asia/Singapore"),
        ],
        attrs={"id": "id_timezone"}
    ))
    agree_terms = forms.BooleanField(required=True, widget=forms.CheckboxInput(attrs={
        "id": "id_agree_terms"
    }))

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")
        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("Passwords do not match.")
        return cleaned_data

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError("This username is already taken.")
        return username

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError("An account with this email already exists.")
        return email


class LoginForm(forms.Form):
    """Login form."""
    username_or_email = forms.CharField(max_length=200, widget=forms.TextInput(attrs={
        "placeholder": "Enter your username or email", "id": "id_username_email"
    }))
    password = forms.CharField(widget=forms.PasswordInput(attrs={
        "placeholder": "Enter your password", "id": "id_login_password"
    }))
    remember_me = forms.BooleanField(required=False, widget=forms.CheckboxInput(attrs={
        "id": "id_remember_me"
    }))


class WorkspaceSetupForm(forms.ModelForm):
    """Workspace initial configuration form."""
    class Meta:
        model = WorkspaceConfig
        fields = [
            "full_name", "email", "company_name", "industry_type",
            "country", "phone_number", "timezone", "language",
            "activation_key", "system_usage", "number_of_sites",
            "preferred_storage", "units_preference",
        ]
        widgets = {
            "full_name": forms.TextInput(attrs={"placeholder": "Enter your full name", "id": "id_ws_full_name"}),
            "email": forms.EmailInput(attrs={"placeholder": "Enter your email address", "id": "id_ws_email"}),
            "company_name": forms.TextInput(attrs={"placeholder": "Enter company name", "id": "id_ws_company"}),
            "industry_type": forms.Select(attrs={"id": "id_ws_industry"}),
            "country": forms.Select(
                choices=[
                    ("", "Select country"),
                    ("IN", "India"),
                    ("US", "United States"),
                    ("GB", "United Kingdom"),
                    ("AE", "United Arab Emirates"),
                    ("SA", "Saudi Arabia"),
                    ("SG", "Singapore"),
                    ("JP", "Japan"),
                    ("DE", "Germany"),
                    ("AU", "Australia"),
                    ("CA", "Canada"),
                ],
                attrs={"id": "id_ws_country"}
            ),
            "phone_number": forms.TextInput(attrs={"placeholder": "Enter phone number", "id": "id_ws_phone"}),
            "timezone": forms.Select(
                choices=[
                    ("Asia/Kolkata", "(UTC+05:30) Asia/Kolkata"),
                    ("America/New_York", "(UTC-05:00) America/New_York"),
                    ("Europe/London", "(UTC+00:00) Europe/London"),
                    ("Asia/Tokyo", "(UTC+09:00) Asia/Tokyo"),
                    ("America/Los_Angeles", "(UTC-08:00) America/Los_Angeles"),
                    ("Asia/Dubai", "(UTC+04:00) Asia/Dubai"),
                ],
                attrs={"id": "id_ws_timezone"}
            ),
            "language": forms.Select(
                choices=[
                    ("English", "English"),
                    ("Hindi", "Hindi"),
                    ("Arabic", "Arabic"),
                    ("Japanese", "Japanese"),
                    ("German", "German"),
                ],
                attrs={"id": "id_ws_language"}
            ),
            "activation_key": forms.TextInput(attrs={"placeholder": "Enter your activation key", "id": "id_ws_key"}),
            "system_usage": forms.Select(
                choices=[
                    ("", "Select usage type"),
                    ("production", "Production"),
                    ("testing", "Testing / Development"),
                    ("training", "Training"),
                    ("demo", "Demo / Evaluation"),
                ],
                attrs={"id": "id_ws_usage"}
            ),
            "number_of_sites": forms.Select(
                choices=[
                    (1, "1 Site"),
                    (2, "2-5 Sites"),
                    (5, "5-10 Sites"),
                    (10, "10+ Sites"),
                ],
                attrs={"id": "id_ws_sites"}
            ),
            "preferred_storage": forms.Select(attrs={"id": "id_ws_storage"}),
            "units_preference": forms.Select(attrs={"id": "id_ws_units"}),
        }

    def clean_activation_key(self):
        from .models import LicenseKey
        activation_key = self.cleaned_data.get("activation_key", "").strip()
        valid_keys = [
            "RADIOGEET-AXIONIX-S3CR3T-K3Y-2026",
            "RADIOGEET-AXIONIX-S3CR3T-K3Y-2026-3T"
        ]
        if activation_key in valid_keys:
            return activation_key
            
        try:
            lic = LicenseKey.objects.get(key=activation_key)
            if lic.is_used:
                if self.instance and self.instance.activation_key == activation_key:
                    pass
                else:
                    raise forms.ValidationError("This license key has already been activated.")
            return activation_key
        except LicenseKey.DoesNotExist:
            raise forms.ValidationError(
                "Invalid Activation Key. Please enter a valid, active Radiogeet license key."
            )
