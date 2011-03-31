Markup
===

Firefox MarkUp is a [Django][Django]-based web application...
[Django]: http://www.djangoproject.com/

Getting Started
---

### Setup

You need Python 2.6. Also, you probably want to run this application in a
[virtualenv][virtualenv] environment
[virtualenv]: http://pypi.python.org/pypi/virtualenv

To install virtualenv (if you don't have it already):
	
    easy_install virtualenv

And pip (package manager):

    easy_install pip

Start and activate the virtualenv:

    virtualenv --distribute --no-site-packages ./ffenv
    source ./ffenv/bin/activate

Prepare you development environment:

    pip install -r requirements/dev.txt -r requirements/compiled.txt

Create a database and be sure to note the name then make a copy of settings_local.py.default called settings_local.py and update your database settings

Sync your db:
    
    python ffdemo/manage.py syncdb
	
Run the migrations
	
    python ffdemo/manage.py migrate
	
Start your dev server:
    python ffdemo/manage.py runserver

	
### Things to know

Any time you open a new terminal window to work on this project, before to run:
    source ffenv/bin/activate
	
This sets up the virtual environment that has all the right versions of everything for the app

We're using the Jinja2 templating engine rather than Django's default. You can use them fairly interchangeably, the tempalte loader will look for both, however Jinja2 templates live in the ffdemo/templates directory and Django original templates live in ffdemo/templates_orig

We're using South for migrations on any django apps in the project. Learn more! http://south.aeracode.org/


### Database Migrations

South is used for migrations, so to sync the db, run

    manage.py syncdb

and to run the migrations.

    manage.py migrate

More info about South:

	- See if you can import south and yaml using ./manage.py shell
	- If you can't, install both independently:
		- easy_install South
		- easy_install http://pyyaml.org/download/pyyaml/PyYAML-3.08.tar.gz

		Setting up with a new database:	
			- After you create the database, validate and sync up the models as per above, then:
				- ./manage.py schemamigration markup --initial
				- ./manage.py migrate markup
			- Thereafter:
				- ./manage.py schemamigration markup --auto
				- ./manage.py migrate markup

		Setting up from an existing database:
			- ./manage.py syncdb
			- ./manage.py convert_to_south markup

		If at any point you need to blow this out and start over, remember to remove the migrations dir from the app root


### Generate Invites

Run the invite-generation script. generate_invites.py takes two vars: number of invites to generate, and type of invites to generate. invite-types are 't' for translator, or 'c' for contributor.

for 5 translator invites, run
     manage.py generate_invites 5 t
for 10 contributor invites, run 
     manage.py generate_invites 10 c
     

### Production 

For production environments, uncomment the following in settings:
    # CACHE_BACKEND = 'caching.backends.memcached://localhost:11211?timeout=500'

    # SESSION_COOKIE_SECURE = True
    # SESSION_COOKIE_HTTPONLY = True

and set 
    REDIRECT_TO_SSL = True


## Javascript

[Jim][Jim] is used for managing the javascript in Mozilla MarkUp. More information is available [here][Jim].
[Jim]: https://github.com/quirkey/jim