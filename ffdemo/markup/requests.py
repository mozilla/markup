from django.http import (HttpResponse, HttpResponseBadRequest,
                         HttpResponseNotFound, HttpResponseServerError)
from ffdemo.markup.models import Mark
from ffdemo.markup import common
from django.utils import simplejson
from django.core import serializers
from django.views.decorators.http import require_GET, require_POST
from datetime import datetime, date, timedelta
from django.db.models import Q
from django.utils.translation import gettext as _
import random

def get_translated_marks(request):
    marks_to_be_dumped = None
    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': True}
    marks_to_be_dumped = Mark.objects.exclude(contributor_locale__isnull=True).order_by('id')
    if marks_to_be_dumped:
        all_marks = []
        for m in marks_to_be_dumped:
            # Append to all marks
            all_marks.append({'date_drawn': m.date_drawn.strftime("%a, %d %b %Y %I:%M:%S"),
            'reference': m.reference,
            'id': m.id,
            'points_obj_simplified': m.points_obj_simplified,
            'country_code': m.country_code,
            'is_approved': m.is_approved,
            'contributor_locale': m.contributor_locale})
        response['marks'] = all_marks

    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')

@require_POST
def flag_mark(request):
    response = {'success': False}
    if 'reference' in request.POST and len(request.POST['reference']) > 0:
        try:
            mark = Mark.objects.get(reference=request.POST['reference'])
            if mark.is_approved:
                pass
            else:
                mark.flaggings += 1
                mark.save()
                response['success'] = True
        except Mark.DoesNotExist:
            response['error'] = _("Mark does not exist")
        except Mark.MultipleObjectsReturned:
            # should never [ever] happen, purely CYA
            response['error'] = _("Multiple marks returned")
            json_response = simplejson.dumps(response)
            return HttpResponseServerError(json_response, 'application/json')
    else:
        response['error'] = _("No mark specified")
        json_response = simplejson.dumps(response)
        return HttpResponseServerError(json_response, 'application/json')

    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')


def init_viz_data(request):
    # grab the last mark
    # grab the first mark
    response = {}
    response['country_total_marks'] = ''
    response['country_first_mark'] = ''
    response['country_last_mark'] = ''
    response['country_first_mark_at'] = ''
    # for contributed marks
    response['contributor_marks'] = []
    contributor_marks = common.pack_mark_objects(Mark.objects.exclude(contributor__isnull=True).order_by('id'))
    response['contributor_marks'] = contributor_marks
    if 'country_code' in request.GET and len(request.GET['country_code']) > 0:
        country_marks = Mark.objects.exclude(flaggings__gte=1).filter(
            contributor_locale__isnull=True, country_code=request.GET['country_code']).order_by('id')
        if len(country_marks) > 0:
            response['country_total_marks'] = country_marks.count()
            response['country_first_mark'] = country_marks[0].reference
            response['country_last_mark'] = country_marks[response['country_total_marks'] - 1].reference
            response['country_first_mark_at'] = country_marks[0].date_drawn.strftime("%a, %d %b %Y %I:%M:%S")
        else:
            pass
    else:
        pass

    # Grab first and last mark
    all_marks = Mark.objects.exclude(flaggings__gte=1).filter(contributor_locale__isnull=True)
    last_mark = all_marks.order_by('-id')[0]
    first_mark = all_marks.order_by('id')[0]

    response['max_id'] = last_mark.id
    response['last_mark'] = last_mark.reference
    response['first_mark'] = first_mark.reference
    response['first_mark_at'] = first_mark.date_drawn.strftime("%a, %d %b %Y %I:%M:%S")
    response['total_countries'] = Mark.objects.values('country_code').distinct().count()
    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')

