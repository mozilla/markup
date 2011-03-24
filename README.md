Markup
===

Firefox MarkUp is a [Django][Django]-based web application...
[Django]: http://www.djangoproject.com/

Getting Started
---
### Python
You need Python 2.6. Also, you probably want to run this application in a
[virtualenv][virtualenv] environment

[virtualenv]: http://pypi.python.org/pypi/virtualenv

### Dependencies

run

      easy_install pip

followed by

      ./bootsrap.sh



### Django

South is used for migrations, so to sync the db, run

      manage.py syncdb

and to run the migs

      manage.py migrate


Then run the invite-generation script. generate_invites.py takes two vars: number of invites to generate, and type of invites to generate. invite-types are 't' for translator, or 'c' for contributor.

for 5 translator invites, run
     manage.py generate_invites 5 t
for 10 contributor invites, run 
     manage.py generate_invites 10 c
     

For production environments, uncomment the following in settings:
    # CACHE_BACKEND = 'caching.backends.memcached://localhost:11211?timeout=500'

    # SESSION_COOKIE_SECURE = True
    # SESSION_COOKIE_HTTPONLY = True

and set 
    REDIRECT_TO_SSL = True

