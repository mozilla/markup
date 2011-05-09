#!/bin/bash

CODE_DIR=markup
VENDOR_DIR=$CODE_DIR/ffdemo/vendor
LOCALE_DIR=$CODE_DIR/ffdemo/locale
PYTHON=python
QUIET=-q

echo -e Updating code...
cd $CODE_DIR
git fetch $QUIET
git merge origin/master $QUIET
git submodule update $QUIET
cd -

echo -e Updating vendor...
cd $VENDOR_DIR
git fetch $QUIET
git merge origin/master $QUIET
git submodule update $QUIET
cd -

echo -e Migrating database..
cd $CODE_DIR/ffdemo
$PYTHON ./manage.py migrate markup
cd -

echo -e Updating locale..
cd $LOCALE_DIR
svn up
cd -

echo -e Done
