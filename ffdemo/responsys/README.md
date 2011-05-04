This code was liberated from jlongster's fine zamboni fork.

--------------------------------------------------
This README is an intermediate step... this should
all be pulled out of apps/responsys into it's own
git repo.
---------------------------------------------------

This small library provides:

* A library for subscribing email addresses to our contact list
* A form template for collecting info
* A view for processing form submissions

Requirements:
* Jinja

= Usage =

== views.subscribe ==
A GET request will render a basic HTML document fragment
which is the form needed to subscribe to a mailing list. Most applicatins
will probably not use this method. You're probably going to want ot override the templates and manage your strings... 

A POST request will process the form data...

== responsys.subscribe ==
The subscribe method takes several required and optional parameters:

* campaign - Example: 'MDN_DEMO_ROOM_LAUNCH', 'ABOUT_ADDONS', etc.
* address - Email address
* format - (optional) preferred format can be html or text
* source_url - (optional) Your url which is generating these subscriptions
* lang - (optional) Language code
* country - (optional) Country code

The campaign value should match the prefix for Responsys properties example: 'ABOUT_ADDONS_FLG', 'ABOUT_ADDONS_DATE', 

Method returns a boolean based on Responsys's output.