@require_POST
def save_mark(request):
    #    Default response
    response = {'success': False}

    #    Check for mandatory POST data
    if 'points_obj' in request.POST and 'points_obj_simplified' in request.POST:
    #    Cosntruct mark data
        mark_data = {'points_obj': request.POST['points_obj'], 'points_obj_simplified': request.POST['points_obj_simplified']}
        if 'country_code' in request.POST:
            mark_data['country_code'] = request.POST['country_code']
            if 'invite' in request.POST:
                mark_data['invite'] = request.POST['invite']
                if 'contributor_locale' in request.POST:
                    mark_data['contributor_locale'] = request.POST['contributor_locale']
            if 'contributor' in request.POST:
                mark_data['contributor'] = request.POST['contributor']

        try:
            #    Confirm that what we're getting is in fact JSON
            json = simplejson.loads(request.POST['points_obj'])
            json_simplified = simplejson.loads(request.POST['points_obj_simplified'])
            #    Validate JSON
            validate_json(json, json_simplified)
            #    Save new mark, handled by common.py
            new_mark_reference = common.save_new_mark_with_data(mark_data, request.META['REMOTE_ADDR'])
            #    Successful response, returning new mark reference
            response['mark_reference'] = new_mark_reference
        except ValueError:
            response['error'] = _('mark was too large. Please try drawing a smaller mark. Thanks!')
            return HttpResponseBadRequest(simplejson.dumps(response), 'application/json')
        except KeyError:
            response['error'] = _('invalid JSON in the POST request')
            return HttpResponseBadRequest(simplejson.dumps(response), 'application/json')
    else:
        #    Error response
        response['error'] = _('missing data in POST request')
        json_response = simplejson.dumps(response)
        return HttpResponseServerError(json_response, 'application/json')

    #    Return response as json
    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')


def validate_json(json, json_simplified):
    #    Confirms size below 30, 150k
    if len(json) > 250000 or len(json_simplified) > 50000:
        raise ValueError
    #    Confirms existence of stroke and chooses random stroke to confirm structure
    for j in [json, json_simplified]:
        ran = j['strokes'][0][random.randrange(0, len(j['strokes'][0]))]
        ran['angle']; ran['significance']; ran['time']; ran['y']; ran['x']; ran['z']; ran['speed']
        #    Checks x,y,z values to be within some maxium
        for stroke in j['strokes'][0]:
            if stroke['x'] > 2500 or stroke['y'] > 1600 or stroke['z'] != 0 or stroke['significance'] > 5:
                raise ValueError
            if stroke['x'] < 0 or stroke['y'] < 0 or stroke['significance'] < 0:
                raise ValueError

def delete_mark(request):
    #    Completely remove the mark
    response = {'success': False}
    if not request.user.is_authenticated():
        response['error'] = _('Authentication required')
        json_response = simplejson.dumps(response)
        return HttpResponseServerError(json_response, 'application/json')
    else:
        if 'reference' in request.POST and len(request.POST['reference']) > 0:
            try:
                m = Mark.objects.get(reference=request.POST['reference'])
                m.delete()
                response['success'] = True
            except Mark.DoesNotExist:
                response['error'] = _('Mark does not exist')
                json_response = simplejson.dumps(response)
                return HttpResponseServerError(json_response, 'application/json')
        else:
            response['error'] = _("No mark specified")
            json_response = simplejson.dumps(response)
            return HttpResponseServerError(json_response, 'application/json')

    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')

def delete_all_based_on_ip(request):
    #    Completely remove all marks based on IP
    response = {'success': False}
    if not request.user.is_authenticated():
        response['error'] = _('Authentication required')
        json_response = simplejson.dumps(response)
        return HttpResponseServerError(json_response, 'application/json')
    else:
        if 'ip' in request.POST and len(request.POST['ip']) > 0:
            try:
                Mark.objects.filter(ip_address=request.POST['ip']).delete()
                response['success'] = True
            except Mark.DoesNotExist:
                response['error'] = _('Marks from IP address do not exist')
                json_response = simplejson.dumps(response)
                return HttpResponseServerError(json_response, 'application/json')
        else:
            response['error'] = _("No IP address specified")
            json_response = simplejson.dumps(response)
            return HttpResponseServerError(json_response, 'application/json')

    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')

