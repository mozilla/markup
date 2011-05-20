from datetime import datetime
from hashlib import md5
import re

from django.db import transaction

from ffdemo.markup.models import Mark
from ffdemo.markup.models import Invitation
from ffdemo.utils import short_url
from django.conf import settings


def get_invite_from_code(c):
        invite = None
        try:
                invite = Invitation.objects.get(invite_code=c)
        except Invitation.DoesNotExist:
                return None
        return invite


def get_translated_marks():
        return


def pack_mark_objects(data):
    """convenience method to unpack marks for request return"""
    if data:
        all_marks = []
        for m in data:
            # Append to all marks
            all_marks.append(
                {'date_drawn': m.date_drawn.strftime("%a, %d %b %Y %I:%M:%S"),
                 'reference': m.reference,
                 'id': m.id,
                 'points_obj_simplified': m.points_obj_simplified,
                 'country_code': m.country_code,
                 'contributor': m.contributor,
                 'is_approved': m.is_approved})
        return all_marks
    return


@transaction.commit_on_success
def save_new_mark_with_data(data, ip_address):
    # Remove whitespace from raw full points obj
    stripped_points_obj_full = re.sub(r'\s', '', data['points_obj'])
    # remove whitespace where not in extra_info (the contributor quote)
    j = re.compile('^.*\"extra\_info"\:\"')
    k = re.compile('\"extra\_info"\:\".*\"\,*.*$')
    sec1 = j.search(data['points_obj_simplified'])
    sec2 = k.search(data['points_obj_simplified'])
    if sec1 and sec2:
        stripped_sec1 = re.sub(r'\s', '', sec1.group())
        stripped_sec2 = re.sub('"extra_info":"', '', sec2.group())
        stripped_points_obj_simplified = stripped_sec1 + stripped_sec2
    else:
        stripped_points_obj_simplified = re.sub(r'\s',
            '',
            data['points_obj_simplified'])

    # Ensure duplicates aren't being introduced
    existing_mark = Mark.objects.filter(duplicate_check=hash(stripped_points_obj_full))
    if existing_mark:
        return existing_mark[0].reference

    # New mark
    new_mark = Mark.objects.create()
    reference = short_url.encode_url(new_mark.id)
    new_mark.duplicate_check = hash(stripped_points_obj_full)
    new_mark.ip_address = ip_address
    new_mark.points_obj_simplified = stripped_points_obj_simplified
    new_mark.reference = reference
    # Store full raw data on drive
    if settings.ENABLE_RAW_MARKS:
        with open(settings.RAW_MARKS_DIR + '/' + reference + '.json' , 'w') as f:
            f.write(stripped_points_obj_full)

    invite = None
    if 'country_code' in data:
        new_mark.country_code = data['country_code']
        if 'invite' in data:
            invite = get_invite_from_code(data['invite'])
            if invite and 'contributor_locale' in data and len(data['contributor_locale']) > 0:
                new_mark.contributor_locale = data['contributor_locale']
            else:
                pass
            if invite and 'contributor' in data and len(data['contributor']) > 0:
                new_mark.contributor = data['contributor']
            else:
                pass
        else:
            pass

    new_mark.save()
    if invite:
        invite.used_at = datetime.now()
        invite.save()
    return new_mark.reference
