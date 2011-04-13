( function( $ ) {
		
	// The markApp namespace is used for storing available module code, instances of markApp, and any context free functions
	$.markApp = {
		// holds all available modules
		modules: {},
		// we keep track of all instances of markApp in here
		instances: [],
		// helper functions go here
		fn: {}
	};
	
	// Creates a markApp instances with an element, and handles function calls on the instance
	$.fn.markApp = function( options ) {
		var $this = $( this );
		// The context each markApp instance is stored as data on that element
		var context = $this.data( 'markApp-context' );
		// On first call, we need to set things up, but on all following calls we can skip right to the API handling
		if ( !context || typeof context == 'undefined' ) {
			context = {
				// useful variables -- jquery objects get prefixed with $
				app: null,
				$container: $this,
				frameCount: 0,
				width: 0,
				height: 0,
				timezoneOffset: 4, // number of hours distance between the DB server's timezone and GMT. Positive if you're trailing GMT, Negative if you're ahead
				minWidth: 700,
				minHeight: 500,
				countries: [],
				mouseX: null,
				mouseY: null,
				mouseDown: false,
				mouseIn: false,
				modules: {},
				usersMark: null,
				translatedStrings: {},
				locale: ( window.location.pathname.split("/").length > 1 ) ? window.location.pathname.split("/")[1] : "en", // locale -- set by URL, default to 'en'
				instance: $.markApp.instances.push( $this ) - 1,   // store this instances index in the global instace array
				// events
				evt: {
					resize: function( e ) {
						var availableWidth = $( window ).width();
						var availableHeight = $( window ).height() -  ( $( 'header' ).height() + $( '#callout-boxes' ).height() );
						if ( availableWidth < context.minWidth ) availableWidth = context.minWidth;
						if ( availableHeight < context.minHeight ) availableHeight = context.minHeight;
						context.$container.parent().width( availableWidth );
						context.$container.parent().height( availableHeight );
						context.width = availableWidth;
						context.height = availableHeight;
						// resize any elements with the autoResize class
						$( '.autoResize' )
							.height( availableHeight )
							.width( availableWidth )
							.trigger( 'resize.markApp', [availableWidth, availableHeight] );
					},
					mousemove: function( e ) {
						context.mouseX = e.layerX;
						context.mouseY = e.layerY;
					},
					mousedown: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseDown = true;
					},
					mouseup: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseDown = false;
					},
					mouseover: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseIn = true;
					},
					mouseout: function( e ) {
						if( 'preventDefault' in e ) e.preventDefault();
						context.mouseX = null;
						context.mouseY = null;
						context.mouseIn = false;
					},
					ready: function ( e ) {
						// refresh our translations
						context.fn.loadTranslations();
					}
				},
				// publicly accessible functions
				public_fn: {
					addModule: function( context, data ) {
						var moduleName,
							moduleOptions = {};
						if( typeof data == "string" ) {
							moduleName = data
						} else if( typeof data == "object" ) {
							for ( var moduleData in data ) {
								moduleName = moduleData
								moduleOptions = data[moduleData];
								break;
							}
						}
						if( $.markApp.modules[moduleName] ) {
							// give this module it's own space for storing stuff if it doesn't already have it
							context.modules[moduleName] = context.modules[moduleName] || {};
							// if it has an init function, run it
							if( 'init' in $.markApp.modules[moduleName].fn )
								$.markApp.modules[moduleName].fn.init( context, moduleOptions );
						}
					},
					unloadModule: function( context, moduleName ) {
						if( moduleName == "all" ) {
							// unload all the currently loaded modules
							for ( moduleName in context.modules ) {
								// if it has a deinit function, run it
								if( 'deinit' in $.markApp.modules[moduleName].fn )
									$.markApp.modules[moduleName].fn.deinit( context );
								// remove it from our modules
								delete context.modules[moduleName];
							}
						} else if ( moduleName in context.modules ) {
							// if it has a deinit function, run it
							if( 'deinit' in $.markApp.modules[moduleName].fn )
								$.markApp.modules[moduleName].fn.deinit( context );
							// remove it from our modules
							delete context.modules[moduleName];
						}
					}
				},
				// internal functions
				fn: {
					// trigger event handlers on modules
					trigger: function( eventName, eventObj, args ) {
						// Add some assurances to our eventObj
						if( typeof eventObj == "undefined" )
							eventObj = { 'type': 'custom' };
						
						// trigger the global handlers first
						if ( eventName in context.evt ) {
							// if it returns false, stop the train
							if ( context.evt[eventName]( eventObj ) == false ) {
								return false;
							}
						}
						
						// run the event handler on each module that's got it
						for( var module in context.modules ) {
							if( module in $.markApp.modules && 
								'evt' in $.markApp.modules[module] &&
								eventName in $.markApp.modules[module].evt ) {
									$.markApp.modules[module].evt[eventName]( context, eventObj, args );
								}
						}
					},
					loop: function( e ) {
						// reset the delay
						setTimeout( function() { context.fn.loop( ); }, 42 );
						// incremenet the counter
						context.frameCount++;
						// dispatch the event
						context.fn.trigger( 'loop', {}, [] );
					},
					// useful for delayed loading of the country data
					withCountryCodes: function ( callback ) {
						if ( 'US' in context.countries ) {
							callback( context.countries );
						} else {
							$.ajax( {
								'url': '/media/assets/js/vendor/country_codes.json',
								'dataType': 'JSON',
								'success': function ( data ) {
									context.countries = data;
									for( var i = 0; i < data.length; i++ ) {
										context.countries[ data[i].code ] = data[i].name;
									}
									callback( context.countries );
								},
								'error': function () {
									// handle error loading countries
								}
							} );
						}
					},
					showLoader: function( msg, custom_class, extraText, delay ) {
						clearTimeout( context.loaderTimeout );
						var custom_class = typeof custom_class === "string" ? custom_class : '';
						var msg = typeof msg === "string" ? msg : context.fn.getString( 'default-loading-msg' );
						// hide any existing loaders
						context.fn.hideLoader();
						// append our loader
						var $loader = $( '<div />' )
							.width( context.width )
							.height( context.height )
							.hide()
							.bind( 'click mousedown mouseup', function( e ) {
								// interecept any click type events happening on the loader
								e.preventDefault();
								return false;
							} )
							.addClass( 'overlay-wrapper autoResize' )
							.addClass( custom_class )
							.attr( 'id', 'markapp-loader' )
							.append( $( '<div />' )
								.text( msg ) );
						if( extraText ) {
							$loader
								.append( $( '<p />' )
									.html( extraText ) );
						}
						if ( delay && typeof delay === "number" ) {
							context.loaderTimeout = setTimeout( function() {
								context.$container
									.append( $loader );
								$loader.fadeIn( 'fast' );
							}, delay );
						} else {
							context.$container
								.append( $loader );
							$loader.fadeIn( 'fast' );
						}
					},
					hideLoader: function( ) {
						clearTimeout( context.loaderTimeout );
						$( '#markapp-loader' ).fadeOut( 'fast', function() {
							$( this ).remove();
						} );
					},
					showError: function ( msg, afterError ) {
						var msg = typeof msg === "string" ? msg : context.fn.getString( 'default-error-msg' );
						// hide any existing errors or loaders
						context.fn.hideError(); 
						context.fn.hideLoader();
						var $error = $( '<div />' )
							.width( context.width )
							.height( context.height )
							.hide()
							.click( function ( e ) {
								e.preventDefault();
								context.fn.hideError();
								if ( afterError && typeof afterError === "string" ) context.app.setLocation( afterError )
							} )
							.addClass( 'overlay-wrapper autoResize' )
							.attr( 'id', 'markapp-error' )
							.append( $( '<div />' )
								.attr( 'id', 'markapp-error-content' )
								.append( $( '<p />' ).html( msg ) ) );
						context.$container
							.append( $error );
						$error.fadeIn( 'fast' );
					},
					hideError: function ( ) {
						$( '#markapp-error' ).fadeOut( 'fast', function() {
							$( this ).remove();
						} );
					},
					// parses translated strings out of div.translated-strings
					// ol's are treated as arrays
					// everything else as is
					loadTranslations: function( ) {
						$( 'div.translated-strings' ).each( function () {
							$( this ).children().each( function () {
								var $this = $( this );
								if ( $this.is( 'ol' ) ) {
									// if it's an ol, load the strings in each childnode as an array
									context.translatedStrings[$this.attr( 'id' )] = [];
									$this.children().each( function () {
										context.translatedStrings[$this.attr( 'id' )].push( $( this ).html() );
									} );
								} else {
									// otherwise just load the elements contents
									context.translatedStrings[$this.attr( 'id' )] = $this.html();
								}
							} );
						} );
					},
					// looks for a match in translated stings
					// returns the match if found, else it returns the key
					getString: function ( key, index ) {
						if( key in context.translatedStrings ) {
							if( typeof context.translatedStrings[key] === "object" && typeof index === "number" ) {
								// if this tranlsation is an array of strings, and we were passed an index val
								return context.translatedStrings[key][index];
							} else {
								// otherwise just return the match
								return context.translatedStrings[key];
							}
						} else {
							// fallback to returning the passed key if we can't find the translation
							return key;
						}
					},
					storeData: function( key, value ) {
						if ( typeof localStorage != 'undefined' ) {
							// use localStorage if it exists
							try {
								if( typeof value === "object" ) {
									value = JSON.stringify( value );
								}
								localStorage.setItem( key, value );
							} catch (e) {
							 	 if ( e == QUOTA_EXCEEDED_ERR ) { /* data wasn't successfully saved due to quota exceed */ }
							}
						}
					},
					getData: function( key ) {
						if ( typeof localStorage != 'undefined' ) {
							var item = localStorage.getItem( key );
							if( item ) {
								if ( item[0]=="{" ) item = JSON.parse( item );
								return item;
							} else {
								return false;
							}
						}
					},
					validate: {
						url: function( url ) {
							var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
							return regexp.test( url );
						},
						string: function ( string ) {
							return ( typeof string === "string" && string.length != "" ) ? true : false; 
						}
					}
				}
			};
			// bindings
			$( window )
				.delayedBind( 300, 'resize', function( e ) {
					return context.fn.trigger( 'resize', e );
				} )
				.bind( 'keydown keypress keyup', function( e ) {
					return context.fn.trigger( e.type, e );
				} )
				.trigger( 'resize' );
			context.$container
				.bind( 'mousemove mousedown mouseup mouseover mouseout ready swap', function( e ) {
					return context.fn.trigger( e.type, e );
				} );
			// start the loop
			context.fn.loop();
		}
		
		// Convert the arguments to an array to make this easier
		var args = $.makeArray( arguments );
		
		// handle public function calls
		if ( args.length > 0 ) {
			var call = args.shift();
			if ( call in context.public_fn ) {
				context.public_fn[call]( context, typeof args[0] == 'undefined' ? {} : args[0] );
			}
		}
		
		return $this.data( 'markApp-context', context );
	};
	
}( jQuery ) );