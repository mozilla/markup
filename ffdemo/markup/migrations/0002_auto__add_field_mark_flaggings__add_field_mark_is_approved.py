# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Adding field 'Mark.flaggings'
        db.add_column('markup_mark', 'flaggings', self.gf('django.db.models.fields.IntegerField')(default=0), keep_default=False)

        # Adding field 'Mark.is_approved'
        db.add_column('markup_mark', 'is_approved', self.gf('django.db.models.fields.BooleanField')(default=False), keep_default=False)

    def backwards(self, orm):

        # Deleting field 'Mark.flaggings'
        db.delete_column('markup_mark', 'flaggings')

        # Deleting field 'Mark.is_approved'
        db.delete_column('markup_mark', 'is_approved')

    models = {
        'markup.mark': {
            'Meta': {'object_name': 'Mark'},
            'country_code': ('django.db.models.fields.CharField', [], {'max_length': '2', 'blank': 'True'}),
            'date_drawn': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'flaggings': ('django.db.models.fields.IntegerField', [], {'default': '0'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_approved': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'points_obj': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'points_obj_simplified': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'reference': ('django.db.models.fields.CharField', [], {'max_length': '50', 'blank': 'True'})
        }
    }

    complete_apps = ['markup']
