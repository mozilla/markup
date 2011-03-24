#/bin/bash
virtualenv --distribute --no-site-packages ./ffenv
source ./ffenv/bin/activate
pip install django==1.2.3
pip install south==0.7.2
pip install PIL
pip install pyyaml
easy_install http://pypi.python.org/packages/source/M/MySQL-python/MySQL-python-1.2.3.tar.gz
