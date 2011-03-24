from django.db import models
from django.template.defaultfilters import slugify
import hashlib
import uuid
from datetime import datetime
from django.conf import settings

class Mark(models.Model):
	date_drawn = models.DateTimeField(auto_now_add=True)
	reference = models.CharField(max_length=50, blank=True, unique=True)
	points_obj = models.TextField(blank=True)
	points_obj_simplified = models.TextField(blank=True)
	country_code = models.CharField(max_length=2, blank=True)
        flaggings = models.IntegerField(default=0)
        is_approved = models.BooleanField(default=False)
        # contributor attrs
        contributor_locale = models.CharField(max_length=5, blank=True, null=True)
        contributor = models.CharField(max_length=75, blank=True, null=True)
	def __unicode__(self):
		return unicode(self.date_drawn)


class Invitation(models.Model):
        invite_code = models.SlugField(max_length=50)
        contributor_type = models.CharField(max_length=1, choices=settings.CONTRIBUTOR_TYPE_CHOICES)
        used_at = models.DateTimeField(blank=True, null=True)
        
        def save(self):
                myuuid = uuid.uuid1().hex
                self.invite_code = slugify( hashlib.md5(myuuid + datetime.now().strftime("%Y%m%d%H%m%s") ).hexdigest()[:12] )
                super( Invitation, self ).save()
        
        def __unicode__(self):
                return self.invite_code
