from datetime import datetime
from hashlib import md5
import re

from django.db import transaction

from ffdemo.markup.models import Mark
from ffdemo.markup.models import Invitation
from ffdemo.utils import short_url


def get_invite_from_code(c):
        invite = None
        try:
                invite = Invitation.objects.get(invite_code=c)
        except Invitation.DoesNotExist:
                return None
        return invite


def get_translated_marks():
        return


def decode_mark_objects(data):
    """convenience method to unpack marks for request return"""
    if data:
        all_marks = []
        for m in data:
            # We need to decode the points obj simplified
            decoded_points_obj = decode_points_obj(m.points_obj_simplified)
            # Append to all marks
            all_marks.append(
                {'date_drawn': m.date_drawn.strftime("%a, %d %b %Y %I:%M:%S"),
                 'reference': m.reference,
                 'id': m.id,
                 'points_obj_simplified': decoded_points_obj,
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
    # Encode both
    encoded_points_obj_full = stripped_points_obj_full.encode('base64', 'strict')
    encoded_points_obj_simplified = stripped_points_obj_simplified.encode('base64', 'strict')

    # Ensure duplicates aren't being introduced
    existing_mark = Mark.objects.filter(duplicate_check=hash(stripped_points_obj_full))
    if existing_mark:
        return existing_mark[0].reference

    # New mark
    new_mark = Mark.objects.create()
    new_mark.duplicate_check = hash(stripped_points_obj_full)
    new_mark.ip_address = ip_address
    new_mark.points_obj = encoded_points_obj_full
    new_mark.points_obj_simplified = encoded_points_obj_simplified
    new_mark.reference = short_url.encode_url(new_mark.id)
    if 'country_code' in data:
        new_mark.country_code = data['country_code']
        invite = None
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


def decode_points_obj(obj):
    returned_str = str(obj)
    decoded_data = returned_str.decode('base64', 'strict')
    return decoded_data
