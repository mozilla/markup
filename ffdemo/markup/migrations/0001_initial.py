# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Adding model 'Mark'
        db.create_table('markup_mark', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('date_drawn', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
            ('reference', self.gf('django.db.models.fields.CharField')(max_length=50, blank=True)),
            ('points_obj', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('points_obj_simplified', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('country_code', self.gf('django.db.models.fields.CharField')(max_length=2, blank=True)),
        ))
        db.send_create_signal('markup', ['Mark'])

    def backwards(self, orm):

        # Deleting model 'Mark'
        db.delete_table('markup_mark')

    models = {
        'markup.mark': {
            'Meta': {'object_name': 'Mark'},
            'country_code': ('django.db.models.fields.CharField', [], {'max_length': '2', 'blank': 'True'}),
            'date_drawn': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'points_obj': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'points_obj_simplified': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'reference': ('django.db.models.fields.CharField', [], {'max_length': '50', 'blank': 'True'})
        }
    }

    complete_apps = ['markup']
