import settings_local
import os
import re

# Django settings for ff4 project.

DEBUG = settings_local.DEBUG
DEV = settings_local.DEV
TEMPLATE_DEBUG = DEBUG

PROJECT_PATH = os.path.realpath(os.path.dirname(__file__))
PROJECT_DOMAIN = ''
PROJECT_DIR = os.path.realpath(os.path.dirname(__file__))



# UNCOMMENT TO ENABLE SECURE SESSIONS
# SESSION_COOKIE_SECURE = True
# SESSION_COOKIE_HTTPONLY = True
# SESSION_COOKIE_DOMAIN = None

# global for enabling SSL redirection of admin views
# set True for properly configured production
REDIRECT_TO_SSL = False

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

# Memcached!
# CACHE_BACKEND = 'caching.backends.memcached://localhost:11211?timeout=500'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',       # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': settings_local.DB_NAME,             # Or path to database file if using sqlite3.
        'USER': settings_local.DB_USER,             # Not used with sqlite3.
        'PASSWORD': settings_local.DB_PASSWORD,     # Not used with sqlite3.
        'HOST': settings_local.DB_HOST,             # Set to empty string for localhost. Not used with sqlite3.
        'PORT': settings_local.DB_PORT,             # Set to empty string for default. Not used with sqlite3.
    }
}




# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-US'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Accepted locales
#INPUT_LANGUAGES = ('ar', 'bg', 'ca', 'cs', 'da', 'de', 'el', 'en-US', 'es',
#                   'fr', 'fy-NL', 'gl', 'he', 'hu', 'id', 'it', 'ko', 'nb-NO',
#                   'nl', 'pl', 'pt-PT', 'ro', 'ru', 'sk', 'sq', 'uk', 'vi',
#                   'zh-CN', 'zh-TW')

gettext = lambda s: s
LANGUAGES = (
    ('de', gettext('German')),
    ('en', gettext('English')),
    ('fr', gettext('French')),
    ('ru', gettext('Russian')),
)
# default to accept-language header, per localeurl's settings
LOCALEURL_USE_ACCEPT_LANGUAGE = True

# don't url-localize requests

LOCALE_INDEPENDENT_PATHS = (
    re.compile('requests/'),
    re.compile('/accounts/login/$'),
    re.compile('/accounts/logout/$'),
    re.compile('/i18n/'),
)

#RTL_LANGUAGES = ('ar', 'he',)  # ('fa', 'fa-IR')
# Fallbacks for locales that are not recognized by Babel. Bug 596981.
BABEL_FALLBACK = {'fy-nl': 'nl'}

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = PROJECT_PATH+'/static/'

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/media/'

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media/admin/'

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'priU+iaciut#uV&aphlADo#zlep?i!rlethiu-wOuslapr2eSp'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    #'ffdemo.jinja.Loader',
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
#     'django.template.loaders.eggs.Loader',
)

MIDDLEWARE_CLASSES = (
    'localeurl.middleware.LocaleURLMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'axes.middleware.FailedLoginMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    #'django.middleware.locale.LocaleMiddleware',
    'ffdemo.middleware.SQLLogMiddleware',
    'ffdemo.middleware.SSLRedirect',
)

# ADMIN 
CONTRIBUTOR_TYPE_CHOICES = (
    ('c','contributor'),
    ('t','translator'),
)
LOGIN_REDIRECT_URL = "/#/moderate"

# AXES SEC. CONFIG
AXES_LOGIN_FAILURE_LIMIT = 5
AXES_LOCK_OUT_AT_FAILURE = True
AXES_COOLOFF_TIME = 2
AXES_LOCKOUT_URL = "/auth/locked/"

ROOT_URLCONF = 'ffdemo.urls'

TEMPLATE_DIRS = (
    PROJECT_PATH+'/templates_orig',
    PROJECT_PATH+'/templates_orig/sammy',
)

# JINJA_TEMPLATE_DIRS = (
#     PROJECT_PATH+'/templates',
# )

def JINJA_CONFIG():
    import jinja2
    config = {'extensions': ['jinja2.ext.loopcontrols',
                             'jinja2.ext.with_', 'caching.ext.cache'],
              'finalize': lambda x: x if x is not None else ''}
    return config


TEMPLATE_CONTEXT_PROCESSORS = (
    'django.core.context_processors.request',
    'django.core.context_processors.i18n',
    'django.contrib.auth.context_processors.auth',
)

SERIALIZATION_MODULES = {
    'yml': "django.core.serializers.pyyaml"
}

INSTALLED_APPS = (
    'localeurl',
    'ffdemo.markup',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'south',
    'axes',
)

FIXTURE_DIRS = (
    PROJECT_PATH+'/fixtures/',
)
SOUTH_TESTS_MIGRATE = False

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST =  settings_local.EMAIL_HOST
EMAIL_PORT = settings_local.EMAIL_PORT
EMAIL_HOST_USER = settings_local.EMAIL_HOST_USER
EMAIL_HOST_PASSWORD = settings_local.EMAIL_HOST_PASSWORD
EMAIL_USE_TLS = settings_local.EMAIL_USE_TLS
