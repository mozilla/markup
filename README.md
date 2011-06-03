Markup
===

Firefox Mark Up is a [Django][Django]-based web application...
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

Create a database and be sure to note the name then make a copy of ``settings_local.py.default`` called ``settings_local.py`` and update your database settings

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

Run the invite-generation script. ``generate_invites.py`` takes two vars: number of invites to generate, and type of invites to generate. invite-types are 't' for translator, or 'c' for contributor.

for 5 translator invites, run

     manage.py generate_invites 5 t

for 10 contributor invites, run

     manage.py generate_invites 10 c


### User management

The app uses Django's [user account management][django-users] commands:

    ./manage.py createsuperuser  # to create a new moderator
    ./manage.py changepassword bob  # to change bob's password
    # Deleting users is currently only possible through the database.


### Production

For production environments, uncomment the following in settings:

    # CACHE_BACKEND = 'caching.backends.memcached://localhost:11211?timeout=500'

    # SESSION_COOKIE_SECURE = True
    # SESSION_COOKIE_HTTPONLY = True


Also make sure your webserver serves SVG files with the right MIME type. In
Apache, do this:

     AddType image/svg+xml svg


## Javascript (Minification)

[Jim][Jim] is used for managing the JavaScript in Mozilla Mark Up. More information is available [here][Jim].
[Jim]: https://github.com/quirkey/jim


## L10n

The ``ffdemo/locale`` directory is kept in SVN. After checking out from git,
you want to separately check out that dir like this:

    cd ffdemo
    svn checkout http://svn.mozilla.org/projects/l10n-misc/trunk/markup/locale

Markup uses the [tower][tower] library for string extraction. To extract
strings from template files, run something like:

    ./manage.py extract
    ./manage.py verbatimize --rename
    ./manage.py merge

For more information, consult the tower docs.

To compile .po files into .mo, run:

    cd locale
    ./compile-mo.sh .

[tower]: https://github.com/clouserw/tower


# Licensing
This software is licensed under the [Mozilla Tri-License][MPL]:

    ***** BEGIN LICENSE BLOCK *****
    Version: MPL 1.1/GPL 2.0/LGPL 2.1

    The contents of this file are subject to the Mozilla Public License Version
    1.1 (the "License"); you may not use this file except in compliance with
    the License. You may obtain a copy of the License at
    http://www.mozilla.org/MPL/

    Software distributed under the License is distributed on an "AS IS" basis,
    WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
    for the specific language governing rights and limitations under the
    License.

    The Original Code is Mozilla Mark Up.

    The Initial Developer of the Original Code is Mozilla.
    Portions created by the Initial Developer are Copyright (C) 2011
    the Initial Developer. All Rights Reserved.

    Contributor(s):

    Alternatively, the contents of this file may be used under the terms of
    either the GNU General Public License Version 2 or later (the "GPL"), or
    the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
    in which case the provisions of the GPL or the LGPL are applicable instead
    of those above. If you wish to allow use of your version of this file only
    under the terms of either the GPL or the LGPL, and not to allow others to
    use your version of this file under the terms of the MPL, indicate your
    decision by deleting the provisions above and replace them with the notice
    and other provisions required by the GPL or the LGPL. If you do not delete
    the provisions above, a recipient may use your version of this file under
    the terms of any one of the MPL, the GPL or the LGPL.

    ***** END LICENSE BLOCK *****

[MPL]: http://www.mozilla.org/MPL/
