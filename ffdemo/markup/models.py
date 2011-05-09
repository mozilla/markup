from django.db import models
from django.template.defaultfilters import slugify
import hashlib
import uuid
from datetime import datetime
from django.conf import settings
import os


class Mark(models.Model):
    id = models.BigIntegerField(primary_key=True)
    date_drawn = models.DateTimeField(auto_now_add=True, db_index=True)
    reference = models.CharField(max_length=50, blank=True, unique=True)
    points_obj = models.TextField(blank=True)
    points_obj_simplified = models.TextField(blank=True)
    country_code = models.CharField(max_length=2, blank=True)
    flaggings = models.IntegerField(default=0, db_index=True)
    is_approved = models.BooleanField(default=False)
    # contributor attrs
    contributor_locale = models.CharField(max_length=5, blank=True, null=True)
    contributor = models.CharField(max_length=75, blank=True, null=True)
    duplicate_check = models.BigIntegerField(default=0)
    ip_address = models.CharField(max_length=128, blank=True, null=True)

    def __unicode__(self):
        return unicode(self.date_drawn)


class Invitation(models.Model):
        id = models.BigIntegerField(primary_key=True)
        invite_code = models.SlugField(max_length=50, unique=True)
        contributor_type = models.CharField(max_length=1, choices=settings.CONTRIBUTOR_TYPE_CHOICES)
        used_at = models.DateTimeField(blank=True, null=True, db_index=True)

        def save(self):
                myuuid = uuid.uuid1().hex
                self.invite_code = os.urandom(6).encode('hex')
                super(Invitation, self).save()

        def __unicode__(self):
                return self.invite_code