@require_POST
def approve_mark(request):
    #    Approve the mark // CHECK
    response = {'success': False}
    if not request.user.is_authenticated():
        response['error'] = _('Authentication required')
        json_response = simplejson.dumps(response)
        return HttpResponseServerError(json_response, 'application/json')
    else:
        if 'reference' in request.POST and len(request.POST['reference']) > 0:
            try:
                m = Mark.objects.get(reference=request.POST['reference'])
                should_approve = False
                if request.POST['should_approve'] == "true":
                    should_approve = True
                    m.is_approved = should_approve
                    m.save()
                    response['success'] = True
            except Mark.DoesNotExist:
                response['error'] = _('Mark does not exist')
                json_response = simplejson.dumps(response)
                return HttpResponseServerError(json_response, 'application/json')
        else:
            response['error'] = _("No mark specified")
            json_response = simplejson.dumps(response)
            return HttpResponseServerError(json_response, 'application/json')

    json_response = simplejson.dumps(response)
    return HttpResponse(json_response, 'application/json')


def get_mark(request):
    #    Get mark by ID
    mark = None
    try:
        mark = Mark.objects.get(reference=request.GET['mark_id'])
    except Mark.DoesNotExist:
        pass
    except Mark.MultipleObjectsReturned:
        pass
    previous_marks = ""
    next_marks = ""
    return HttpResponse(mark.points_obj_simplified, 'application/json')


def marks_by_offset(request):
    #       Parameters:
    #     offset:        Integer -
    #     max:           Integer - (defaults 15)
    #     country_code:      String  - filter by country-code
    #
    # returns json object including relevant marks with their attributes: id, reference string, points_obj, points_obj_simplified
    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': False}
    marks_to_be_dumped = None
    did_fail_get_marks = False
    max_returned = 50

    #    We've got an offset to play with
    if 'offset' in request.GET:
    #    An offset requires a max value to be returned from this offset
        if 'max' in request.GET:
            offset = request.GET['offset']
            max = request.GET['max']
            if max > max_returned:
                max = max_returned
            #    We can also filter by country code if need be
            if 'country_code' in request.GET:
                marks_to_be_dumped = Mark.objects.exclude.exclude(contributor_locale__isnull=False).filter(country_code=request.GET['country_code'])[offset:max]
            else:
                marks_to_be_dumped = Mark.objects.all()[offset:max]
        else:
           response['success'] = False
           response['error'] = _("Querying by offset also requires a 'max' POST var")
           did_fail_get_marks = True
    else:
        # No special query parameters, query for all marks
        marks_to_be_dumped = Mark.objects.exclude(contributor_locale__isnull=False)
    # Check that we've got marks to dump
    if not did_fail_get_marks:
        if marks_to_be_dumped:
            #    Dump out
            all_marks = []
            for m in marks_to_be_dumped:
                #    Append to all marks
                all_marks.append({'date_drawn': m.date_drawn.strftime(
                    "%a, %d %b %Y %I:%M:%S"),
                    'reference': m.reference,
                    'points_obj_simplified': m.points_obj_simplified,
                    'contributor': m.contributor, 'country_code': m.country_code})
            response['success'] = True
            response['marks'] = all_marks
    else:
        #    No marks to dump
        response['success'] = False
        response['error'] = _("No marks to be parsed")
        json_response = simplejson.dumps(response)
        return HttpResponseServerError(json_response, 'application/json')
    #    Dump and return
    json_response = simplejson.dumps(response, default=dthandler)
    return HttpResponse(json_response, 'application/json')


def marks_by_locale(request):
    #       Parameters:
    #     country_code:      String  - filter by country-code
    #     max:           Integer - (defaults 15)
    #
    # returns json object including relevant marks with their attributes: id, reference string, points_obj, points_obj_simplified
    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': False}

    max_returned = 15

    marks_to_be_dumped = None
    did_fail_get_marks = False


