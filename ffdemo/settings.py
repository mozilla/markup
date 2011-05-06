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

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS
CACHES = { }
DATABASES = { }
DATABASE_ROUTERS = ('multidb.MasterSlaveRouter',)

SITE_ID = 1

## Internationalization.
TIME_ZONE = 'America/Los_Angeles'

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# Paths that don't require a locale prefix.
SUPPORTED_NONLOCALES = ('media', 'admin', 'requests', 'accounts')

# Gettext text domain
TEXT_DOMAIN = 'django'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-US'
KNOWN_LANGUAGES = ('en-US', 'ar', 'ca', 'cs', 'de', 'el', 'es', 'eu', 'fr', 'ga', 'he', 'hu', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'rm', 'ru', 'si', 'sl', 'sq', 'th', 'tr', 'zh-CN', 'zh-TW')

# List of RTL locales known to this project. Subset of LANGUAGES.
RTL_LANGUAGES = ('ar',)  # ('ar', 'fa', 'fa-IR', 'he')

LANGUAGE_URL_MAP = dict([(i.lower(), i) for i in KNOWN_LANGUAGES])

# Override Django's built-in with our native names
class LazyLangs(dict):
    def __new__(self):
        from product_details import product_details
        return dict([(lang.lower(), product_details.languages[lang]['native'])
                     for lang in KNOWN_LANGUAGES])

LANGUAGES = lazy(LazyLangs, dict)()

# Where to store product details etc.
PROD_DETAILS_DIR = path('lib/product_details_json')

# default to accept-language header, per localeurl's settings
LOCALEURL_USE_ACCEPT_LANGUAGE = True

# Tells the extract script what files to look for l10n in and what function
# handles the extraction. The Tower library expects this.
DOMAIN_METHODS = {
    # We usually use "messages" as text domain. "django" is required by Django L10n.
    'django': [
        # Normally, apps would be in apps/ and templates in templates/.
        # Not so here.
        ('markup/**.py',
            'tower.management.commands.extract.extract_tower_python'),
        ('templates_orig/**.html',
            'lib.shoehorn_l10n.tower_blocktrans.extract_django_template'),
    ],
}
TOWER_KEYWORDS = {
    #'_lazy': None,
}
# The POT headers take care of the encoding.
TOWER_ADD_HEADERS = True

# Fake Jinja2 config for tower. Don't ask. (If you must, bug 647352).
def JINJA_CONFIG():
    return {'extensions': []}

# tower-ize django's blocktrans
import lib.shoehorn_l10n.templatetag
lib.shoehorn_l10n.templatetag.monkeypatch()


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
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

MIDDLEWARE_CLASSES = (
    'commons.middleware.LocaleURLMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.csrf.CsrfResponseMiddleware',
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

def JINJA_CONFIG():
    import jinja2
    from django.conf import settings
#    from caching.base import cache
    config = {'extensions': ['tower.template.i18n', 'jinja2.ext.do',
                             'jinja2.ext.with_', 'jinja2.ext.loopcontrols'],
              'finalize': lambda x: x if x is not None else ''}
#    if 'memcached' in cache.scheme and not settings.DEBUG:
        # We're passing the _cache object directly to jinja because
        # Django can't store binary directly; it enforces unicode on it.
        # Details: http://jinja.pocoo.org/2/documentation/api#bytecode-cache
        # and in the errors you get when you try it the other way.
#        bc = jinja2.MemcachedBytecodeCache(cache._cache,
#                                           "%sj2:" % settings.CACHE_PREFIX)
#        config['cache_size'] = -1 # Never clear the cache
#        config['bytecode_cache'] = bc
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

    'tower',  # for ./manage.py extract (L10n)

    'ffdemo.markup',
    'ffdemo.responsys',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'south',
    'tower',
    'axes',
    'product_details',
    'commonware.response.cookies',
)

FIXTURE_DIRS = (
    PROJECT_PATH + '/fixtures/',
)
SOUTH_TESTS_MIGRATE = False

# Newsletter Foo
RESPONSYS_CAMPAIGN = 'MOZILLA_AND_YOU'
