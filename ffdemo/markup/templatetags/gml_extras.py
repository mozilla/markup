from django import template


register = template.Library()


@register.filter(name='normalize_point')
def normalize_point(value, arg):
    ret_val = float(value) / arg
    return str(round(ret_val, 2)).replace(',', '.')