def marks_by_reference(request):
    #       Parameters:
    #     reference_mark:    String  - slug of reference mark
    #     include_back:      Integer - number of returned marks before the reference mark (defaults to 0)
    #     include_forward:   Integer - number of returned marks after the reference mark  (defaults to 15)
    #     include_mark:      Boolean - include the reference mark (defaults true)
    #     country_code:      String  - filter by country-code
    # returns json object including relevant marks with their attributes: id, reference string, points_obj, points_obj_simplified
    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': False}
    reference_mark = None
    include_back = 0
    include_forward = 15
    max_before_after = 20
    include_mark = True
    country_code = None
    marks_to_be_dumped = None
    did_fail_get_marks = False
    m_offset = None
    # default limit returns 19 marks
    m_limit = include_back + 1 + include_forward
    all_marks = None
    offset_index = 0
    total_marks = 0

    if 'reference' in request.GET:
        reference_mark = request.GET['reference']
        try:
            m_offset = Mark.objects.get(reference=reference_mark)
        except Mark.DoesNotExist:
            response['success'] = False
            response['error'] = _("Reference mark doesn't exist")
            did_fail_get_marks = True
        except Mark.MultipleObjectsReturned:
            response['success'] = False
            response['error'] = _("Multiple marks found for reference")
            did_fail_get_marks = True
        if 'include_mark' in request.GET:
            try:
                if int(request.GET['include_mark']) == 0:
                    include_mark = False
            except ValueError:
                return HttpResponseBadRequest()

        if 'include_forward' in request.GET:
            try:
                include_forward = int(request.GET['include_forward'])
                if include_forward > max_before_after:
                    include_forward = max_before_after
            except ValueError:
                return HttpResponseBadRequest()

        if 'include_back' in request.GET:
            try:
                include_back = int(request.GET['include_back'])
                if include_back > max_before_after:
                    include_back = max_before_after
            except ValueError:
                return HttpResponseBadRequest()

        if 'country_code' in request.GET:
            kountry_code = request.GET['country_code']
            all_marks = Mark.objects.exclude(flaggings__gte=1).filter(country_code=kountry_code, contributor_locale__isnull=True).order_by('id')
        else:
            all_marks = Mark.objects.exclude(flaggings__gte=1).filter(contributor_locale__isnull=True).order_by('id')

        # Find mark to start with backwards, if requested.
        if include_back and not did_fail_get_marks:
            # m_offset is our reference mark
            back_marks = list(all_marks.order_by('-id').filter(id__lt=m_offset.id)[:include_back])
            # These marks needed to be queried in reverse. Undo that now.
            back_marks.reverse()
        else:
            back_marks = []

        if not did_fail_get_marks:
            # Find last, forward mark
            forward_marks = list(all_marks.filter(id__gt=m_offset.id)[:include_forward])

            # Combine backwards and forward marks with reference.
            marks_to_be_dumped = back_marks + [m_offset] + forward_marks

        if not marks_to_be_dumped:
            response['success'] = False
            response['error'] = _("No marks to be dumped")
            did_fail_get_marks = True

    else:
        # required param
        response['success'] = False
        response['error'] = _("Querying by reference requires a reference string")
        did_fail_get_marks = True

    # Check that we've got marks to dump
    if not did_fail_get_marks:
        if marks_to_be_dumped:
            # Dump out
            all_marks = []

            for m in marks_to_be_dumped:
                    is_reference_mark = False
                    if m.reference == reference_mark:
                        is_reference_mark = True
                    if include_mark == False and is_reference_mark:
                        pass
                    else:
                        #    Append to all marks
                        all_marks.append({'is_reference_mark': is_reference_mark,
                            'date_drawn': m.date_drawn.strftime("%a, %d %b %Y %I:%M:%S"),
                            'reference': m.reference,
                            'id': m.id,
                            'points_obj_simplified': m.points_obj_simplified,
                            'contributor': m.contributor,
                            'country_code': m.country_code})
            response['success'] = True
            response['marks'] = all_marks
    else:
        #    No marks to dump
        response['success'] = False
        response['error'] = _("No marks to be parsed")
        json_response = simplejson.dumps(response)
        return HttpResponseNotFound(json_response, 'application/json')

    #    Dump and return
    json_response = simplejson.dumps(response, default=dthandler)
    return HttpResponse(json_response, 'application/json')


