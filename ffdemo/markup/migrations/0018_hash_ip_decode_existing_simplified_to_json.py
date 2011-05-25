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
            try:
                print "Decoding JSON for: " + mark.reference
                encoded = mark.points_obj_simplified
                mark.points_obj_simplified = encoded.decode('base64', 'strict')
                print "converting IP to bcrypt hash: " + mark.ip_address
                raw = mark.ip_address
                if raw in hash_cache:
                    mark.ip_address = hash_cache[raw]
                else:
                    hashed_ip = bcrypt.hashpw(raw, settings.IP_HASH_SALT)
                    hash_cache[raw] = hashed_ip
                    mark.ip_address = hashed_ip
                mark.save()
            except Exception as e:
                print "Ignoring bad data for: " + mark.reference
                print type(e)
                print e.args
                print e


    def backwards(self, orm):

        # Encode all marks and put back in place
        for mark in Mark.objects.all():
            print "Encoding JSON for: " + mark.reference
            raw = mark.points_obj_simplified
            mark.points_obj_simplified = raw.encode('base64', 'strict')
            mark.save()

        # Not able to roll back the ip_address hash

    complete_apps = ['markup']
