# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models
from ffdemo.markup.models import Mark
from django.conf import settings

class Migration(SchemaMigration):

    no_dry_run = True

    def forwards(self, orm):

        # Decode all marks and put back in place
        for mark in Mark.objects.all():
            print "Decoding JSON for: " + mark.reference
            encoded = mark.points_obj_simplified
            try:
                mark.points_obj_simplified = encoded.decode('base64', 'strict')
                mark.save()
            except:
                print "Ignoring bad data for: " + mark.reference

    def backwards(self, orm):

        # Encode all marks and put back in place
        for mark in Mark.objects.all():
            print "Encoding JSON for: " + mark.reference
            raw = mark.points_obj_simplified
            mark.points_obj_simplified = raw.encode('base64', 'strict')
            mark.save()


    models = {
        'markup.mark': {
            'Meta': {'object_name': 'Mark'},
            'contributor': ('django.db.models.fields.CharField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'contributor_locale': ('django.db.models.fields.CharField', [], {'max_length': '5', 'null': 'True', 'blank': 'True'}),
            'country_code': ('django.db.models.fields.CharField', [], {'max_length': '2', 'blank': 'True'}),
            'date_drawn': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'db_index': 'True', 'blank': 'True'}),
            'duplicate_check': ('django.db.models.fields.BigIntegerField', [], {'default': '0'}),
            'flaggings': ('django.db.models.fields.IntegerField', [], {'default': '0', 'db_index': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'ip_address': ('django.db.models.fields.CharField', [], {'max_length': '128', 'null': 'True', 'blank': 'True'}),
            'is_approved': ('django.db.models.fields.BooleanField', [], {'default': 'False', 'blank': 'True'}),
            'points_obj_simplified': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'reference': ('django.db.models.fields.CharField', [], {'db_index': 'True', 'unique': 'True', 'max_length': '50', 'blank': 'True'})
        }
    }

    complete_apps = ['markup']
