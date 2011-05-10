# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models

class Migration(SchemaMigration):
    
    def forwards(self, orm):
        
        # Changing field 'Invitation.id'
        db.alter_column('markup_invitation', 'id', self.gf('django.db.models.fields.AutoField')(primary_key=True))

        # Adding index on 'Mark', fields ['reference']
        db.create_index('markup_mark', ['reference'])

        # Changing field 'Mark.id'
        db.alter_column('markup_mark', 'id', self.gf('django.db.models.fields.AutoField')(primary_key=True))
    
    
    def backwards(self, orm):
        
        # Changing field 'Invitation.id'
        db.alter_column('markup_invitation', 'id', self.gf('django.db.models.fields.BigIntegerField')(primary_key=True))

        # Removing index on 'Mark', fields ['reference']
        db.delete_index('markup_mark', ['reference'])

        # Changing field 'Mark.id'
        db.alter_column('markup_mark', 'id', self.gf('django.db.models.fields.BigIntegerField')(primary_key=True))
    
    
    models = {
        'markup.invitation': {
            'Meta': {'object_name': 'Invitation'},
            'contributor_type': ('django.db.models.fields.CharField', [], {'max_length': '1'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'invite_code': ('django.db.models.fields.SlugField', [], {'unique': 'True', 'max_length': '50', 'db_index': 'True'}),
            'used_at': ('django.db.models.fields.DateTimeField', [], {'db_index': 'True', 'null': 'True', 'blank': 'True'})
        },
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
            'points_obj': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'points_obj_simplified': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'reference': ('django.db.models.fields.CharField', [], {'db_index': 'True', 'unique': 'True', 'max_length': '50', 'blank': 'True'})
        }
    }
    
    complete_apps = ['markup']
