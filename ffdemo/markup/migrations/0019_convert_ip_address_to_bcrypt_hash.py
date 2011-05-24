# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models
from ffdemo.markup.models import Mark
import bcrypt
from django.conf import settings

class Migration(SchemaMigration):

    no_dry_run = True

    def forwards(self, orm):
        hash_cache = {}  # Cache results, for this migration only.

        for mark in Mark.objects.all():
            print "converting IP to bcrypt hash: " + mark.ip_address
            raw = mark.ip_address
            try:
                if raw in hash_cache:
                    mark.ip_address = hash_cache[raw]
                else:
                    hashed_ip = bcrypt.hashpw(raw, settings.IP_HASH_SALT)
                    hash_cache[raw] = hashed_ip
                    mark.ip_address = hashed_ip
                mark.save()
            except:
                print "Ignoring bad data for: " + mark.ip_address


    def backwards(self, orm):
        raise RuntimeError("Cannot reverse this migration.")


    complete_apps = ['markup']
