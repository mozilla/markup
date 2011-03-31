import os
import sys
from django.db import models
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from ffdemo.markup.models import Invitation


class Command(BaseCommand):
    args = '<num_invites invite_type>'

    def handle(self, *args, **options):
        if len(args) < 2:
            raise CommandError('Requires number of invites to generate and type of invite')
        num_invites = int(args[0])
        invite_type = args[1]
        valid_values = []
        for choice_id, choice_label in settings.CONTRIBUTOR_TYPE_CHOICES:
            valid_values += choice_id
        if invite_type not in valid_values:
            raise CommandError('Invite type must be in ', valid_values)
        else:
            print "generating ", num_invites, " ", invite_type, "invites"
            for i in range(num_invites):
                invite = Invitation(contributor_type=invite_type)
                invite.save()
            print "finished generating invites"
