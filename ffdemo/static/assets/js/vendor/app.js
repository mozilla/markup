( function( $ ) {
	var app = $.sammy( '#sammy', function() {
		// ROUTES
		this.get( '#/', function( context ) {
			// making our mark
			// unload the visualization if it's loaded
			$( '#markapp' ).markApp( 'unloadModule', 'linear' );
			// load the template
			this.partial( 'makemark_sammy.html' )
				.then( function() {
					// init the intro
					// init the capture interface, specifying that we're playing the intro first, and it should be ready to go when it's done
					$( '#markapp' ).markApp( 'addModule', { 'capture': { 'state': 'intro' } } );
					$( '#markapp' ).markApp( 'addModule', { 'intro': { } } );
					
					$( '#sammy' ).css( 'zIndex', '' );
				} );
		} );
		
		// MARK CREATION
		this.get( '#/mark/new', function( context ) {
			// unload the visualization if it's loaded
			$( '#markapp' ).markApp( 'unloadModule', 'linear' );
			// update the nav
			var modOptions = {
				'state': 'drawing',
				'invite_code': context.params.invite,
				'contributor_type': context.params.contributor_type
			};
			// if we already have the content loaded, just update the state of the interface
			if ( $( '#markmaker' ).size() > 0 ) {
				$( '#markapp' ).markApp( 'unloadModule', 'intro' );
				
				$( '#markapp' ).markApp( 'addModule', { 'capture': modOptions } );
			} else {
				// template is not yet loaded, so lets start fresh
				// load the template
				this.partial( 'makemark_sammy.html' )
					.then( function() {
						$( 'body' ).addClass( 'make-your-mark' );
						
						// init the capture interface, specifying that the intro should not be shown
						$( '#markapp' ).markApp( 'addModule', { 'capture': modOptions } );
						$( '#sammy' ).css( 'zIndex', '' );
					} );
			}
		} );
		
		// MODERATION PAGE
		this.get( '#/moderate', function( context ) {
			// unload the other modules if they're loaded
			$( '#markapp' ).markApp( 'unloadModule', 'intro' );
			$( '#markapp' ).markApp( 'unloadModule', 'capture' );
			this.partial( 'moderate_sammy.html' )
				.then( function() {
					$( '#sammy' ).css( 'zIndex', '' );
					$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
					// load the linear module
					$( '#markapp' ).markApp( 'addModule', { 'linear': { 'is_flagged': true, 'linear_root': 'moderate' } } );
				} );
		} );
		//	Moderation via direct reference
		this.get( '#\/moderate\/(.*)', function( context ) {
			// unload the other modules if they're loaded
			$( '#markapp' ).markApp( 'unloadModule', 'intro' );
			$( '#markapp' ).markApp( 'unloadModule', 'capture' );
			if ( $( '#linear' ).size() > 0 ) {
				// already setup, just load the new reference mark into the module
				$( '#markapp' ).markApp( 'addModule', { 'linear': { 'is_flagged': true, 'linear_root': 'moderate', 'reference_mark': context.params.splat[0] } } );
			} else {
				// show all the signatures
				this.partial( 'moderate_sammy.html' )
					.then( function() {
						$( '#sammy' ).css( 'zIndex', '' );
						$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
						// load up the visualization
						$( '#markapp' ).markApp( 'addModule', { 'linear': { 'is_flagged': true, 'linear_root': 'moderate', 'reference_mark': context.params.splat[0] } } );
					} );
			}
		} );
		
		// visualization 
		// visualization with country filtering
		this.get( '#/linear/country/:country_code\/(.*)', function( context ) {
			// unload the other modules if they're loaded
			$( '#markapp' ).markApp( 'unloadModule', 'intro' );
			$( '#markapp' ).markApp( 'unloadModule', 'capture' );
			if ( $( '#linear' ).size() > 0 ) {
				// already setup, just load the new reference mark into the module
				$( '#markapp' ).markApp( 'addModule', { 'linear': { 'country_code': context.params.country_code, 'reference_mark': context.params.splat[0] } } );
			} else {
				this.partial( 'linear_sammy.html' )
					.then( function() {
						$( '#sammy' ).css( 'zIndex', '' );
						$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
						// load up the visualization
						$( '#markapp' ).markApp( 'addModule', { 'linear': { 'country_code': context.params.country_code, 'reference_mark': context.params.splat[0] } } );
					} );
				}
		} );
		// visualization without country filtering 
		this.get( '#\/linear\/(.*)', function( context ) {
			// unload the other modules if they're loaded
			$( '#markapp' ).markApp( 'unloadModule', 'intro' );
			$( '#markapp' ).markApp( 'unloadModule', 'capture' );
			if ( $( '#linear' ).size() > 0 ) {
				// already setup, just load the new reference mark into the module
				$( '#markapp' ).markApp( 'addModule', { 'linear': { 'reference_mark': context.params.splat[0], 'playback': context.params.playback, 'show_thanks': context.params.be_grateful } } );
			} else {
				// show all the signatures
				this.partial( 'linear_sammy.html' )
					.then( function() {
						$( '#sammy' ).css( 'zIndex', '' );
						$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'default' } );
						// load up the visualization
						$( '#markapp' ).markApp( 'addModule', { 'linear': { 'reference_mark': context.params.splat[0], 'playback': context.params.playback, 'show_thanks': context.params.be_grateful } } );
					} );
			}
		} );
		
		// event handlers 
		this.bind( 'run', function() {
			// add an instance of markApp
			$( '#markapp' )
				.markApp()
				// and privide it a way of accessing the sammy app
				.data( 'markApp-context' ).app = app;
		} );
		
		// other stuff
		this.swap = function( content ) {
			// update the nav
			$( 'body' ).removeClass( 'make-your-mark' );
			this.$element().fadeOut( 'fast', function() {
				$( this ).html( content ).fadeIn( 'normal' );
				$( '#markapp' ).trigger( 'ready' );
			} );
			$( '#markapp' ).trigger( 'swap' );
			
		};
		
		this.use( 'Template' );
		
	} );
	
	$( document ).ready( function () {
		// browserSupportsRequiredFeatures is defined inline so that it can be run immedietly
		if ( browserSupportsRequiredFeatures && browserSupportsRequiredFeatures() ) {
			// run the app
			app.run( '#/' );
		}
		
		
	} ); //document ready
} )( jQuery );