( function( $ ) {
	var app = $.sammy( '#sammy', function() {
		// ROUTES
		this.get( '#/', function( context ) {
			// making our mark
			// load the template
			this.partial( 'makemark_sammy.html' )
				.then( function() {
					// unload the visualization if it's loaded
					$( '#markapp' ).markApp( 'unloadModule', 'linear' );
					// init the intro
					// init the capture interface, specifying that we're playing the intro first, and it should be ready to go when it's done
					$( '#markapp' ).markApp( 'addModule', { 'capture': { 'state': 'intro' } } );
					$( '#markapp' ).markApp( 'addModule', { 'intro': { } } );
					
					$( '#sammy' ).css( 'zIndex', '' );
				} );
		} );
		
		// MARK CREATION
		this.get( '#/mark/new', function( context ) {
			var modOptions = {
				'state': 'drawing',
				'invite_code': context.params['invite'],
				'contributor_type': context.params['contributor_type']
			}
			// if we already have the content loaded, just update the state of the interface
			if ( $( '#markmaker' ).size() > 0 ) {
				$( '#markapp' ).markApp( 'unloadModule', 'intro' );
				
				$( '#markapp' ).markApp( 'addModule', { 'capture': modOptions } );
			} else {
				// template is not yet loaded, so lets start fresh
				// load the template
				this.partial( 'makemark_sammy.html' )
					.then( function() {
						// unload the visualization if it's loaded
						$( '#markapp' ).markApp( 'unloadModule', 'linear' );
						// init the capture interface, specifying that the intro should not be shown
						$( '#markapp' ).markApp( 'addModule', { 'capture': modOptions } );
						$( '#sammy' ).css( 'zIndex', '' );
					} );
			}
		} );
		
		// MODERATION PAGE
		this.get( '#/moderate', function( context ) {
			this.partial( '/en/moderate_sammy.html' )
				.then( function() {
					// unload all mods
					$( '#markapp' ).markApp( 'unloadModule', 'all' );
					// load the linear module
					$( '#markapp' ).markApp( 'addModule', { 'linear': { 'is_flagged': true, 'linear_root': 'moderate' } } );
				} );
		} );
		//	Moderation via direct reference
		this.get( '#\/moderate\/(.*)', function( context ) {
			if ( $( '#linear' ).size() > 0 ) {
				// already setup, just load the new reference mark into the module
				$( '#markapp' ).markApp( 'addModule', { 'linear': { 'is_flagged': true, 'linear_root': 'moderate', 'reference_mark': context.params['splat'][0], 'playback': context.params['playback'] } } );
			} else {
				// show all the signatures
				this.partial( '/en/moderate_sammy.html' )
					.then( function() {
						$( '#sammy' ).css( 'zIndex', '' );
						$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
						// unload the capture and intro interface if it's loaded
						$( '#markapp' ).markApp( 'unloadModule', 'intro' );
						$( '#markapp' ).markApp( 'unloadModule', 'capture' );
						// load up the visualization
						$( '#markapp' ).markApp( 'addModule', { 'linear': { 'is_flagged': true, 'linear_root': 'moderate', 'reference_mark': context.params['splat'][0], 'playback': context.params['playback'] } } );
					} );
			}
		} );
		
		// visualization 
		// visualization with country filtering
		this.get( '#/linear/country/:country_code\/(.*)', function( context ) {
			if ( $( '#linear' ).size() > 0 ) {
				// already setup, just load the new reference mark into the module
				$( '#markapp' ).markApp( 'addModule', { 'linear': { 'country_code': context.params['country_code'], 'reference_mark': context.params['splat'][0] } } );
			} else {
				this.partial( 'linear_sammy.html' )
					.then( function() {
						$( '#sammy' ).css( 'zIndex', '' );
						$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
						// unload the capture interface if it's loaded
						$( '#markapp' ).markApp( 'unloadModule', 'intro' );
						$( '#markapp' ).markApp( 'unloadModule', 'capture' );
						// load up the visualization
						$( '#markapp' ).markApp( 'addModule', { 'linear': { 'country_code': context.params['country_code'], 'reference_mark': context.params['splat'][0] } } );
					} );
				}
		} );
		// visualization without country filtering 
		this.get( '#\/linear\/(.*)', function( context ) {
			if ( $( '#linear' ).size() > 0 ) {
				// already setup, just load the new reference mark into the module
				$( '#markapp' ).markApp( 'addModule', { 'linear': { 'reference_mark': context.params['splat'][0], 'playback': context.params['playback'] } } );
			} else {
				// show all the signatures
				this.partial( 'linear_sammy.html' )
					.then( function() {
						$( '#sammy' ).css( 'zIndex', '' );
						$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
						// unload the capture interface if it's loaded
						$( '#markapp' ).markApp( 'unloadModule', 'intro' );
						$( '#markapp' ).markApp( 'unloadModule', 'capture' );
						// load up the visualization
						$( '#markapp' ).markApp( 'addModule', { 'linear': { 'reference_mark': context.params['splat'][0], 'playback': context.params['playback'] } } );
					} );
			}
		} );
		
		// event handlers 
		this.bind( 'run', function() {
			// add an instance of markApp
			$( '#markapp' )
				.markApp()
				// and privide it a way of accessing the sammy app
				.data( 'markApp-context' )['app'] = app;
		} );
		
		// other stuff
		this.swap = function( content ) {
			this.$element().fadeOut( 'fast', function() {
				$( this ).html( content ).fadeIn( 'normal' );
				$( '#markapp' ).trigger( 'ready' );
			} );
			$( '#markapp' ).trigger( 'swap' );
			
		};
		
		this.use( 'Template' );
		
	} );
	
	$( document ).ready( function () {
		function browserSupportsRequiredFeatures() {
			// detect canvas support
			return !!document.createElement('canvas').getContext;
		}
		if ( browserSupportsRequiredFeatures ) {
			// remove the placeholder content
			$( '#fallback' ).remove();
			// run the app
			app.run( '#/' );
		}
		
		//	Try binding click event to locale here
		$("#current-locale").click(function ()
		{
			$(this).parent().find("ul").toggle();
			$(this).toggleClass("selected");
			return false;
		});
		
	} ); //document ready
} )( jQuery );