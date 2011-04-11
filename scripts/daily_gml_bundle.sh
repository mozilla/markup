#!/bin/sh

# Gathers all GML files since yesterday (24 hours ago)
# zips them up and moves to a web accessable directory

# Configuration

# TMPDIR
# Used to stage files, needs write access
TMPDIR='/tmp'

# WEB_ACCESSABLE_PATH
# Directory where file is placed to be web accessable
WEB_ACCESSABLE_PATH='/var/www/markup'

# SERVER
# Server (and port) of running Markup instance
SERVER='localhost:8000'

# DON'T EDIT BELOW UNLESS YOU KNOW WHAT YOU'RE DOING
DATE=$( date +%d.%m.%Y )
IFS=$( echo -en "\n\b" )
DAILIES=$( curl -s http://$SERVER/requests/recent_marks | egrep -o 'reference": "\w*"' | grep -o '"\w*"' )

mkdir -p $TMPDIR/$DATE
rm -Rf $TMPDIR/$DATE/*

for daily in $DAILIES; do
  curl -s http://$SERVER/en/gml/${daily:1:4}/ > $TMPDIR/$DATE/${daily:1:4}.gml
done

cd $TMPDIR
tar zcvf $DATE.tgz $DATE
mv $DATE.tgz $WEB_ACCESSABLE_PATH
