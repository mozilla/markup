#!/usr/bin/env python
import os
import site
import sys
from django.core.management import execute_manager

ROOT = os.path.dirname(os.path.abspath(__file__))
path = lambda *a: os.path.join(ROOT, *a)

# Adjust the python path and put local packages in front.
prev_sys_path = list(sys.path)

site.addsitedir(path('apps'))
site.addsitedir(path('lib'))

# Local (project) vendor library
site.addsitedir(path('vendor-local'))
site.addsitedir(path('vendor-local/lib/python'))

# Global (upstream) vendor library
site.addsitedir(path('vendor'))
site.addsitedir(path('vendor/lib/python'))


# Move the new items to the front of sys.path. (via virtualenv)
new_sys_path = []
for item in list(sys.path):
    if item not in prev_sys_path:
        new_sys_path.append(item)
        sys.path.remove(item)
        sys.path[:0] = new_sys_path

from django.core.management import execute_manager, setup_environ

try:
    import settings  # Assumed to be in the same directory.
except ImportError:
    import sys
    error_message = "Error: Can't find the file 'settings.py' in\
                     the directory containing %r. It appears\
                     you've customized things.\nYou'll have to\
                     run django-admin.py, passing it your settings\
                     module.\n(If the file settings.py does indeed\
                     exist, it's causing an ImportError somehow.)\n"
    sys.stderr.write(error_message % __file__)
    sys.exit(1)

if __name__ == "__main__":
    execute_manager(settings)
