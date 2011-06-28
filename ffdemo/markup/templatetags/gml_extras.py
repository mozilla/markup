from django import template


register = template.Library()


@register.filter(name='normalize_point')
def normalize_point(value, arg):
    # Division by zero is evil, so we're not doing anything in that case.
    if not arg:
        return 0

    ret_val = float(value) / arg
    return str(round(ret_val, 2)).replace(',', '.')
