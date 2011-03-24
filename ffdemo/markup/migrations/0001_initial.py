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
            ('reference', self.gf('django.db.models.fields.CharField')(max_length=50, blank=True, unique=True)),
            ('points_obj', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('points_obj_simplified', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('country_code', self.gf('django.db.models.fields.CharField')(max_length=2, blank=True)),
            ('contributor_locale', self.gf('django.db.models.fields.CharField')(max_length=5, null=True, blank=True)),
            ('contributor', self.gf('django.db.models.fields.CharField')(max_length=75, null=True, blank=True)),
            ('flaggings', self.gf('django.db.models.fields.IntegerField')(default=0)),
            ('is_approved', self.gf('django.db.models.fields.BooleanField')(default=False))
        ))
        db.send_create_signal('markup', ['Mark'])
        
        # Adding model 'Invitation'
        db.create_table('markup_invitation', (
            ('id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('invite_code', self.gf('django.db.models.fields.SlugField')(db_index=True, max_length=50, blank=True)),
            ('contributor_type', self.gf('django.db.models.fields.CharField')(max_length=1)),
            ('used_at', self.gf('django.db.models.fields.DateTimeField')(blank=True))
        ))
        db.send_create_signal('markup', ['Invitation'])

    def backwards(self, orm):
        
        # Deleting model 'Mark'
        db.delete_table('markup_mark')
        # Deleting model 'Invitation'
        db.delete_table('markup_invitation')

    models = {
        'markup.invitation': {
            'Meta': {'object_name': 'Invitation'},
            'contributor_type': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'invite_code': ('django.db.models.fields.SlugField', [], {'max_length': '50', 'db_index': 'True'}),
            'used_at': ('django.db.models.fields.DateTimeField', [], {'null': 'True', 'blank': 'True'})
        },
        'markup.mark': {
            'Meta': {'object_name': 'Mark'},
            'contributor': ('django.db.models.fields.CharField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'contributor_locale': ('django.db.models.fields.CharField', [], {'max_length': '5', 'null': 'True', 'blank': 'True'}),
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
