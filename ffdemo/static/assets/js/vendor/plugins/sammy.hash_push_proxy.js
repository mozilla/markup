Sammy.HashPushProxy = function(app, run_interval_every) {
	this.app = app;
	// detect if we can use the history api
	this.supportsHistory = !!( window.history && history.pushState );
	if( !this.supportsHistory ) {
		// if history is not supported, start polling
		this._startPolling( run_interval_every );
		// and set this as a non native app?
		this.is_native = false;
	}
};

Sammy.HashPushProxy.prototype = {

	// bind the proxy events to the current app.
	bind: function() {
		var proxy = this, app = this.app;
		if( this.app.supportsHistory ) {
			$( window ).bind( 'popstate', function( e ) {
				proxy.app.trigger( 'location-changed' );
			} );
			$( 'a' ).live( 'click', function(e) {
				// Do not bind external links
				if ( location.hostname == this.hostname ) {
					e.preventDefault();
					// if the history API is supported
					if ( proxy.historyAPISupported ) {
						proxy.setLocation( $( this ).attr( 'href' ) );
						proxy.app.trigger( 'location-changed' );
					} else {
						proxy.setLocation( '#' + $( this ).attr( 'href' ) );
						proxy.app.trigger( 'location-changed' );
					}
					
				}
			} );
		} else {
			$( window ).bind( 'hashchange.' + this.app.eventNamespace(), function( e, non_native ) {
				// if we receive a native hash change event, set the proxy accordingly
				// and stop polling
				if ( proxy.is_native === false && !non_native ) {
					Sammy.log('native hash change exists, using');
					proxy.is_native = true;
					window.clearInterval(Sammy.HashLocationProxy._interval);
				}
				app.trigger('location-changed');
			});
			if (!Sammy.HashLocationProxy._bindings) {
				Sammy.HashLocationProxy._bindings = 0;
			}
			Sammy.HashLocationProxy._bindings++;
		}
	},

	// unbind the proxy events from the current app
	unbind: function() {
		if( this.app.supportsHistory ) {
			$('a').unbind('click');
			$(window).unbind('popstate');
		} else {
			$(window).unbind('hashchange.' + this.app.eventNamespace());
			Sammy.HashLocationProxy._bindings--;
			if (Sammy.HashLocationProxy._bindings <= 0) {
				window.clearInterval(Sammy.HashLocationProxy._interval);
			}
		}
	},

	// get the current location.
	getLocation: function() {
		if( this.app.supportsHistory ) {
			return window.location.pathname;
		} else {
			// Bypass the `window.location.hash` attribute.	If a question mark
			// appears in the hash IE6 will strip it and all of the following
			// characters from `window.location.hash`.
			var matches = window.location.toString().match(/^[^#]*(#.+)$/);
			return matches ? matches[1] : '';
		}
	},

	// set the current location to `new_location`
	setLocation: function( new_location ) {
		if( this.app.supportsHistory ) {
			history.pushState( { path: this.path }, '', new_location )
		} else {
			return (window.location = new_location);
		}
	},

	_startPolling: function(every) {
		// set up interval
		var proxy = this;
		if (!Sammy.HashLocationProxy._interval) {
			if (!every) { every = 10; }
			var hashCheck = function() {
				var current_location = proxy.getLocation();
				if (!Sammy.HashLocationProxy._last_location ||
					current_location != Sammy.HashLocationProxy._last_location) {
					window.setTimeout(function() {
						$(window).trigger('hashchange', [true]);
					}, 13);
				}
				Sammy.HashLocationProxy._last_location = current_location;
			};
			hashCheck();
			Sammy.HashLocationProxy._interval = window.setInterval(hashCheck, every);
		}
	}
};