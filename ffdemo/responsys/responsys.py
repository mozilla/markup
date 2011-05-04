from datetime import date
import urllib2

from django.utils.http import urlencode

LOG_FILENAME = 'wow.log'
try:
    from django.conf import settings
except ImportError:
    settings = {}

def make_source_url(request):
    return request.get_host() + request.get_full_path()

def subscribe(campaign, address, format='html', source_url='', lang='', country=''):
    """
    Subscribe a user to a list in responsys. There should be two
    fields within the Responsys system named by the "campaign"
    parameter: <campaign>_FLG and <campaign>_DATE
    """
    data = {
        'LANG_LOCALE': lang,
        'COUNTRY_': country,
        'SOURCE_URL': source_url,
        'EMAIL_ADDRESS_': address,
        'EMAIL_FORMAT_': 'H' if format == 'html' else 'T',
        }
    
    data['%s_FLG' % campaign] = 'Y'
    data['%s_DATE' % campaign] = date.today().strftime('%Y-%m-%d')

    # views.py asserts setting is availabvle
    data['_ri_'] = settings.RESPONSYS
    try:
        res = urllib2.urlopen('http://awesomeness.mozilla.org/pub/rf',
                              data=urlencode(data))
        return res.code == 200
    except urllib2.URLError, e:
        return False
