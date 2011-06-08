def enable_raw_marks(request):
    from django.conf import settings
    return {'ENABLE_RAW_MARKS': settings.ENABLE_RAW_MARKS}
