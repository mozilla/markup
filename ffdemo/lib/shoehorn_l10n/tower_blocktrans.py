"""Teach tower L10n library to hopefully extract from django templates."""
from StringIO import StringIO

from tower.management.commands.extract import (extract_tower_template,
                                               tweak_message)
from lib.shoehorn_l10n.templatize import templatize


def extract_django_template(fileobj, keywords, comment_tags, options):
    src = fileobj.read()
    templatized = StringIO(templatize(src))
    return extract_tower_template(templatized, keywords, comment_tags, options)
