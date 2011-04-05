import os
import re
import logging

from django.utils.functional import lazy

logging.basicConfig()

# Django settings for ff4 project.
PROJECT_DIR = PROJECT_PATH = ROOT = os.path.dirname(os.path.abspath(__file__))
ROOT_PACKAGE = os.path.basename(ROOT)
path = lambda *a: os.path.join(ROOT, *a)

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

DATABASES = { }
DATABASE_ROUTERS = ('multidb.MasterSlaveRouter',)


## Internationalization.
TIME_ZONE = 'America/Los_Angeles'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Gettext text domain
TEXT_DOMAIN = 'messages'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-US'

# Accepted locales
LANGUAGES = (
    ('de', 'German'),
    ('en', 'English'),
    ('fr', 'French'),
    ('ru', 'Russian'),
)

# Where to store product details etc.
PROD_DETAILS_DIR = path('lib/product_details_json')

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
MEDIA_ROOT = PROJECT_PATH + '/static/'

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
)

# ADMIN
CONTRIBUTOR_TYPE_CHOICES = (
    ('c', 'contributor'),
    ('t', 'translator'),
)
LOGIN_REDIRECT_URL = "/#/moderate"

# AXES SEC. CONFIG
AXES_LOGIN_FAILURE_LIMIT = 5
AXES_LOCK_OUT_AT_FAILURE = True
AXES_COOLOFF_TIME = 2
AXES_LOCKOUT_URL = "/auth/locked/"

ROOT_URLCONF = 'ffdemo.urls'

TEMPLATE_DIRS = (
    PROJECT_PATH + '/templates_orig',
    PROJECT_PATH + '/templates_orig/sammy',
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
    'product_details',
)

FIXTURE_DIRS = (
    PROJECT_PATH + '/fixtures/',
)
SOUTH_TESTS_MIGRATE = False
