"""
Django settings for project_config project.
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/stable/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-default-secret-key-for-dev')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*'] # Für Entwicklung, in Produktion einschränken


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'rest_framework',
    'corsheaders',
    # My apps
    'app_core.apps.AppCoreConfig',
]

# Custom User Model
AUTH_USER_MODEL = 'app_core.Employee'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CORS Settings - Allow all origins for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'project_config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'project_config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/stable/ref/settings/#databases

# Database - Use environment variable to switch between SQLite and PostgreSQL
USE_SQLITE = os.environ.get('USE_SQLITE', 'True') == 'True'

if USE_SQLITE:
    # Für lokale Entwicklung mit SQLite (einfacher)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Für Produktion mit PostgreSQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'gaststaette_db'),
            'USER': os.environ.get('DB_USER', 'admin'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'password'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }


# Password validation
# https://docs.djangoproject.com/en/stable/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.common_password_Validator', # Korrigiert
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/stable/topics/i18n/

LANGUAGE_CODE = 'de-de' # Geändert zu Deutsch

TIME_ZONE = 'Europe/Berlin' # Zeitzone angepasst

USE_I18N = True

USE_TZ = True # Wichtig für korrekte Datums-/Zeithandhabung


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/stable/howto/static-files/

STATIC_URL = 'static/'
# STATIC_ROOT = BASE_DIR / 'staticfiles' # Für collectstatic in Produktion

# Default primary key field type
# https://docs.djangoproject.com/en/stable/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # Hier könnten später Token-Authentifizierungsklassen (z.B. JWT) hinzugefügt werden
        # 'rest_framework.authentication.SessionAuthentication', # Für Browsable API
        # 'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', # Für den Anfang, später einschränken
        # 'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10, # Standard-Seitengröße für paginierte Ergebnisse
    'DATETIME_FORMAT': "%Y-%m-%dT%H:%M:%S%z", # ISO 8601 Format
}

# Erforderlich für ein Django-Projekt
# Diese Datei würde normalerweise von `django-admin startproject` erstellt werden.
# Ich erstelle sie hier, um die Struktur zu vervollständigen.
# backend_django/project_config/asgi.py
# backend_django/project_config/wsgi.py
# backend_django/manage.py (wurde schon als Platzhalter erstellt)

# Logging (Beispielkonfiguration)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO', # In DEBUG-Modus ggf. 'DEBUG'
    },
}