def all_marks(request):
    #    Get all marks, all data per mark excluding full points object
    #    This method can be queried via POST depending what the frontend requires
    #    Handler for dumping datetime field as JSON
    #
    #     offset:        Integer -
    #     max:           Integer - (defaults 15)
    #     country_code:  String  - filter by country-code
    #
    # returns json object including relevant marks with their attributes: id, reference string, points_obj, points_obj_simplified

    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': False}

    include_back = 3
    include_forward = 15
    include_mark = True
    max_returned = 50

    marks_to_be_dumped = None
    did_fail_get_marks = False

    #    We've got an offset to play with
    if 'offset' in request.GET:
        offset = request.GET['offset']
        # An offset must be a positive number
        if int(offset) < 0:
            response['success'] = False
            response['error'] = _("Offset must be greater than zero")
            return HttpResponseBadRequest(simplejson.dumps(response, default=dthandler))
        # An offset requires a max value to be returned from this offset
        if 'max' in request.GET:
            max = request.GET['max']
            if max > max_returned:
              max = max_returned
            # We can also filter by country code if need be
            if 'country_code' in request.GET:
                marks_to_be_dumped = Mark.objects.exclude(
                    flaggings__gte=1).filter(
                        contributor_locale__isnull=True).order_by(
                            'id').filter(country_code=request.GET['country_code'])[offset:max]
            else:
                marks_to_be_dumped = Mark.objects.exclude(
                    flaggings__gte=1).filter(
                        contributor_locale__isnull=True).order_by('id')[offset:max]
        else:
            response['success'] = False
            response['error'] = _("Querying by offset also requires a 'max' POST var")
            return HttpResponseBadRequest(simplejson.dumps(response, default=dthandler))
    else:
        did_fail_get_marks = True

    if not did_fail_get_marks:
        if marks_to_be_dumped:
            #    Dump out
            all_marks = []
            for m in marks_to_be_dumped:
                #    Append to all marks
                all_marks.append({'date_drawn': m.date_drawn.strftime("%a, %d %b %Y %I:%M:%S"), 'reference': m.reference, 'id': m.id, 'points_obj_simplified': m.points_obj_simplified, 'contributor': m.contributor, 'country_code': m.country_code, 'flaggings': m.flaggings})
            response['success'] = True
            response['marks'] = all_marks
        else:
            #    No marks to dump
            response['success'] = False
            response['error'] = _("No marks available")
    #    Dump and return
    json_response = simplejson.dumps(response, default=dthandler)
    return HttpResponse(json_response, 'application/json')

def recent_marks(request):
    #    Get all recent marks (previous day)
    #    This method can be queried via POST depending what the frontend requires
    #    Handler for dumping datetime field as JSON
    #
    # returns json object including relevant marks with their attributes: id, reference string, points_obj, points_obj_simplified

    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': False}

    include_back = 3
    include_forward = 15
    include_mark = True
    max_returned = 15

    marks_to_be_dumped = None
    did_fail_get_marks = False
    yesterday = date.today()-timedelta(days=1)
    marks_to_be_dumped = Mark.objects.filter(date_drawn__gte=yesterday)
    all_marks = []
    for m in marks_to_be_dumped:
        #    Append to all marks
        all_marks.append({'date_drawn': m.date_drawn.strftime("%a, %d %b %Y %I:%M:%S"), 'reference': m.reference, 'id': m.id, 'points_obj_simplified': m.points_obj_simplified, 'contributor': m.contributor, 'country_code': m.country_code, 'flaggings': m.flaggings})
    response['success'] = True
    response['marks'] = all_marks
    #    Dump and return
    json_response = simplejson.dumps(response, default=dthandler)
    return HttpResponse(json_response, 'application/json')

def marks_by_flagged(request):
    dthandler = lambda obj: obj.isoformat() if isinstance(obj, datetime) else None
    response = {'success': False}

    include_back = 3
    include_forward = 15
    include_mark = True
    max_returned = 15

    marks_to_be_dumped = Mark.objects.filter(flaggings__gte=1).exclude(is_approved=1).order_by('id')  # CHECK offset?

    #    Check that we've got marks to dump
    if marks_to_be_dumped:
        #    Dump out
        all_marks = []
        for m in marks_to_be_dumped:
            #    Append to all marks
            all_marks.append({'date_drawn': m.date_drawn, 'reference': m.reference, 'id': m.id, 'points_obj_simplified': m.points_obj_simplified, 'contributor': m.contributor, 'country_code': m.country_code, 'is_approved': m.is_approved, 'ip_address': m.ip_address})
        response['success'] = True
        response['marks'] = all_marks
    else:
        #    No marks to dump
        response['success'] = False
        response['error'] = _("No marks to be parsed")
    #    Dump and return
    json_response = simplejson.dumps(response, default=dthandler)
    return HttpResponse(json_response, 'application/json')


def update_language(request):
    response = {}
    if 'language_code' in request.GET:
        set_language(request)
    else:
        pass
    return response
