import os
import sys
 
path = '/var/www/staging/app'
if path not in sys.path:
	sys.path.insert(0, '/var/www/staging/app')
	sys.path.insert(0, '/var/www/staging/app/ffdemo')
 
os.environ['DJANGO_SETTINGS_MODULE'] = 'ffdemo.settings'
 
import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()