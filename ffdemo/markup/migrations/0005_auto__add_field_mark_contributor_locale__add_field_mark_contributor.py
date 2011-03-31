# encoding: utf-8
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Adding field 'Mark.contributor_locale'
        db.add_column('markup_mark',
            'contributor_locale',
            self.gf('django.db.models.fields.CharField')(max_length=4, null=True, blank=True), keep_default=False)

        # Adding field 'Mark.contributor'
        db.add_column('markup_mark',
            'contributor',
            self.gf('django.db.models.fields.CharField')(max_length=10, null=True, blank=True), keep_default=False)

    def backwards(self, orm):

        # Deleting field 'Mark.contributor_locale'
        db.delete_column('markup_mark', 'contributor_locale')

        # Deleting field 'Mark.contributor'
        db.delete_column('markup_mark', 'contributor')

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
            'contributor': ('django.db.models.fields.CharField', [], {'max_length': '10', 'null': 'True', 'blank': 'True'}),
            'contributor_locale': ('django.db.models.fields.CharField', [], {'max_length': '4', 'null': 'True', 'blank': 'True'}),
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
