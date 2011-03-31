from fabric.api import *
import os
#from os import path
from fabric.contrib.project import rsync_project
from fabric.operations import sudo
from fabric.contrib import files, console
from fabric import utils
from fabric.decorators import hosts

RSYNC_EXCLUDE = (
    '.DS_Store',
    '.git',
    '*.pyc',
    '*.example',
    '*.default',
    '*.db',
    'settings_local.py',
    'fabfile.py',
    'bootstrap.py',
)

env.home = '/var/www/staging/app'
env.project = 'ffdemo'
env.django_env = 'ffenv'
env.port = "10222"


def _setup_path():
    env.root = os.path.join(env.home)
    env.code_root = os.path.join(env.root, env.project)
    env.virtualenv_root = os.path.join(env.root)
    env.settings = '%(project)s.settings_%(environment)s' % env


def staging():
    """ use staging environment on remote host"""
    env.user = 'deployer'
    env.environment = 'staging'
    env.hosts = ['209.20.77.205:10222']
    env.port = '10222'
    _setup_path()


def deploy():
    """ rsync code to remote host """
    require('root', provided_by=('staging'))
    # defaults rsync options:
    # -pthrvz
    # -p preserve permissions
    # -t preserve times
    # -h output numbers in a human-readable format
    # -r recurse into directories
    # -v increase verbosity
    # -z compress file data during the transfer

    extra_opts = '--omit-dir-times'
    rsync_project(
        env.root,
        exclude=RSYNC_EXCLUDE,
        delete=True,
        extra_opts=extra_opts,
    )
    #touch()
    # run_migrations()
    apache_restart()


def touch():
    """ touch wsgi file to trigger reload """
    require('code_root', provided_by=('staging'))
    apache_dir = os.path.join(env.code_root, 'apache')
    with cd(apache_dir):
        run('touch %s.wsgi' % env.environment)


def run_migrations():
    with run('cd /var/www/staging/app/ffdemo'):
        run('python manage.py migrate markup')


def deploy_git():
    with run('cd /var/www/staging/app'):
        run('git pull')
    apache_reload()


def apache_reload():
    """ reload Apache on remote host """
    require('root', provided_by=('staging'))
    sudo('/etc/init.d/apache2 reload')


def apache_restart():
    """ restart Apache on remote host """
    require('root', provided_by=('staging'))
    sudo('/etc/init.d/apache2 restart')
