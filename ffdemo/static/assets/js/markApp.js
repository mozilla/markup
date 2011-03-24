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
					showLoader: function( msg, custom_class ) {
						var custom_class = typeof custom_class === "string" ? custom_class : '';
						var msg = typeof msg === "string" ? msg : context.fn.getString( 'default-loading-msg' );
						// append our loader
						var $loader = $( '<div />' )
							.width( context.width )
							.height( context.height )
							.hide()
							.addClass( 'overlay-wrapper autoResize' )
							.addClass( custom_class )
							.attr( 'id', 'markapp-loader' )
							.append( $( '<div />' )
								.text( msg ) );
						context.$container
							.append( $loader );
						$loader.fadeIn( 'fast' );
					},
					hideLoader: function( ) {
						$( '#markapp-loader' ).fadeOut( 'fast', function() {
							$( this ).remove();
						} );
					},
					showError: function ( msg ) {
						var msg = typeof msg === "string" ? msg : context.fn.getString( 'default-error-msg' );
						var $error = $( '<div />' )
							.width( context.width )
							.height( context.height )
							.hide()
							.click( function ( e ) {
								e.preventDefault();
								context.fn.hideError();
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
( function( $ ) {
	
	// support loose augmentation
	markApp = $.markApp = $.markApp || {};
	modules = $.markApp.modules = $.markApp.modules || {};
	
	modules.linear = {
		defaults: {
			reference_mark: null, // optional reference mark -- will init the visualization on this mark if passed
			country_code: null, // optional country code -- only loads marks with this county code if present 
			playback: false, // set this to true to immediately play back the initial mark
			is_flagged: false, // optional flagged flag -- only loads marks that are flagged (for use within moderation)
			linear_root: 'linear'
		},
		config: {
			marks: {}, // all marks held here
			flaggings: {}, // loaded from local storage, and used for some local checking that users are flagging things multiple times
			orderedMarks: [], // array of mark references, arranged by id
			leftBuffer: [], // mark buffers for the left and right of the marks currently in the scene
			rightBuffer: [],
			bufferSize: 20, // amount of marks to keep in a buffer
			bufferMinSize: 5, // min amount of marks to keep in a buffer before forcing a refill
			scene: null,
			// handles camera changes -- could probably be shifted into the camera object
			cameraChange: {},
			tweens: {},
			layerManager: null, // layer manager
			initialized: false, // boolean flag to indicate if this module is fully setup
			requestingMarks: false, // prevents more mark request from being sent when set to true
			moreLeft: true, // Flags for the begining and end of the line. Assume we're not there at the start
			moreRight: true, 
			hoverMark: null, // holds the mark currently being hovered over
			currentMark: null,
			playbackTimes: {}, // used for storing mark playback times by reference
			eventChange: false // flag to tell the render loop if the mouse is causing changes that need rendered
		},
		evt: {
			ready: function ( context, e ) {
				modules.linear.fn.initInterface( context );
			},
			resize: function( context, e ) {
				context.modules.linear.eventChange = true;
				context.modules.linear.layerManager.resizeAll( context.width, context.height );
			},
			keydown: function ( context, e ) {
				var lC = context.modules.linear;
				switch( e.keyCode ) {
					case 38:
						// arrow up
						e.preventDefault();
						lC.cameraChange.aZ = 10;
						break;
					case 40:
						// arrow down
						e.preventDefault();
						lC.cameraChange.aZ = -10;
						break;
					case 39:
						// arrow right -- pan the camera to the right
						e.preventDefault();
						// next mark
						lC.cameraChange.aX = 10;
						// hide mark info
						modules.linear.fn.hideMarkInformation( context );
						break;
					case 37:
						// arrow left -- pan the camera to the left
						e.preventDefault();
						// prev mark
						lC.cameraChange.aX = -10;
						// hide mark info
						modules.linear.fn.hideMarkInformation( context );
						break;
				}
			},
			keyup: function( context, e ) {
				var lC = context.modules.linear;
				switch( e.keyCode ) {
					case 38:
					case 40:
						// arrow up
						e.preventDefault();
						lC.cameraChange.aZ = 0;
						break;
					case 39:
					case 37:
						e.preventDefault();
						lC.cameraChange.aX = 0;
						break;
				}
			},
			// prevent our bound keys from firing native events
			keypress: function( context, e ) {
				switch( e.keyCode ) {
					case 38:
					case 40:
					case 39:
					case 37:
						e.preventDefault();
						break;
				}
			},
			mousedown: function( context, e ) {
				var lC = context.modules.linear;
				if( mark = modules.linear.fn.hitTest( context, context.mouseX, context.mouseY ) ) {
					// if the mark hasn't changed from what's in our URL, we just need to show the details again
					if ( mark == lC.currentMark ) {
						modules.linear.fn.centerCurrentMark( context, function() {
							modules.linear.fn.showMarkInformation( context );
						} );
					// otherwise update the URL, and the module will jump to the referenced mark
					} else if ( lC.country_code ) {
						context.app.setLocation( '#/' + lC.linear_root + '/country/' + lC.country_code + '/' + mark.reference );
					} else {
						context.app.setLocation( '#/' + lC.linear_root + '/' + mark.reference );
					}
				}
			},
			mousemove: function( context, e ) {
				var lC = context.modules.linear;
				lC.eventChange = true;
				// hover test
				if( mark = modules.linear.fn.hoverTest( context, context.mouseX, context.mouseY, lC.hoverMark ) ) {
					// reset the old hovered mark
					if( lC.hoverMark ) lC.hoverMark.color = lC.hoverMark.contributor_name ? '0,139,211' : '0,0,0';
					// store this hover mark
					lC.hoverMark = mark;
					if ( lC.currentMark && lC.hoverMark.reference == lC.currentMark.reference && lC.hoverMark.contributor_name && $( '#mark-information' ).is( ':visible' ) ) {
						$( '#contributor-quote-box' )
							.fadeIn( 'fast' )
							.css( { left: context.mouseX - 15, top: context.mouseY - $( '#contributor-quote-box' ).height() - 15 } );
					} else {
						$( '#contributor-quote-box:visible' ).fadeOut( 'fast' );
						lC.hoverMark.color = lC.hoverMark.contributor_name ? '255,111,40' : '0,139,211';
					}
				} else if ( lC.hoverMark ) {
					lC.hoverMark.color = lC.hoverMark.contributor_name ? '0,139,211' : '0,0,0';
					lC.hoverMark = null;
					// fade out any contributor quotes we might happen to be showing 
					$( '#contributor-quote-box:visible' ).fadeOut( 'fast' );
				}
				
			},
			loop: function ( context ) {
				var lC = context.modules.linear,
					dLayer = lC.layerManager.layers['drawingLayer'];
					
				// update the position of the camera 
				var lastCameraPosition = {x: lC.scene.camera.position.x, y: lC.scene.camera.position.y, z: lC.scene.camera.position.z };
				// two ways this can happen
				if( 'cameraEase' in lC.tweens ) {
					// with a tween
					TWEEN.update();
				} else {
					// or with physics
					lC.cameraChange.vZ += lC.cameraChange.aZ;
					lC.cameraChange.vX += lC.cameraChange.aX;
					lC.cameraChange.vX *= .93;
					lC.cameraChange.vZ *= .93;
					lC.scene.camera.position.x += lC.cameraChange.vX;
					lC.scene.camera.position.z += lC.cameraChange.vZ;
					// bring the Y and Z positions close to the current mark
					var mark = modules.linear.fn.closestMark( context );
					if ( mark ) {
						var dY = lC.scene.camera.position.y - ( mark.position.y + ( mark.bHeight / 2 ) );
						// if Z is not changing, try to maintain
						// if( )
						// var dZ = lC.scene.camera.position.z - 
						if ( dY != 0 && Math.abs(dY) >= 10) lC.scene.camera.position.y += ( dY > 0 ? -10 : 10 );
					}
					// TODO: fix the Z index while navigating the line
				}
				
				// if nothing has changed, return RIGHT NOW
				if( !lC.eventChange &&
					lastCameraPosition.x == lC.scene.camera.position.x &&
					lastCameraPosition.y == lC.scene.camera.position.y &&
					lastCameraPosition.z == lC.scene.camera.position.z ) {
					return false;
				}
				
				// modified hover test -- only removes hover states 
				if( lC.hoverMark && ! modules.linear.fn.hoverTest( context, context.mouseX, context.mouseY, lC.hoverMark ) ) {
					lC.hoverMark.color = lC.hoverMark.contributor_name ? '0,139,211' : '0,0,0';
					lC.hoverMark = null;
					// fade out any contributor quotes we might happen to be showing 
					$( '#contributor-quote-box:visible' ).fadeOut( 'fast' );
				}
				
				dLayer.clean();
				// update scene marks && add more as needed
				modules.linear.fn.updateScene( context, lC.scene.camera.position.x - 10000, lC.scene.camera.position.x + 10000 );
				// cleanup the scene and tend to empty buffers
				modules.linear.fn.updateBuffers( context, lC.scene.camera.position.x - 10000, lC.scene.camera.position.x + 10000 );
				
				// render the scene 
				Mark.renderer.renderScene( lC.scene, { 'cursor': {x: context.mouseX, y: context.mouseY}, width: context.width, height: context.height } );
				// ark.renderer.renderScene( lC.scene, dLayer.context, { x: context.mouseX, y: context.mouseY }, context.width, context.height, lC.playbackTimes );
				
				// set the eventChange flag back to false -- a mouse/keyboard or playback event will need to set it back to true again before we'll render because of it
				lC.eventChange = false
				
				// cleanup playback times if necissary
				for( mark in lC.scene.timers ) {
					var now = ( new Date() ).getTime();
					if( lC.scene.timers[mark].end < now ) {
						delete lC.scene.timers[mark];
					} 
					lC.eventChange = true;
				}
				
			}
		},
		fn: {
			init: function( context, options ) {
				var lC = context.modules.linear;
				// if this modules has already been initialized, update the options
				if ( '$linear' in context.modules.linear ) {
					// before we merge options, check if we need to dump our current data
					if ( options['country_code'] != lC.country_code ) {
						modules.linear.fn.dumpAllMarks( context );
					}
					// now our options into our context
					$.extend( lC, lC, options );
					// since merging won't replace null or undefined values, make sure we clean up after it
					for( option in modules.linear.defaults ) {
						if ( options[option] == null ) lC[option] = modules.linear.defaults[option];
					}
					// update the interface
					modules.linear.fn.updateInterface( context );
					// load our marks
					modules.linear.fn.initMarks( context );
				} else {
					// allow defaults to be overriden
					$.extend( lC, modules.linear.defaults, options );
					// but not the cofig
					$.extend( lC, lC, modules.linear.config );

					// DOM setup
					lC.$linear = $( '<div />' )
						.addClass( "linear-container" );
					context.$container
						.append( lC.$linear );

					// scene setup
					lC.scene = new Mark.scene();
					lC.cameraChange = { aX: 0, aY: 0, aZ: 0, vX: 0, vY: 0, vZ: 0 };
					// layer setup
					lC.layerManager = new Mark.layerManager( lC.$linear.get( 0 ) );
					lC.layerManager.addLayer( 'drawingLayer' );
					lC.scene.canvasContext = lC.layerManager.layers['drawingLayer'].context;
					// trigger resize so our new layers are sized to fit
					context.fn.trigger( 'resize' );

					lC.initialized = true;
				}
				// load flaggings
				lC.flaggings = context.fn.getData( 'markFlaggings' ) || {};
			},
			deinit: function( context ) {
				var lC = context.modules.linear;
				lC.$linear.fadeOut( 'fast', function () {
					// remove all our layers
					lC.layerManager.removeAll();
					lC.$linear.remove();
					lC.initialized = false;
				} );
			},
			initInterface: function( context ) {
				var lC = context.modules.linear;
				// hide anything that needs data loaded into it
				$( '#stats' )
					.hide( );
				// enable the controls
				$( '#mark-browsing-zoom-in a, #mark-browsing-zoom-out a, #mark-browsing-next a, #mark-browsing-prev a' )
					.click( function( e ){ e.preventDefault(); } )
					.bind( 'mouseup mouseout', function( e ) {
						e.preventDefault();
						if ( $( this ).data( 'mouseDown' ) ) {
							if( $( this ).is( '#mark-browsing-zoom-in a, #mark-browsing-zoom-out a' ) ) {
								context.modules.linear.cameraChange.aZ = 0;
							} else if( $( this ).is( '#mark-browsing-next a, #mark-browsing-prev a' ) ) {
								context.modules.linear.cameraChange.aX = 0;
							}
							$( this ).data( 'mouseDown', false );
						}
					} )
					.bind( 'mousedown', function( e ) {
						e.preventDefault();
						$( this ).data( 'mouseDown', true );
						if( $( this ).is( '#mark-browsing-zoom-in a, #mark-browsing-zoom-out a' ) ) {
							context.modules.linear.cameraChange.aZ = $( this ).is( '#mark-browsing-zoom-in a' ) ? 10 : -10;
						} else if ( $( this ).is( '#mark-browsing-next a, #mark-browsing-prev a' ) ) {
							context.modules.linear.cameraChange.aX = $( this ).is( '#mark-browsing-next a' ) ? 10 : -10;
							// hide the mark information
							modules.linear.fn.hideMarkInformation( context );
						}
					} );
					// populate our country filter select box
					context.fn.withCountryCodes( function ( countryCodes ) {
						var $select = $( '#country-select' );
						for( var i = 0; i < countryCodes.length; i++ ) {
							var $option = $( '<option />' )
								.val( countryCodes[i].code )
								.text( countryCodes[i].name );
							$select.append( $option );
						}
						$select.change( function ( ) {
							var val = $( this ).val();
							if( val.length != 2 && lC.country_code ) {
								// redirect back to the unfiltered view
								context.app.setLocation( '#/' + lC.linear_root + '/' );
							} else if ( val.length == 2 && val != lC.country_code ) {
								// redirect to linear mode with the new country code
								context.app.setLocation( '#/' + lC.linear_root + '/country/' + val + '/' );
							}
							// return focus to the viz
							$( this ).blur();
							context.$container.focus();
						} );
						// select the current mark if we have it
						if( lC.country_code ) $select.val( lC.country_code );
					} );

				// hide all the mark detial things 
				$( '#mark-information' ).hide();
				// setup the mark details 
				$( '#mark-playback' )
					.click( function ( e ) {
						e.preventDefault();
						modules.linear.fn.replayCurrentMark( context );
					} );
				$( '#mark-flag' )
					.click( function( e ) {
						e.preventDefault();
						modules.linear.fn.flagCurrentMark( context );
					} );
				//	Click events for moderation mode
				$( '#delete-mark' )
					.click( function( e ) {
						e.preventDefault();
						modules.linear.fn.deleteCurrentMark( context );
					} );
				$( '#approve-mark-checkbox' )
					.change( function( e ) {
						e.preventDefault();
						var shouldApprove = $(this).is(':checked');
						modules.linear.fn.approveCurrentMark( context, shouldApprove );
					} );
				// setup sharing
				$( '#twitter-share' ).socialShare( { 
					'share_url': 'http://twitter.com/share', 
					'share_params': { 'text': context.fn.getString( 'twitter-msg' ) }
					} );
				$( '#facebook-share' ).socialShare( {
					'share_url': 'http://www.facebook.com/sharer.php',
					'share_params': { 't': context.fn.getString( 'facebook-msg' ) }
					} );
				// run the interface update
				modules.linear.fn.updateInterface( context );
				// load our marks
				modules.linear.fn.initMarks( context );
				
				
				$("#sammy #country-select").selectBox({ autoWidth: false });
				$("#sammy #contributor-select").selectBox({ autoWidth: false });
				
				
			},
			initMarks: function ( context ) {
				var lC = context.modules.linear;
				if ( lC.reference_mark && lC.reference_mark != "" ) {
					// If we were passed a mark to start with, start there
					if( lC.reference_mark in lC.marks ) {
						// if we already have this mark, just jump to it
						modules.linear.fn.jumpToMark( context, lC.reference_mark, lC.playback );
					} else {
						// load the mark and it's surrounding marks
						modules.linear.fn.loadMarks( context, {
							'reference': lC.reference_mark,
							'include_forward': 20,
							'include_back': 20,
							'include_mark': 1,
							'success': function ( data ) {
								if( data.success ) {
									// push the marks into the leftBuffer
									modules.linear.fn.setupMarks( context, data.marks );
									// and jump to our mark
									modules.linear.fn.jumpToMark( context, lC.reference_mark, lC.playback );
								} else {
									// show the error message, with a link back to the main visualization link
									context.fn.showError( lC.errorMsg );
								}
								lC.requestingMarks = false;
							}
						} );
					}
					
				} else {
					// otherwise start at the first mark
					modules.linear.fn.loadMarks( context,  {
						'offset': 0,
						'max': 20,
						'success': function ( data ) {
							if( data.success ) {
								modules.linear.fn.setupMarks( context, data.marks );
								// after we load the marks, back the camera away and zoom to the first one
								if( firstMark = lC.marks[data.marks[0].reference] ) {
									lC.scene.camera.position.x = -4000;
									lC.scene.camera.position.z = -3000;
									var tween = 'cameraEase' in lC.tweens ? lC.tweens['cameraEase'] : new TWEEN.Tween( lC.scene.camera.position );
									tween
										.to( { 
											x: ( firstMark.bWidth / 2 ), 
											y: ( firstMark.bHeight / 2 ),
											z: -1000 }, 2000 )
										.onComplete( function( ) {
											delete lC.tweens['cameraEase'];
											if ( typeof callback === "function" ) callback( this );
										} )
										.easing( TWEEN.Easing.Quartic.EaseInOut )
										.start();
									lC.tweens['cameraEase'] = tween;
								}
							} else {
								// show the error message, with a link back to the main visualization link
								context.fn.showError( lC.errorMsg );
							}
							lC.requestingMarks = false;
						}
					} );
				}
			},
			// DOM updates that should run after every new request should go here
			updateInterface: function ( context ) {
				var lC = context.modules.linear;
				// show the appropriate middle link
				var userMark = context.fn.getData( 'userMark' );
				if( userMark && ( lC.country_code ? ( userMark.country_code == lC.country_code ) : true ) ) {
					$( '#your-mark-link' )
						.attr( 'href', '#/' + lC.linear_root + '/' + context.fn.getData( 'userMark' ).reference )
						.show();
				} else {
					$( '#your-mark-link' )
						.hide();
				}
				// setup the stats
				var options = {};
				if( lC.country_code ) {
					options['country_code'] =  lC.country_code;
					$( "#contributor-select" ).next().hide();
					$( '#contributor-select-label' ).hide();
				} else {
					$( "#contributor-select" ).next().show();
					$( '#contributor-select-label' ).show();
				}
				// if the country has changed, grab updated data
				if( ! $( '#mark-browsing-options' ).is( '.country-' + ( lC.country_code ? lC.country_code : 'all' ) ) ) {
					$.ajax( {
						'url': '/requests/init_viz_data',
						'data': options,
						dataType: 'JSON', 
						success: function( data ) {
							// set the class on the details to indicate country 
							$( '#mark-browsing-options' )
								.removeAttr( 'class' )
								.addClass( 'country-' + ( lC.country_code ? lC.country_code : 'all' ) );
							// setup and show the stats
							$( '#stats-number-of-marks' )
								.text( data.total_marks );
							$( '#stats-number-of-countries' )
								.text( data.total_countries );
							var now = new Date();
							var then = new Date( data.first_mark_at );
							var days = Math.ceil( ( now.getTime() - then.getTime() ) / ( 1000 * 60 * 60 * 24 ) ); 
							$( '#stats-number-of-days' )
								.text( days );
							$( '#stats' )
								.fadeIn( 'fast' );
							if( lC.country_code ) {
								$( '#first-mark-link' )
									.attr( 'href', '#/' + lC.linear_root + '/country/' + lC.country_code + '/' + data.country_first_mark );
								$( '#last-mark-link' )
									.attr( 'href', '#/' + lC.linear_root + '/country/' + lC.country_code + '/' + data.country_last_mark );
							} else {
								$( '#first-mark-link' )
									.attr( 'href', '#/' + lC.linear_root + '/' + data.first_mark );
								$( '#last-mark-link' )
									.attr( 'href', '#/' + lC.linear_root + '/' + data.last_mark );
							}
							// setup collapsibles
							$( '#mark-browsing' ).collapsibleMod( );
							$( '#stats' ).collapsibleMod( { 'collapsedHeight': 10 } );
							
							// if the contributor box is empty, fill it
							if( $( '#contributor-select option' ).size() == 1 ) {
								var $select = $( '#contributor-select' );
								if ( data.contributor_marks ) {
									for( var i = 0; i < data.contributor_marks.length; i++ ) {
										var $option = $( '<option />' )
											.val( data.contributor_marks[i].reference )
											.text( data.contributor_marks[i].contributor );
										$select.append( $option );
									}
								}
								$select.change( function ( ) {
									var val = $( this ).val();
									if( val.length != "label" ) {
										// jump to this contributors mark
										context.app.setLocation( '#/' + lC.linear_root + '/' + val );
									}
									// return focus to the viz
									$( this ).blur();
									context.$container.focus();
								} );
								if( lC.country_code ) {
									options['country_code'] =  lC.country_code;
									$( "#contributor-select" ).next().hide();
									$( '#contributor-select-label' ).hide();
								} else {
									$( "#contributor-select" ).next().show();
									$( '#contributor-select-label' ).show();
								}
							} 
						}
					} );
				}
			},
			dumpAllMarks: function ( context ) {
				var lC = context.modules.linear;
				for( mark in lC.marks )
					delete lC.marks[mark];
				lC.scene.objects = [];
				lC.leftBuffer = [];
				lC.rightBuffer = [];
				lC.moreRight = true;
				lC.moreLeft = true;
				// whenever we do this, we need to set the camera back to 0,0,-1000
				lC.scene.camera.position.x = 0;
				lC.scene.camera.position.y = 0;
				lC.scene.camera.position.z = -1000;
			},
			loadMarks: function( context, options ) {
				var lC = context.modules.linear;
				var callback = options.success;
				delete options.success;
				// pass the country code if we have one
				if ( lC.country_code ) options.country_code = lC.country_code;
				var url_to_load = options.reference ? '/requests/marks_by_reference' : '/requests/all_marks';
				if (lC.is_flagged)
				{
					url_to_load = '/requests/marks_by_flagged';
				}
				// if we're loading based on a reference we dont have, we need to dump everything as we can't ensure we wont drop marks in between
				if( options.reference && !( options.reference in lC.marks ) ) {
					// if we're looking for a specific mark see if we already have that one
					modules.linear.fn.dumpAllMarks( context );
					context.fn.showLoader( context.fn.getString( 'loading-marks-msg' ), 'overlay-light' );
				} else if ( ! options.reference ) {
					context.fn.showLoader( context.fn.getString( 'loading-marks-msg' ), 'overlay-light' );
				}
				$.ajax( {
					url: url_to_load,
					data: options,
					dataType: 'JSON'
				} )
				.success( callback )
				.success( function ( data ) {
					// hide the loader
					context.fn.hideLoader();
				} );
			},
			setupMarks: function( context, marks ) {
				var lC = context.modules.linear;
				// if this is empty, return
				if( marks.length == 0 ) return;
				// get rid of marks we've already got
				for( var i = 0; i < marks.length; i++ ) {
					if( marks[i].reference in lC.marks ) {
						marks.shift( i, 1 );
					}
				}

				// sort our current marks so we can tell what buffer to load these into
				var sortedMarks = [];
				for ( var mark in lC.marks )
					sortedMarks.push( [mark, lC.marks[mark].id] );
				sortedMarks.sort( function( a, b ) { return a[1] - b[1] } );
				
				// default to the right buffer
				var buffer = sortedMarks.length == 0 || sortedMarks[0][1] < marks[0].id ? lC.rightBuffer: lC.leftBuffer;
				// var buffer = sortedMarks.length > 0 && sortedMarks[0][1] > marks[0].id ? lC.rightBuffer : lC.leftBuffer;
				var reverse = buffer == lC.leftBuffer ? true : false;
				if( reverse ) marks.reverse();
				// try to establish a previous mark by which we can position the new marks
				var pMark = buffer.length > 0 ? 
					lC.marks[buffer[ reverse ? 0 : buffer.length - 1 ]] :
					lC.scene.objects[ reverse ? 0 : lC.scene.objects.length - 1];
				for ( var i = 0; i < marks.length; i++ ) {
					// if we already have this one, on to the next one
					if( marks[i].reference in lC.marks ) continue;
					var points_obj = JSON.parse( marks[i].points_obj_simplified );
					// do some validation to make sure this mark wont break the viz
					if( !( 'strokes' in points_obj ) || 
						points_obj.strokes.length == 0 ||
						points_obj.strokes[0].length < 2 ) continue;
					var mark = new Mark.gmlMark( points_obj.strokes, marks[i].reference, marks[i].country_code, marks[i].date_drawn, points_obj.rtl, marks[i].id, marks[i].is_approved );
					if( marks[i].contributor ) {
						mark.contributor_name = marks[i].contributor;
						mark.extra_info = points_obj.extra_info;
						mark.color = '0,139,211';
					}
					// stash this mark
					lC.marks[mark.reference] = mark;
					// position this mark relative to the last one
					if ( pMark ) mark.positionRelativeTo( pMark, reverse );

					if( reverse ) {
						buffer.unshift( mark.reference );
					} else {
						buffer.push( mark.reference );
					}
					pMark = mark;
				}
				// if ( !lC.currentMark ) lC.currentMark = mark;
			},
			// attempts to refill a buffer that's running low
			refillBuffer: function( context, buffer ) {
				var lC = context.modules.linear;
				if( lC.requestingMarks ) return;
				lC.requestingMarks = true;
				var isLeft = buffer == lC.leftBuffer;
				var lastMark = null;
				lastMark = buffer.length > 0 ? 
					lC.marks[buffer[ isLeft ? 0 : buffer.length - 1 ]] :
					lC.scene.objects[ isLeft ? 0 : lC.scene.objects.length - 1];
				modules.linear.fn.loadMarks( context, {
					'reference': lastMark.reference,
					'include_forward': isLeft ? 0 : 20,
					'include_back': isLeft ? 20 : 0,
					'include_mark': 0,
					'success': function ( data ) {
						if( data.success ) {
							// push the marks into the leftBuffer
							modules.linear.fn.setupMarks( context, data.marks );
							// if we got back less than we asked for, assume we're at the end
							if ( data.marks.length == 0 ) {
								lC[ isLeft ? 'moreLeft' : 'moreRight'] = false;
							}
						} else {
							// if we got an error, assume we're at the end and don't allow more to be loaded
							lC[ isLeft ? 'moreLeft' : 'moreRight'] = false;
						}
						lC.requestingMarks = false;
					}
				} );
			},
			// moves marks from the display to the buffers
			// also will grab more marks if a buffer length sinks below a threshold
			updateBuffers: function( context, xMin, xMax ) {
				var lC = context.modules.linear;
				if( lC.scene.objects.length == 0 ) return;
				// look for marks that need moved into the left buffer
				var mark = lC.scene.objects[0];
				while( mark && mark.position.x + mark.bWidth < xMin ) {
					lC.leftBuffer.push( lC.scene.objects.shift().reference );
					mark = lC.scene.objects[0];
				}
				// look for marks that need moved into the right buffer
				mark = lC.scene.objects[lC.scene.objects.length - 1];
				while( mark && mark.position.x > xMax ) {
					lC.rightBuffer.unshift( lC.scene.objects.pop().reference );
					mark = lC.scene.objects[lC.scene.objects - 1];
				}
				// if either of our buffers are running low, load more marks
				if ( lC.leftBuffer.length < 5 && lC.scene.objects.length > 0 && lC.moreLeft && !lC.requestingMarks ) {
					modules.linear.fn.refillBuffer( context, lC.leftBuffer );
				} else if ( lC.rightBuffer.length < 5 && lC.scene.objects.length > 0 && lC.moreRight && !lC.requestingMarks ) {
					modules.linear.fn.refillBuffer( context, lC.rightBuffer );
				}
			},
			// moves marks from the buffers to the display
			updateScene: function( context, xMin, xMax) {
				var lC = context.modules.linear;
				if( lC.rightBuffer.length > 0 ) {
					// look for marks that need added from the right buffer
					var mark = lC.marks[lC.rightBuffer[0]];
					while( mark && mark.position && mark.position.x < xMax ) {
						lC.scene.objects.push( lC.marks[lC.rightBuffer.shift()] );
						mark = lC.rightBuffer[0];
					}
				}
				if( lC.leftBuffer.length > 0 ) {
					// look for marks that need added from the left buffer
					var mark = lC.marks[lC.leftBuffer[lC.leftBuffer.length - 1]];
					while( mark && mark.position && mark.position.x + mark.bWidth > xMin ) {
						lC.scene.objects.unshift( lC.marks[lC.leftBuffer.pop()] );
						mark = lC.leftBuffer[lC.leftBuffer.length - 1];
					}
				}
			},
			jumpToMark: function( context, reference, playback ) {
				var lC = context.modules.linear;
				// find the mark
				var oldMark = lC.currentMark;
				lC.currentMark = lC.marks[reference];
				// delay playback
				if ( playback ) {
					var wayLater = ( new Date() ).getTime() *2;
					lC.scene.timers[reference] = { 'start': wayLater, 'end': wayLater + lC.currentMark.maxTime, 'speed': 1 };
				}
				modules.linear.fn.centerCurrentMark( context, function () {
					// if we're playing it back, play it back
					if( playback ) modules.linear.fn.replayCurrentMark( context );
					// fade up those beautiful details if they're not already shown
					modules.linear.fn.showMarkInformation( context );
				} );
			},
			// unused but maybe helpful at some point?
			// updatedOrderedMarks: function( context ) {
			// 	var lC = context.modules.linear;
			// 	var sortedMarks = [];
			// 	for ( var mark in lC.marks )
			// 		sortedMarks.push( [mark, lC.marks[mark].id] );
			// 	sortedMarks.sort( function( a, b ) { return a[1] - b[1] } );
			// 	// clear it out first
			// 	lC.orderedMarks = [];
			// 	for( var i = 0; i < sortedMarks.length; i++ ) {
			// 		lC.orderedMarks.push( sortedMarks[i][0] );
			// 	}
			// },
			// nextMark: function( context ) {
			// 	var lC = context.modules.linear;
			// 	var next = lC.orderedMarks[lC.orderedMarks.indexOf( lC.currentMark.reference ) + 1];
			// 	if ( next ) {
			// 		modules.linear.fn.jumpToMark( context, next );
			// 	}
			// }, 
			// prevMark: function( context ) {
			// 	var lC = context.modules.linear;
			// 	var prev = lC.orderedMarks[lC.orderedMarks.indexOf( lC.currentMark.reference ) - 1];
			// 	if ( prev ) {
			// 		modules.linear.fn.jumpToMark( context, prev );
			// 	}
			// },
			closestMark: function ( context ) {
				var lC = context.modules.linear;
				var retM = lC.scene.objects[0];
				for( var i = 1; i < lC.scene.objects.length; i++ ) {
					var nextM = lC.scene.objects[i];
					var d = Math.abs( lC.scene.camera.position.x - ( nextM.position.x + ( nextM.bWidth / 2 ) ) );
					var lastD = Math.abs( lC.scene.camera.position.x - ( retM.position.x + ( retM.bWidth / 2 ) ) );
					if( d < lastD ) retM = nextM;
				}
				return retM;
			},
			// wrapper for the hit test method that offers preference to the optional curHoveredMark arg
			hoverTest: function( context, x, y, curHoveredMark ) {
				var lC = context.modules.linear;
				// check if we're still over the hover mark
				if( curHoveredMark && 
					curHoveredMark.renderedBounds &&
					x >= curHoveredMark.renderedBounds.minX && 
					x <= curHoveredMark.renderedBounds.maxX && 
					y >= curHoveredMark.renderedBounds.minY && 
					y <= curHoveredMark.renderedBounds.maxY)
						return curHoveredMark; 
						
				// if that didn't work we need to deffer to hit test
				return modules.linear.fn.hitTest( context, x, y );
			},
			hitTest: function( context, x, y ) {
				var lC = context.modules.linear;
				// loop through displayed marks, see if any match these coords
				for( var i = 0; i < lC.scene.objects.length; i++ ) {
					if( lC.scene.objects[i].renderedBounds &&
						x >= lC.scene.objects[i].renderedBounds.minX && 
						x <= lC.scene.objects[i].renderedBounds.maxX && 
						y >= lC.scene.objects[i].renderedBounds.minY && 
						y <= lC.scene.objects[i].renderedBounds.maxY ) {
						return lC.scene.objects[i];
					}
				}
				return false;
			},
			showMarkInformation: function( context ) {
				var lC = context.modules.linear;
				if( !lC.currentMark ) return false;
				var mark = lC.currentMark;
				// update the information
				$( '#mark-id' ).text( mark.id );
				var d = new Date( mark.time );
				// get our (hopefully) translated month abbreviation
				var dateString = [];
				dateString.push( context.fn.getString( 'month-abbreviations', d.getMonth() ) + " " + d.getDate() );
				// dateString.push( $( '#month-abreviations li:eq(' + d.getMonth() + ')' ).text() + " " + d.getDate() );
				dateString.push( d.getHours() + ":" + ( String(d.getMinutes()).length == 1 ? "0" + d.getMinutes() : d.getMinutes() ) );
				if( mark.country_code ) {
					context.fn.withCountryCodes( function ( countries ) { 
						$( '#mark-country' ).text( " / " + countries[mark.country_code] );
					} );
				} else {
					$( '#mark-country' ).text( "" );
				}
				
				// set the contributor name, if we've got it
				if( mark.contributor_name ) {
					$( '#mark-contributor-name' ).text( "- " + mark.contributor_name );
					$( '#mark-flag' ).hide();
					$( '#contributor-quote' )
						.text( mark.extra_info )
						.html( "&#8220;" + $( '#contributor-quote' ).text() + "&#8221;" );
					$( '#contributor-name' )
						.text( "- " + mark.contributor_name );
				} else {
					$( '#mark-contributor-name, #contributor-quote, #contributor-name' ).text( "" );
					$( '#mark-flag' ).show();
				}
				
				$( '#mark-timestamp' ).text( dateString.join( " / " )  );
				$( '#url-share input' ).val( window.location.href ); 
				// update the sharing links
				if (lC.linear_root != "moderate")
				{
					$( '#twitter-share' )
						.data( 'socialShare-context' ).share_params['url'] = window.location.href;
					$( '#facebook-share' )
						.data( 'socialShare-context' ).share_params['u'] = window.location.href;
				}
				//	Update approved state if we're moderating // URK - hate this condition // Watch out // TODO
				if (lC.linear_root == "moderate")
				{
					$("#approve-mark-checkbox").attr('checked', mark.is_approved);
				}
				// give the flag the appropriate class
				if( lC.currentMark.reference in lC.flaggings ) {
					$( '#mark-flag').addClass( 'disabled' );
				} else {
					$( '#mark-flag').removeClass( 'disabled' );
				}
				// animate it in if it's hidden
				$( '#mark-information' ).fadeIn( 'fast' );
			},
			hideMarkInformation: function( context ) {
				$( '#mark-information' ).fadeOut( 'fast' );
			},
			replayCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				var now = ( new Date() ).getTime();
				lC.eventChange = true;
				lC.scene.timers[lC.currentMark.reference] = { 'start': now, 'end': now + lC.currentMark.maxTime, 'speed': 1 };
			},
			flagCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				// if this user has already flagged this mark, return
				if( lC.currentMark.reference in lC.flaggings ) return;
				$.ajax( {
					url: '/requests/flag_mark',
					data: {
						'reference': lC.currentMark.reference
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						// change the flag icon's class
						$( '#mark-flag').addClass( 'disabled' );
						// store the data that this user flagged this mark
						lC.flaggings[lC.currentMark.reference] = true;
						context.fn.storeData( 'markFlaggings', lC.flaggings );
					},
					error: function ( data ) {
						context.fn.showError( lC.errorMsg );
					}
				} );
				
			},
			deleteCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				$.ajax( {
					url: '/requests/delete_mark',
					data: {
						'reference': lC.currentMark.reference
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						
						var deletedMarkReference = lC.currentMark.reference,
							deletedMarkIndex = null;
						//	Delete current mark from marks data
						delete lC.marks[lC.currentMark.reference];
						lC.currentMark = null;
						
						// remove the mark from the scene and reposition the rest
						for ( var i=0; i < lC.scene.objects.length; i++ ) {
							// start at the left and run through until you find the deleted mark
							if( !deletedMarkIndex && lC.scene.objects[i].reference != deletedMarkReference ) continue;
							// remove it
							if( !deletedMarkIndex ) {
								deletedMarkIndex = i;
								lC.scene.objects.splice( i, 1 );
								// set current mark to the next one
								lC.currentMark = lC.scene.objects[i];
							}
							// reposition everything after it
							if ( i == 0 ) {
								lC.scene.objects[i].positionToStart( );
							} else {
								lC.scene.objects[i].positionRelativeTo( lC.scene.objects[i-1] );
							}
						}
						// update the URL
						context.app.setLocation( '#/' + lC.linear_root + '/' + lC.currentMark.reference );
						
						lC.eventChange = true;

					},
					error: function ( data ) {
						// TODO translate this msg
						context.fn.showError( lC.errorMs );
					}
				} );
			},
			approveCurrentMark: function ( context, shouldApprove ) {
				var lC = context.modules.linear;
				$.ajax( {
					url: '/requests/approve_mark',
					data: {
						'reference': lC.currentMark.reference,
						'should_approve': shouldApprove
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						//	Update approved status locally
						lC.currentMark.is_approved = shouldApprove;
					},
					error: function ( data ) {
						context.fn.showError( lC.errorMsg );
					}
				} );
			},
			centerCurrentMark: function( context, callback ) {
				var lC = context.modules.linear;
				if( !lC.currentMark ) return false;
				modules.linear.fn.showMarkInformation( context );
				// stop movement
				lC.cameraChange.aX = 0;
				lC.cameraChange.vX = 0;
				lC.cameraChange.aZ = 0;
				lC.cameraChange.vZ = 0;
				// tween the camera to the mark
				var speed = Math.abs( lC.currentMark.position.x - lC.scene.camera.position.x ) / 2;
				speed = Math.max( 1000, speed );
				
				// var speed = Math.min( 8000, Math.max( 1000, speed) );
				var tween = 'cameraEase' in lC.tweens ? lC.tweens['cameraEase'] : new TWEEN.Tween( lC.scene.camera.position );
				tween
					.to( { 
						x: lC.currentMark.position.x + ( lC.currentMark.bWidth / 2 ), 
						y: lC.currentMark.position.y + ( lC.currentMark.bHeight / 2 ),
						z: lC.currentMark.position.z - 1000 }, speed )
					.onComplete( function( ) {
						delete lC.tweens['cameraEase'];
						if ( typeof callback === "function" ) callback( this );
					} )
					.easing( speed > 1200 ? TWEEN.Easing.Quadratic.EaseInOut : TWEEN.Easing.Quartic.EaseInOut )
					.start();
				lC.tweens['cameraEase'] = tween;
			}
		}
	};
	
	
}( jQuery ) );
( function( $ ) {
	
	var markApp = $.markApp = $.markApp || {};
	var modules = $.markApp.modules = $.markApp.modules || {}; 

	modules.capture = {
		defaults: {
			state: 'intro', // possible values -> intro, drawing, submitting
			invite_code: null,
			locale: null,
			contributor_type: null
		},
		config: {
			captureLimit: 300,
			layerManager: null,
			capturedPoints: 0,
			strokes: [],
			framecount: 0,
			cleanedStrokes: [],
			lastX: null,
			lastY: null,
			captureTime: null,
			rtl: null,
			initialized: false,
			currentStroke: null,
			mark: null,
			timeBetweenStrokes: 400, // the amount of time to pause between strokes
			events: []  // unexecuted events we bind to times to 
		},
		// Event handlers
		evt: {
			resize: function ( context, e ) {
				var lC = context.modules.capture;
				lC.layerManager.resizeAll( context.width, context.height );
				// redraw all marks
				if( lC.mark && lC.mark.strokes.length > 0 ) {
					for( var i = 0; i < lC.mark.strokes.length; i++ ) {
						modules.capture.fn.drawStroke( context, lC.mark.strokes[i] );
					}
				}
			},
			mousemove: function( context, e ) {
				if ( context.mouseDown && context.modules.capture.state == "drawing" )
					modules.capture.fn.capturePoint( context );
			},
			mousedown: function( context, e ) {
				switch ( context.modules.capture.state ) {
					case "drawing":
						// close the country select if it's open 
						if( $( '#location-dialog' ).is( ':visible' ) ) {
							$( '#location-dialog' )
								.fadeOut( 'fast' );
						}
						// start a new mark if we need to
						if( !context.modules.capture.mark ) modules.capture.fn.startMark( context );
						// start a new stroke unless we already have a stroke open for some reason
						if( !context.modules.capture.currentStroke ) modules.capture.fn.startStroke( context );
						break;
					case "intro":
						// start a new mark if we need to
						if( !context.modules.capture.mark ) modules.capture.fn.startMark( context );
						// start a new stroke unless we already have a stroke open for some reason
						if( !context.modules.capture.currentStroke ) modules.capture.fn.startStroke( context );
						modules.capture.fn.endIntro( context );
						
						break;
				}
			},
			mouseup: function( context, e ) {
				if( context.modules.capture.state == "drawing" ) {
					modules.capture.fn.endStroke( context );
				}
			},
			ready: function ( context, e ) {
				var lC = context.modules.capture;				
				// hide errything
				$( '#markmaker' )
					.hide()
					.children()
					.hide();
				// template dom is ready
				$( '#markmaker-reset a' )
					.addClass( 'disabled' )
					.bind( 'mousedown', function( e ) {
						e.preventDefault();
						modules.capture.fn.reset( context );
					} );
				$( '#markmaker-submit a' )
					.addClass( 'disabled' )
					.bind( 'mousedown', function( e ) {
						e.preventDefault();
						modules.capture.fn.submit( context );
					} );
				// load the country codes into the dialog
				context.fn.withCountryCodes( function ( countryCodes ) {
					var $select = $( '#markmaker-country' );
					for( var i = 0; i < countryCodes.length; i++ ) {
						var $option = $( '<option />' )
							.val( countryCodes[i].code )
							.text( countryCodes[i].name );
						$select.append( $option );
					}
				} );
				$( '#markmaker-location a' )
					.bind( 'mousedown', {context: context}, modules.capture.fn.locationDialogToggle );
				$( '#markmaker-information' )
					.bind( 'mouseover', {context: context}, modules.capture.fn.informationDialogToggle )
					.bind( 'mouseout', {context: context}, modules.capture.fn.informationDialogToggle );
				if ( lC.state == "drawing" ) {
					modules.capture.fn.initDrawing( context );
				}
				
				
				$("#sammy #markmaker-country").selectBox({ autoWidth: false });
				
				
			},
			loop: function ( context, e ) {
				var lC = context.modules.capture;
				if ( !lC.initialized ) return;
				// increment the frame counter
				lC.frameCount++;
				// Draw the cursor
				modules.capture.fn.commonLoop( context );
				// state specific code
				switch( context.modules.capture.state ) {
					case "drawing":
						modules.capture.fn.drawLoop( context );
						break;
				}
			}
		},
		fn: {
			init: function ( context, options ) {
				var lC = context.modules.capture;
								
				// if we've already set the interface up, just reset it
				if ( '$capture' in lC ) {
					// FIXME -- this reinit portion could use some love
					if( 'state' in options ) {
						modules.capture.fn.reset( context );
						if ( options['state'] == 'drawing' ) {
							if( context.mouseDown )
								context.fn.trigger( 'mousedown' );
						}
						lC.state = options['state'];
						modules.capture.fn.initDrawing( context );
					}
				} else {
					// allow defaults to be overriden
					$.extend( lC, modules.capture.defaults );
					$.extend( lC, options );
					// but not the cofig
					$.extend( lC, modules.capture.config );
					// DOM setup
					lC.$capture = $( '<div />' )
						.addClass( "capture-container" );
					context.$container
						.css( { 'zIndex': 100, 'cursor': 'none' } )
						.append( lC.$capture );

					lC.layerManager = new Mark.layerManager( lC.$capture.get( 0 ) );

					// add two layers for the interface to use
					lC.layerManager.addLayer( 'drawnLayer' );
					lC.layerManager.addLayer( 'liveDrawingLayer' );

					// trigger resize so our new layers are sized to fit
					context.fn.trigger( 'resize' );
					
					lC.initialized = true;
				}
			},
			deinit: function( context ) {
				var lC = context.modules.capture;
				// fade out our container
				lC.$capture.fadeOut( 'fast', function () {
					// remove all our layers
					lC.layerManager.removeAll();
					lC.$capture.remove();
					lC.initialized = false;
				} );
			},
			initIntro: function ( context ) {
				
			},
			initDrawing: function ( context ) {
				var lC = context.modules.capture;
				// hide any intro stuff that might be being displayed
				if( $( '#browse-marks' ).is( ':visible' ) ) {
					$( '#browse-marks, #click-anywhere, #intro-main-copy' )
						.fadeOut( 'fast' );
					$( '#markmaker-legal-line' ).fadeIn( 'slow' );
				} 
				$( '#markmaker' ).css( 'background-position', '0 ' + ( context.height - 140 ) + 'px' );
				// update our resize handler 
				$( '#markmaker' )
					.unbind( 'resize.markApp' )
					.bind( 'resize.markApp', function ( e, w, h ) {
						$( '#markmaker' ).css( 'background-position', '0 ' + ( context.height - 140 ) + 'px' );
						
						// if there are dialogs open, reposition them
						if( $( '#location-dialog:visible').size() > 0  ) {
							$( '#location-dialog:visible' )
								.css( {
									'bottom': $( '#markmaker-location' ).height() + 25,
									'left':  $( '#markmaker-location' ).offset().left + 32
								} );
						}
					} );
				if( !$( '#markmaker' ).is( ':visible' ) ) {
					$( '#markmaker' )
						.width( 0 )
						.show()
						.animate( { 'width': context.width }, 'slow', function () {
							$( '#markmaker-controls' ).fadeIn( 'slow', function() {
								$( '#markmaker-information' ).fadeIn( 'slow' );
							} );
							$( '#markmaker-legal-line' ).fadeIn( 'slow' );
						} );
				} else {
					$( '#markmaker-controls' ).fadeIn( 'slow', function() {
						$( '#markmaker-information' ).fadeIn( 'slow' );
					} );
				}
				
				// special cases
				if ( lC.invite_code && lC.contributor_type == "t" ) {
					lC.captureLimit = 1000;
					lC.$capture.addClass( 'translator' );
					$( '#translator-fields' )
						.find( '#translator-locale' )
							.text( "'" + context.locale + "'" )
							.end()
						.collapsibleMod( )
						.fadeIn( 'slow' );
				} else if ( lC.invite_code && lC.contributor_type == "c" ) {
					lC.$capture.addClass( 'contributor' );
					$( '#contributor-fields' )
						.collapsibleMod( )
						.fadeIn( 'slow' );
				}
			},
			// fades out the intro content and switches into drawing mode
			endIntro: function ( context ) {
				var lC = context.modules.capture;
				// switch to drawing mode
				context.app.setLocation( '#/mark/new' );
			},
			locationDialogToggle: function ( e, context ) {
				e.preventDefault();
				if( $( '#location-dialog' ).is( ':visible' ) ) {
					$( '#location-dialog' )
						.fadeOut( 'fast' );
				} else {
					$( '#location-dialog' )
						.fadeIn( 'fast' )
						.css( {
							'bottom': $( '#markmaker-location' ).height() + 25,
							'left':  $( '#markmaker-location' ).offset().left + 32
						} );
				}
			},
			informationDialogToggle: function ( e, context ) {
				e.preventDefault();
				if( e.type == "mouseout") {
					$( '#information-dialog' )
						.fadeOut( 'fast' );
				} else {
					$( '#information-dialog' )
						.fadeIn( 'fast' )
						.css( {
							'bottom': $( '#markmaker-information' ).height() + 36,
							'left':  $( '#markmaker-information' ).offset().left - $( '#information-dialog' ).width() + 30
						} );
				}
			},
			startMark: function ( context ) {
				var lC = context.modules.capture;
				// setup the mark
				lC.captureTime = ( new Date() ).getTime();
				lC.rtl = context.mouseX > $( window ).width() / 2;
				lC.mark = new Mark.gmlMark( [], '', '', lC.captureTime, lC.rtl );
				// remove the disabled styling from the submit and reset buttons
				$( '#markmaker-submit a, #markmaker-reset a' ).removeClass( 'disabled' );
			},
			endMark: function ( context ) {
				var lC = context.modules.capture;
				// close out the mark and prep for submission
				lC.mark.setupVars();
			},
			startStroke: function ( context ) {
				// start a new, empty stroke
				var lC = context.modules.capture;
				lC.currentStroke = [];
				// set the time relative to the last stroke, plus an offset
				if( lC.strokes.length > 0 )
					lC.captureTime = ( new Date() ).getTime() - 
						( lC.strokes[lC.strokes.length - 1][lC.strokes[lC.strokes.length - 1].length - 1].time + lC.timeBetweenStrokes );
			},
			endStroke: function ( context ) {
				var lC = context.modules.capture;
				// ignore strokes with less than three points
				if ( lC.currentStroke.length > 2 ) {
					// close out this stroke
					lC.strokes.push( lC.currentStroke );
					// run the simplification algorithim
					var simpStroke = Mark.simplification.simplifyPath( lC.currentStroke, 1 );
					// run the weighting algorithm 
					simpStroke = Mark.simplification.weightPath( simpStroke, [5,10,20,40] );
					lC.mark.strokes.push( simpStroke );
					lC.cleanedStrokes.push( simpStroke );
					// draw this stroke the to drawn layer
					modules.capture.fn.drawStroke( context, simpStroke );
					// recalculate the captured point count
					lC.capturedPoints -= lC.currentStroke.length - simpStroke.length;
				}
				// set the currentStroke to null 
				lC.currentStroke = null;
			},
			capturePoint: function ( context ) {
				var lC = context.modules.capture;
				if( lC.capturedPoints > lC.captureLimit ) {
					context.fn.trigger( 'mouseup' );
					modules.capture.fn.closeShop( context );
					return;
				}
				var time = ( new Date() ).getTime();
				// create a new point and add it to the current stroke
				var point = new Mark.gmlPoint( context.mouseX, context.mouseY, time - lC.captureTime, 0 );
				if( lC.currentStroke.length > 0 ) {
					var lastPoint = lC.currentStroke[lC.currentStroke.length - 1];
					point.speed = lastPoint.speedToPoint( point );
					point.setAngleFromPoint( lastPoint );
					point.smoothAgainst( lastPoint, 1/100 );
				} else {
					// if this isn't the first stroke, draw a connecting line
					if( lC.strokes.length >= 1 ) {
						modules.capture.fn.drawGuide( lC.layerManager.layers['drawnLayer'].context, lC.lastX, lC.lastY, point.x, point.y );
					}
				}
				lC.currentStroke.push( point );
				lC.lastX = point.x;
				lC.lastY = point.y;
			
				// increment our total points counter
				lC.capturedPoints++;
			},
			reset: function ( context ) {
				var lC = context.modules.capture;
				lC.layerManager.layers['liveDrawingLayer'].clean();
				lC.layerManager.layers['drawnLayer'].clean();
				lC.capturedPoints = 0;
				lC.rtl = null;
				lC.mouseDown = false
				lC.lastX = null;
				lC.lastY = null;
				lC.strokes = [];
				lC.currentStroke = null;
				lC.mark = null;
				lC.captureTime = null;
				lC.state = "drawing";
				$( '#markmaker-submit a, #markmaker-reset a' ).addClass( 'disabled' );
				$( '#markapp' ).css( { 'cursor': 'none' } );
				$( '#markmaker-instructions' ).fadeIn();
			},
			closeShop: function( context ) {
				var lC = context.modules.capture;
				lC.state = 'preview';
				// close the mark
				modules.capture.fn.endMark( context );
				// clear the drawing layer
				lC.layerManager.layers['liveDrawingLayer'].clean();
				// if the user is out of points, draw the line to the opposite side of the screen
				var g = lC.layerManager.layers['liveDrawingLayer'].context,
					x = lC.lastX,
					y = lC.lastY;
				g.strokeStyle = 'rgba(0,0,0,0.2)';
				g.lineWidth = 1;
				g.beginPath();
				g.dashedLineTo( x, y, lC.rtl ? 0 : lC.layerManager.layers['liveDrawingLayer'].canvas.width, y, [7, 5] );
				g.closePath();
				g.stroke();
				// set our cursor back to normal
				$( '#markapp' ).css( { 'cursor': 'default' } );
			},
			submit: function( context ) {
				var lC = context.modules.capture;
				if( lC.state == "submitting" ) return;
				if( lC.state != "preview" ) modules.capture.fn.closeShop( context );
				// process our points, and send them off
				lC.state = "submitting";
				$( '#markmaker-submit a' ).addClass( 'disabled' );
				var data = {};
				data.rtl = lC.rtl;
				data.strokes = lC.strokes;
				//data.locale = cfg.locale; // TODO - impliment location awareness
				var points_obj = JSON.stringify( data );
				var points_obj_simplified = JSON.stringify( lC.mark );
				var country_code = $( '#markmaker-country' ).val() == "label" ? "" : $( '#markmaker-country' ).val();
				// show loader
				context.fn.showLoader( context.fn.getString( 'submitting-mark' ) );
				var params = {
					'points_obj': points_obj,
					'points_obj_simplified': points_obj_simplified,
					'country_code': country_code
				};
				if ( lC.invite_code && lC.contributor_type == "t" ) {
					params.contributor_locale = context.locale;
					params.invite = lC.invite_code;
				} else if (lC.invite_code && lC.contributor_type == "c" ) {
					params.contributor = $( '#contributor-name' ).val();
					// add the quote as the marks extra_info
					lC.mark.extra_info = $( '#contributor-quote' ).val();
					// re-stringify our points obj
					params.points_obj_simplified = JSON.stringify( lC.mark );
					params.invite = lC.invite_code;
				}
				$.ajax( {
					url: '/requests/save_mark',
					data: params,
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						// if we submitted a locale, the mark wont be in the line, so just start at the beginning
						if ( params.contributor_locale ) {
							context.app.setLocation( '#/linear/' );
							context.fn.hideLoader();
						} else {
							// store the users mark for later access
							context.fn.storeData( 'userMark', { 'reference': data.mark_reference, 'country_code': country_code } );
							// now tell the app to redirect to our FRESH mark
							context.app.setLocation( '#/linear/'+ data.mark_reference + '?playback=true' );
							// hide loader
							context.fn.hideLoader();
						}

					},
					error: function( data ) {
						context.fn.showError( context.fn.getString( 'submit-error' ) );
					}
				} );
				return false;
			},
			drawStroke: function ( context, stroke ) { 
				var lC = context.modules.capture;
				Mark.thickBrush( lC.layerManager.layers['drawnLayer'].context, [stroke] );
				lC.layerManager.layers['drawnLayer'].context.fillStyle = "rgba(255,255,255,0.3)";
				lC.layerManager.layers['drawnLayer'].context.strokeStyle = "rgba(255,255,255,0.3)";
				Mark.circleBrush( lC.layerManager.layers['drawnLayer'].context, [stroke] );
			},
			drawGuide: function( g, x1, y1, x2, y2 ) {
				g.strokeStyle = 'rgba(0,0,0,0.2)';
				g.lineWidth = 1;
				g.beginPath();
				g.dashedLineTo( x1, y1, x2, y2, [7, 5] );
				g.closePath();
				g.stroke();
			},
			drawCursor: function ( g, x, y, per ) {
				g.strokeStyle = '#ff5400';
				g.fillStyle = '#000000';
				// draw stroke
				g.beginPath();
				g.moveTo( x, y );
				g.lineTo( x + 1, y - 8 );
				g.lineTo( x + 20, y - 27 );
				g.lineTo( x + 23, y - 23 );
				g.lineTo( x, y );
				g.closePath();
				g.stroke();
				// draw filling
				per *= 18.5;
				per += 4.5;
				g.beginPath();
				g.moveTo( x, y );
				g.lineTo( x + 1, y - 8 );
				g.lineTo( x + ( per - 3 ), y - ( per + 4 ) );
				g.lineTo( x + per, y - per );
				g.lineTo( x, y );
				g.closePath();
				g.fill();
			},
			commonLoop: function( context ) {
				var lC = context.modules.capture;
				
				// clear the drawing layer
				lC.layerManager.layers['liveDrawingLayer'].clean();
				
				// draw the cursor if the cursor is in the frame
				if( context.mouseIn && ( lC.state == "drawing" || lC.state == "intro" ) ) {
					modules.capture.fn.drawCursor( lC.layerManager.layers['liveDrawingLayer'].context, context.mouseX, context.mouseY, ( lC.captureLimit - lC.capturedPoints ) / lC.captureLimit  );
				}
			},
			introLoop: function( context ) {
				
			},
			drawLoop: function( context ) {
				var lC = context.modules.capture;
				// Clean the drawing layer
				if( lC.currentStroke && lC.currentStroke.length > 0 ) {
					// draw out what we've got in the stroke buffer
					Mark.thickBrush( lC.layerManager.layers['liveDrawingLayer'].context, [lC.currentStroke] );
					lC.layerManager.layers['liveDrawingLayer'].context.fillStyle = "rgba(255,255,255,0.3)";
					lC.layerManager.layers['liveDrawingLayer'].context.strokeStyle = "rgba(255,255,255,0.3)";
					Mark.circleBrush( lC.layerManager.layers['liveDrawingLayer'].context, [lC.currentStroke] );
				}
				if( ! context.mouseIn ) return;
				if( ! context.mouseDown ) {
					// draw the guide
					var x, y;
					if( lC.strokes.length == 0 ) {
						x = context.mouseX > $( window ).width() / 2 ? lC.layerManager.layers['liveDrawingLayer'].canvas.width : 0,
						y = context.mouseY;
					} else {
						x = lC.lastX;
						y = lC.lastY;
					}
					modules.capture.fn.drawGuide( lC.layerManager.layers['liveDrawingLayer'].context, x, y, context.mouseX, context.mouseY );
				}
				
			}
		}
	};
	
}( jQuery ) );
( function( $ ) {
	
	// support loose augmentation
	markApp = $.markApp = $.markApp || {};
	modules = $.markApp.modules = $.markApp.modules || {};
	
	// Code for introducing the site. 
	// runs quickly, then unloads
	// store all data in a flat json file that django recompiles after a new intro mark is added 
	modules.intro = {
		defaults: {
			// optional reference mark -- will init the visualization on this mark if passed
			reference_mark: null
		},
		config: {
			// all marks held here
			marks: {},
			animationMarks: ['vVR', 'myWb'],
			playbackTimes: {},
			vizScene: null, // for rendering the viz preview
			textScene: null, // for rendering tahe extra text 
			// layer manager
			layerManager: null,
			// boolean flag to indicate if this module is fully setup
			initialized: false,
			eventChange: false,
			curLocaleMark: null,
			animationComplete: false,
			tweens: {}
		},
		evt: {
			resize: function( context, e ) {
				context.modules.intro.layerManager.resizeAll( context.width, context.height );
				context.modules.intro.eventChange = true;
				
				if ( context.modules.intro.xAnimationComplete ) {
					// redraw the X
					modules.intro.fn.drawX( context );
					// reposition and redraw the translateMark
					
				}
				
			},
			loop: function ( context, e ) {
				var lC = context.modules.intro;

				// update the position of the camera and draw the viz preview
				TWEEN.update();
				lC.layerManager.layers['viz'].clean();
				Mark.renderer.renderScene( lC.vizScene, { width: context.width, height: context.height } );
				
				if( lC.curLocaleMark || lC.xMark ) {
					lC.layerManager.layers['mainMark'].clean();
					// render the locale mark
					if( lC.curLocaleMark ) {
							var scale = 500 / lC.curLocaleMark.bWidth;
							Mark.renderer.renderMark( 
								lC.layerManager.layers['mainMark'].context, 
								lC.curLocaleMark, 
								{ offset: {x: (context.width / 2) - 115, y: context.height - 240 }, 
									scale: {x: scale, y: scale, thickness: scale},
									color: '255,84,0',
									timer: lC.textScene.timers[lC.curLocaleMark.reference] } );
					}
					if ( lC.xMark ) {
						// RENDER THE X
						var xScale = ( ( ( context.width / 2 ) - 200 ) / lC.xMark.bWidth );
						var yScale = ( ( context.height + 200 ) / lC.xMark.bHeight );
						Mark.renderer.renderMark( 
							lC.layerManager.layers['mainMark'].context, 
							lC.xMark, 
							{ offset: {x: 10, y: -100 }, 
								scale: {x: xScale, y: yScale, thickness: 5},
								color: '0,0,0',
								timer: lC.textScene.timers[lC.xMark.reference] } );
					}
				}
			},
			ready: function( context, e ) {
				$( '#markmaker' )
					.hide()
					.children()
					.hide();
				/* 
				 * Here's the order in which we want to run this intro
				 * 1. quick viz preview with make your mark in varying languages (2 sec)
				 * 2. dotted line animated across the screen as the viz preview fades out ( 1 sec)
				 * 3. big X draws in (2 sec)
				 * 4. dom elements animate up (1 sec)
				 * 5. Make your Mark draws in (4 sec)
				 * 
				 * If any part of this fails, we revert to a simple intro where our intro screens if faded in.
				 *
				 */
				$.when( modules.intro.fn.initInterface( context ), modules.intro.fn.loadMarks( context ) )
						.then( function() { modules.intro.fn.runVizPreview( context ); } )
						.then( function() { modules.intro.fn.startDomAnimation( context ); } )
						.fail( function() { modules.intro.fn.simpleIntro( context ); } );
			}
		},
		fn: {
			init: function( context, options ) {
				var lC = context.modules.intro;
				if ( lC.initialized ) {
					// this module isn't really intended to be reloaded
					// now our options into our context
					$.extend( lC, lC, options );
					// since merging won't replace null or undefined values, make sure we clean up after it
					for( option in modules.intro.defaults ) {
						if ( options[option] == null ) lC[option] = modules.intro.defaults[option];
					}
				} else {
					// allow defaults to be overriden
					$.extend( lC, modules.intro.defaults, options );
					// but not the cofig
					$.extend( lC, lC, modules.intro.config );

					// DOM setup
					lC.$intro = $( '<div />' )
						.addClass( "intro-container" );
					context.$container
						.append( lC.$intro );

					// scene setup
					lC.vizScene = new Mark.scene();
					lC.textScene = new Mark.scene();
					
					// layer setup
					lC.layerManager = new Mark.layerManager( lC.$intro.get( 0 ) );
					// we draw the viz preview to this
					lC.layerManager.addLayer( 'viz' );
					lC.vizScene.canvasContext = lC.layerManager.layers['viz'].context;
					// and then the 'Make Your Mark' on this
					lC.layerManager.addLayer( 'mainMark' );
					lC.textScene.canvasContext = lC.layerManager.layers['mainMark'].context;
					// and for the X
					lC.layerManager.addLayer( 'X' );
					// trigger resize so our new layers are sized to fit
					context.fn.trigger( 'resize' );
					
					lC.initialized = true;
					
				}
			},
			deinit: function( context ) {
				var lC = context.modules.intro;
				lC.$intro.fadeOut( 'fast', function () {
					// remove all our layers
					lC.layerManager.removeAll();
					lC.$intro.remove();
					lC.initialized = false;
				} );
			},
			initInterface: function ( context ) {
				$( '#markmaker' )
					.unbind( 'resize.markApp' )
					.bind( 'resize.markApp', function ( e, w, h ) {
						// reposition the elements
						var rAnchor = ( w / 2 ) + 485;
						var bOffset = ( h - 140 ); // position of the background graphic
						var wasHidden = false;
						$( '#markmaker' ).css( 'background-position', '0 ' + bOffset + 'px' );
						// if these aren't shown yet, do this quick trick
						if( !$( '#markmaker' ).is( ':visible' ) ) {
							wasHidden = true;
							$( '#markmaker, #browse-marks, #click-anywhere, #intro-main-copy' )
								.css( { 'display': 'block' } );
						}
						$( '#browse-marks' )
							.css( { 'top': bOffset - 50, 'left': rAnchor - 85 } );
						$( '#click-anywhere' )
							.css( { 'top': bOffset + 12, 'left': rAnchor - $( '#intro-main-copy' ).width() } );
						$( '#intro-main-copy' )
							.css( { 'top': bOffset - $( '#intro-main-copy' ).height() - 100, 'left': rAnchor - $( '#intro-main-copy' ).width() } );
						if( wasHidden ) {
							$( '#markmaker, #browse-marks, #click-anywhere, #intro-main-copy' )
								.css( { 'display': 'none' } );
						}
					} )
					.trigger( 'resize.markApp', [context.width, context.height] )
					.width( 0 )
					.height( context.height );
					
				
			},
			loadMarks: function( context ) {
				return $.ajax( {
						url: '/requests/get_translated_marks',
						dataType: 'JSON'
					} )
					.success( function ( data ) {
						modules.intro.fn.setupMarks( context, data.marks );
					} );
			},
			setupMarks: function( context, marks ) {
				var lC = context.modules.intro;
				// FXIME - if this is empty, throw an error
				if( typeof marks === "undefined" || marks.length == 0 ) return;
				// set our layer's visiblity to 0
				$( lC.layerManager.layers['viz'].canvas ).css( 'opacity', 0 );
				// sort the marks randomly
				marks.sort( function( a, b ) { return ( Math.round( Math.random() ) - 0.5 ); } );
				// // duplicate marks until we've got 25
				// 			while ( marks.length < 25 ) {
				// 				marks = marks.concat( marks );
				// 			}
				var pMark = null;
				// add them to the scene
				for ( var i = 0; i < marks.length; i++ ) {
					try { 
						var points_obj = JSON.parse( marks[i].points_obj_simplified );
						var mark = new Mark.gmlMark( points_obj.strokes, marks[i].reference, marks[i].country_code, marks[i].date_drawn, points_obj.rtl, marks[i].id, marks[i].is_approved );
						if ( !lC.currentMark ) lC.currentMark = mark;
						// if we dont have a permanant ref to this mark yet, create it
						if( !( marks[i].reference in lC.marks ) ) {
							lC.marks[mark.reference] = mark;
						}
						// position this mark relative to the last one
						if ( pMark ) mark.positionRelativeTo( pMark, false );
						if ( marks[i].contributor_locale == context.locale || !lC.curLocaleMark ) {
							var distantFuture = ( new Date() ).getTime() * 3;
							lC.curLocaleMark = new Mark.gmlMark( points_obj.strokes, marks[i].reference, marks[i].country_code, marks[i].date_drawn, points_obj.rtl, marks[i].id, marks[i].is_approved );
							lC.textScene.timers[lC.curLocaleMark.reference] = { 'start': distantFuture, 'end': distantFuture + lC.curLocaleMark.maxTime, 'speed': 2 };
							
						}
							
						lC.vizScene.objects.push( mark );
						pMark = mark;
					} catch ( e ) {
						// console.warn( "Mark failed import", marks[i].reference );
					}
					
				}
			},
			runVizPreview: function ( context ) {
				var lC = context.modules.intro;
				// can't do this on less than three marks
				if( lC.vizScene.objects.length < 3 ) return;
				// move the camera way back
				lC.vizScene.camera.position.x = -2000;
				lC.vizScene.camera.position.z = -3000;
				var targetMark = lC.vizScene.objects[lC.vizScene.objects.length - 2];
				// tween the camera on down the line
				var tween = new TWEEN.Tween( lC.vizScene.camera.position );
				tween
					.to( { 
						x: targetMark.position.x + (targetMark.bWidth / 2),
						y: targetMark.position.y + (targetMark.bHeight / 2),
						z: targetMark.position.z - 2000 }, 6000 )
					.onComplete( function( ) {
						delete lC.tweens['cameraEase'];
					} )
					.easing( TWEEN.Easing.Quartic.EaseInOut )
					.start();
				lC.tweens['cameraEase'] = tween;
				$( lC.layerManager.layers['viz'].canvas )
					.animate( { opacity: '1' }, 'slow' )
					.delay( 2000 )
					.animate( { opacity: '0.1'}, 'slow' );
				// delay the dom animation
				$( '#markmaker' )
					.delay( 3000 );
			},
			startDomAnimation: function ( context ) {
				var lC = context.modules.intro;
				$( '#markmaker' )
				.width( 0 )
				.show()
				.animate( { 'width': context.width }, 'slow', function () {
					modules.intro.fn.startMarkAnimations( context );
					$( '#intro-main-copy' ).fadeIn( 'slow' );
					$( '#click-anywhere' ).delay( 200 ).fadeIn( 'slow' );
					$( '#browse-marks' ).delay( 100 ).fadeIn( 'slow' );
				} );
			},
			startMarkAnimations: function ( context ) {
				var lC = context.modules.intro;
				modules.intro.fn.drawX( context );
				// start drawing the translated mark
				if( lC.curLocaleMark ) {
					var now = ( new Date() ).getTime() + 2000;
					lC.textScene.timers[lC.curLocaleMark.reference] = { 'start': now, 'end': now + lC.curLocaleMark.maxTime, 'speed': 2 };
				}
			},
			drawX: function ( context ) {
				var lC = context.modules.intro;
				// draw the X, with hardcoded data? good idea? maybe?
				var xMarkData = {"strokes":[[{"x":177,"y":0,"z":0,"time":51,"speed":0,"angle":0,"significance":5},{"x":129,"y":60,"z":0,"time":255,"speed":0.45069390943299864,"angle":0.5880026035475675,"significance":1},{"x":123,"y":65,"z":0,"time":271,"speed":0.4931203163041915,"angle":0.7853981633974483,"significance":1},{"x":103,"y":89,"z":0,"time":339,"speed":0.45069390943299864,"angle":0.5880026035475675,"significance":1},{"x":56,"y":139,"z":0,"time":503,"speed":0.45073896963561083,"angle":0.7853981633974483,"significance":1},{"x":38,"y":162,"z":0,"time":584,"speed":0.3572203090978693,"angle":0.46364760900080615,"significance":1},{"x":9,"y":192,"z":0,"time":691,"speed":0.3535533905932738,"angle":0.7853981633974483,"significance":1},{"x":0,"y":206,"z":0,"time":727,"speed":0.45069390943299864,"angle":0.5880026035475675,"significance":5}],[{"x":11,"y":23,"z":0,"time":1178,"speed":0,"angle":0,"significance":5},{"x":30,"y":49,"z":0,"time":1246,"speed":0.32424352695503,"angle":5.639684198386302,"significance":1},{"x":55,"y":77,"z":0,"time":1321,"speed":0.48790367901871773,"angle":5.497787143782138,"significance":1},{"x":72,"y":100,"z":0,"time":1367,"speed":0.5216642390945547,"angle":5.695182703632019,"significance":1},{"x":85,"y":113,"z":0,"time":1408,"speed":0.5355917833779965,"angle":5.497787143782138,"significance":2},{"x":154,"y":175,"z":0,"time":1662,"speed":0.3311927108182759,"angle":5.497787143782138,"significance":1},{"x":186,"y":196,"z":0,"time":1802,"speed":0.2849548128987055,"angle":5.497787143782138,"significance":5}]],"country_code":"","time":1300925747439,"rtl":false,"maxTime":1802,"reference":"","hoverState":false,"renderedBounds":null,"id":null,"contributor_name":null,"extra_info":null,"color":"0,0,0","hoverColor":"0,139,211","x":454,"y":199,"position":{"x":0,"y":0,"z":0},"rotationAngle":{"x":0,"y":0,"z":0},"sX":0,"sY":0,"bWidth":186,"bHeight":206};
				
				lC.xMark = new Mark.gmlMark( xMarkData.strokes, "xMark" );
				
				lC.textScene.objects.push( lC.xMark ); 
				var now = ( new Date() ).getTime();
				lC.textScene.timers[lC.xMark.reference] = { 'start': now, 'end': now + lC.xMark.maxTime, 'speed': 1 };
			},
			// fallback function that doesn't bother with anything but the DOM elements
			simpleIntro: function ( context ) {
				var lC = context.modules.intro;
				$( '#markmaker' )
				.width( 0 )
				.show()
				.animate( { 'width': context.width }, 'slow', function () {
					$( '#intro-main-copy' ).fadeIn( 'slow' );
					$( '#click-anywhere' ).delay( 200 ).fadeIn( 'slow' );
					$( '#browse-marks' ).delay( 100 ).fadeIn( 'slow' );
				} );
			}
		}
	};
}( jQuery ) );
(function( $ ) {
/**
 * Function that escapes spaces in event names. This is needed because
 * "_delayedBind-foo bar-1000" refers to two events
 */
function encodeEvent( event ) {
	return event.replace( /-/g, '--' ).replace( / /g, '-' );
}

$.fn.extend( {
	/**
	 * Bind a callback to an event in a delayed fashion.
	 * In detail, this means that the callback will be called a certain
	 * time after the event fires, but the timer is reset every time
	 * the event fires.
	 * @param timeout Number of milliseconds to wait
	 * @param event Name of the event (string)
	 * @param data Data to pass to the event handler (optional)
	 * @param callback Function to call
	 */
	delayedBind: function( timeout, event, data, callback ) {
		var encEvent = encodeEvent( event );
		return this.each( function() {
			var that = this;
			// Bind the top half
			// Do this only once for every (event, timeout) pair
			if (  !( $(this).data( '_delayedBindBound-' + encEvent + '-' + timeout ) ) ) {
				$(this).data( '_delayedBindBound-' + encEvent + '-' + timeout, true );
				$(this).bind( event, function() {
					var timerID = $(this).data( '_delayedBindTimerID-' + encEvent + '-' + timeout );
					// Cancel the running timer
					if ( typeof timerID != 'undefined' )
						clearTimeout( timerID );
					timerID = setTimeout( function() {
						$(that).trigger( '_delayedBind-' + encEvent + '-' + timeout );
					}, timeout );
					$(this).data( '_delayedBindTimerID-' + encEvent + '-' + timeout, timerID );
				} );
			}
			
			// Bottom half
			$(this).bind( '_delayedBind-' + encEvent + '-' + timeout, data, callback );
		} );
	},
	
	/**
	 * Cancel the timers for delayed events on the selected elements.
	 */
	delayedBindCancel: function( timeout, event ) {
		var encEvent = encodeEvent( event );
		return this.each( function() {
			var timerID = $(this).data( '_delayedBindTimerID-' + encEvent + '-' + timeout );
			if ( typeof timerID != 'undefined' )
				clearTimeout( timerID );
		} );
	},
	
	/**
	 * Unbind an event bound with delayedBind()
	 */
	delayedBindUnbind: function( timeout, event, callback ) {
		var encEvent = encodeEvent( event );
		return this.each( function() {
			$(this).unbind( '_delayedBind-' + encEvent + '-' + timeout, callback );
		} );
	}
} );
} )( jQuery );

/*
 * makes divs with an h3 and a ul collapse. Not very useful for other things.
 * 
*/
(function($) {
	
	$.collapsibleMod = {
		cfg: {
			'collapsedClass': 'collapsibleMod-collapsed',
			'expandedClass': 'collapsibleMod-expanded',
			'$header': null,
			'expandedHeight': 0,
			'collapsedHeight': 0,
			'$content': null,
			'collapsed': false,
			'stateKey': '',
			'saveState': true // when set to true, and the container ele has an id, we'll attempt to save the state between requests
		},
		fn: {
			'init': function ( container, options ) {
				var $this = $( container );
				var context = $.extend({}, $.collapsibleMod.cfg, options );
				
				context.$container = $this;
				context.$header = $this.find( 'h3:first' );
				context.$content = $this.children().not( 'h3:first' );
				
				// save our height to expand to
				context.expandedHeight = context.$content.height();
				
				context.$header.bind( 'click', function( e ) {
					e.preventDefault();
					$.collapsibleMod.fn.toggle( context );
				} );
				
				// setup state saving
				if( context.saveState && context.$container.attr( 'id' ) != "" && typeof localStorage != 'undefined' ) {
					context.stateKey = 'collapsibleMod-state-' + context.$container.attr( 'id' );
					$.collapsibleMod.fn.restoreState( context );
				} else {
					context.saveState = false;
				}
				
				if ( context.collapsed ) {
					$.collapsibleMod.fn.collapse( context );
				} else {
					context.$container
						.addClass( context.expandedClass );
				}
				
				$this.data( 'collapsibleMod-context', context );
			},
			'collapse': function ( context ) {
				context.$container
					.addClass( context.collapsedClass )
					.removeClass( context.expandedClass );
				context.$content
					.animate( { 'height': context.collapsedHeight }, 'fast', function() {
						if ( context.collapsedHeight == 0 )
							context.$content.hide();
					} );
				context.collapsed = true;
				$.collapsibleMod.fn.saveState( context );
			},
			'expand': function ( context ) {
				context.$container
					.removeClass( context.collapsedClass )
					.addClass( context.expandedClass );
					context.$content
						.show()
						.animate( { 'height': context.expandedHeight }, 'fast' );
				context.collapsed = false;
				$.collapsibleMod.fn.saveState( context );
			},
			'saveState': function( context ) {
				if( context.saveState ) {
					try {
						localStorage.removeItem( context.stateKey );
						localStorage.setItem( context.stateKey, context.collapsed );
					} catch (e) {
					 	 if ( e == QUOTA_EXCEEDED_ERR ) { /* data wasn't successfully saved due to quota exceed */ }
					}
				}
			},
			'restoreState': function( context ) {
				if ( context.saveState && localStorage.getItem( context.stateKey ) ) {
					context.collapsed = ( localStorage.getItem( context.stateKey ) === 'true' ) ;
				}
			},
			'toggle': function ( context ) {
				context.collapsed ? $.collapsibleMod.fn.expand( context ) : $.collapsibleMod.fn.collapse( context );
			}
		}
	};
	
	$.fn.collapsibleMod = function ( options ) {
		return $( this ).each( function () {
			$.collapsibleMod.fn.init( this, options );
		} );
	};
	
})(jQuery);

/*
 * A generic plugin to assist with those pesky social media buttons.
 * 
 * Actually, you know what? This is more basic than that. It just opens up a new window with the dimensions you specify
 * and the URL you specify, with the GET params you specify.
 * 
 * That just happens to be the basic functionality you need to impliment a twitter or facebook share button. 
 * 
 * EXAMPLE:
 * $( '#twitter-share' ).socialShare( { 
 *   'share_url': 'http://twitter.com/share', 
 *   'share_params': { 'text': 'Wow. I love this website. Check. It. Out', 'url': 'http://thegreatestwebsiteever.com/' }
 *   } );
 *
 * USEFUL FACEBOOK INFO: 
 * - url: http://www.facebook.com/sharer.php
 * - required params: 
 *		- u: the url you want to share
 *		- t: the title of the link you want to share
 *
 * USEFUL TWITTER INFO: 
 * - url: http://twitter.com/share
 * - params:
 *		- url: the url you want to share
 *		- text: the message you want to tweet with this url
 *		- via: your twitter account, w/o the @, if you want attributed
 *		- related: a related account. Can also format it with a title like 'adammiller: People who dislike social media buttons'
 * 
*/
( function( $ ) {
	
	$.socialShare = {
		cfg: {
			'$link': null,
			'share_url': 'http://twitter.com/share',
			'share_title': 'Share on Twitter',
			'share_params': {},
			'popupWidth': 550,
			'popupHeight': 450
		},
		fn: {
			'init': function ( container, options ) {
				var $this = $( container );
				var context = $.extend( {}, $.socialShare.cfg, options );
				
				context.$link = $this;
				
				context.$link.bind( 'click', function( e ) {
					e.preventDefault();
					$.socialShare.fn.share( context );
				} );
				
				$this.data( 'socialShare-context', context );
			},
			'shareURL': function ( context ){
				var params = [];
				for( param in context.share_params ) {
					params.push( param + '=' + encodeURIComponent( context.share_params[param] ) );
				}
				return context.share_url + '?' + params.join( "&" );
			},
			'share': function ( context ) {
				// open the pop up
				window.open(
					$.socialShare.fn.shareURL( context ),
					context.share_title,
					'height=' + context.popupHeight + ',width=' + context.popupWidth
				);
			}
		}
	};
	
	$.fn.socialShare = function( options ) {
		return $( this ).each( function () {
			$.socialShare.fn.init( this, options );
		} );
	};
	
} )( jQuery );

/*
	
	jQuery selectBox (version 0.1.6)
	
		A cosmetic, styleable replacement for SELECT elements
		
		Homepage:   http://abeautifulsite.net/blog/2011/01/jquery-selectbox-plugin/
		Demo page:  http://labs.abeautifulsite.net/projects/js/jquery/selectBox/
		
		Copyright 2011 A Beautiful Site, LLC.
	
	
	License:
		
		Licensed under both the MIT license and the GNU GPL (same as jQuery)
	
	
	Usage:
		
		Link to the JS file:
			
			<script src="jquery.ui-selectbox.min.js" type="text/javascript"></script>
		
		Add the CSS file (or append contents of your own):
		
			<link href="jquery.ui-selectbox.css" rel="stylesheet" type="text/css" />
		
		To create:
			
			$("SELECT").selectBox()
			
		To create with options:
			
			$("SELECT").selectBox({
				autoWidth: [true|false]
			});
		
		To destroy:
		
			$("SELECT").selectBox('destroy');
			
		To update the options on the fly:
			
			$("SELECT").selectBox('setOptions', {
				
				// Options are created like this
				'value' : 'displayText',
				'value' : 'displayText',
				
				// Optgroups are created like this
				'optgroupLabel' : {
					'value' : 'displayText',
					'value' : 'displayText'
				}
				
			});
		
		To change the value:
		
			$("SELECT").selectBox('value', 'optionValue');
		
		Note: you can use any valid selector in lieu of "SELECT".
	
	
	Events:
		
		The focus, blur, and change events fire on the *orignal* SELECT element.
	
	
	Freebies:
		
		- Includes keyboard support (tab in/out, arrows, page up/down, home/end, enter/esc)
		
		- Supports jQuery UI .ui-corner-x classes (http://jqueryui.com/docs/Theming/API#Corner_Radius_helpers)
		
		- Uses CSS3 techniques (fully customizable via CSS)
	
	
	Change log:
	
		v0.1 (2011-01-24)   - Initial release
		v0.1.1 (2011-02-09)   - Added setOptions method for changing options on the fly
						    - UI control now inherits all classes of the original control
		v0.1.2 (2011-02-23) - UI control now inherits the style and title attribute of the original control
		v0.1.3 (2011-02-24) - Added autoWidth option to simulate default browser behavior; fixed bug
		                      that caused the UI control to display as inline instead of inline-block 
		                      after destroy/create; fixed version numbers (old 0.2 = 0.1.1, old 0.3 = 0.1.2)
		v0.1.4 (2011-02-25) - Added 'value' method; added return $(this) to setOptions method
		v0.1.5 (2011-03-11) - Fixed bug where special HTML characters did not get escaped properly in the UI control
		v0.1.6 (2011-03-21) - Fixed bug where initial settings were forgotten when setOptions was called
		
	Known issues:
		
		- The change event fires every time an option is changed using the keyboard. This differs
		  from the way change events occur on normal select elements (on blur).
		
		- Disabled controls will technically accept focus (but no event will be trigger) when tabbed 
		  over. This differs from the default browser behavior where the control would normally be 
		  skipped.
		
		- If using the keyboard while the mouse is hovering over the dropdown, the hover events
		  sometimes conflict making it seem like the keyboard selection is buggy (move the mouse 
		  out and the behavior goes away)
		  
		- The plugin cannot poll for changes to the original control (i.e. disabling it dynamically). 
		  Since the dropdown gets re-generated each time it is shown, this isn't an issue with 
		  optgroups and options. Calling scripts should be aware of this.
		  
		- Safari doesn't currently allow focus via tabbing (Chrome does; possible WebKit bug?)
		  
		- Does not support multiple="multiple"
		 
		- Not tested in IE6
	
		
	Wish list:
		
		- Enforce that dropdowns always appear in the viewport
		
		- Predictive selection (auto-selecting of elements while typing)
		  
		  Issue: keypress doesn't fire on non-input elements (only in Firefox, 
		  but this is against the standard), so we have to use the keydown event.
		  There isn't a reliable way to map extended (i.e. non-ASCII) characters 
		  without using the keypress event.
		  
		  Aside from that, it should be easy enough to set a timer that waits 
		  about two seconds after each keystroke before clearing the filter. 
		  Then we just select the first option that matches the filter. This
		  feature should be available with or without the dropdown showing.
	
*/
if(jQuery) (function($) {
	
	$.extend($.fn, {
		
		selectBox: function(o, data) {
			
			
			var _show = function(event) {
				
				var select = event.data.select;
				var control = event.data.control;
				
				// Don't show disabled controls
				if( $(control).hasClass('ui-selectBox-disabled') ) return false;
				
				// Hide if the control is selected when the dropdown is already open
				if( $(control).hasClass('ui-selectBox-focus') && $("#ui-selectBox-dropdown").size() === 1 ) {
					_hide(event, true);
					return false;
				}
				
				// Remove focus and dropdown from any/all other selectBoxes
				$('.ui-selectBox').not(control).trigger('blur');
				
				_focus(event);
				
				event.stopPropagation();
				
				// Generate the dropdown
				$("#ui-selectBox-dropdown").remove();
				var dropdown = $('<div id="ui-selectBox-dropdown" class="ui-corner-bottom" />');
				var options = $('<ul />');
				
				if( $(select).children('optgroup').size() === 0 ) {
				
					$(select).children('option').each( function() {
						var text = $(this).text() !== '' ? $(this).text() : '\u00A0';
						var extraClasses = '';
						if( $(this).attr('disabled') ) extraClasses += ' ui-selectBox-disabled';
						$(options).append('<li class="ui-selectBox-option' + extraClasses + '">' + _htmlspecialchars(text) + '</li>');
					});
				
				} else {
					
					$(dropdown).addClass('ui-selectBox-hasOptgroups');
					
					$(select).children('optgroup').each( function() {
						$(options).append('<li class="ui-selectBox-optgroup">' + _htmlspecialchars($(this).attr('label')) + '</li>');
						$(this).children('option').each( function() {
							var text = $(this).text() !== '' ? $(this).text() : '\u00A0';
							var extraClasses = '';
							if( $(this).attr('disabled') ) extraClasses += ' ui-selectBox-disabled';
							$(options).append('<li class="ui-selectBox-option' + extraClasses + '">' + _htmlspecialchars(text) + '</li>');
						});
					});
					
				}
				
				// Add the options
				$(dropdown).append(options);
				
				// Select the appropriate option
				var selectedIndex = $(select)[0].selectedIndex;
				$(dropdown).find('LI.ui-selectBox-option').eq(selectedIndex).addClass('ui-selectBox-initial ui-selectBox-current');
				
				// Add option events
				$(dropdown).find('LI.ui-selectBox-option').hover( function() {
					$(dropdown).find('.ui-selectBox-current').removeClass('ui-selectBox-current');
					$(this).addClass('ui-selectBox-current');
				}, function() {
					$(this).removeClass('ui-selectBox-current');
				}).click( { select: select, control: control }, function(event) {
					_select(event);
				}).mouseup( { select: select, control: control }, function(event) {
					$(event.target).trigger('click');
				});				
				
				// Position and display
				$('BODY').append(dropdown);
				var cPos = $(control).offset();
				var cHeight = $(control).outerHeight();
				var cWidth = $(control).outerWidth();
				
				var borderAdjustment = parseInt($(dropdown).css('borderLeftWidth')) + parseInt($(dropdown).css('borderRightWidth'));
				
				$(dropdown).css({
					position: 'absolute',
					zIndex: '999999',
					top: cPos.top + cHeight,
					left: cPos.left,
					width: cWidth - borderAdjustment
				}).show();
				
				$(control).removeClass('ui-corner-all').addClass('ui-corner-top');
				
				_disableSelection(dropdown);
				_dropdownScrollFix(true);
				
			};
			
			
			var _hide = function(event, preventBlur) {
				
				var select = event.data.select;
				var control = event.data.control;
				
				$("#ui-selectBox-dropdown").remove();
				$(control).removeClass('ui-corner-top').addClass('ui-corner-all');
				
				if( !preventBlur ) {
					_blur(event);
				} else {
					$(control).focus();
				}
				
			};
			
			
			var _select = function(event, option) {
				
				var select = event.data.select;
				var control = event.data.control;				
				
				option = option ? option : event.target;
				
				if( $(option).hasClass('ui-selectBox-disabled') ) return false;
				
				var oldSelectedIndex = $(select)[0].selectedIndex;
				$('#ui-selectBox-dropdown .ui-selectBox-optgroup').remove();
				var newSelectedIndex = $('#ui-selectBox-dropdown').find('LI.ui-selectBox-current').index();				
				
				if( oldSelectedIndex !== newSelectedIndex ) {
					$(select)[0].selectedIndex = newSelectedIndex;
					$(control).find('.ui-selectBox-label').text( $(option).text() );
					$(select).trigger('change');
				}
				
				_hide(event, true);
				
			};
			
			
			var _focus = function(event) {
				
				var select = event.data.select;
				var control = event.data.control;				
				
				if( $(control).hasClass('ui-selectBox-disabled') ) return true;
				if( $(control).hasClass('ui-selectBox-focus') ) return false;
				
				// Remove dropdown and other focuses
				$(".ui-selectBox.ui-selectBox-focus").removeClass("ui-selectBox-focus");
				$("#ui-selectBox-dropdown").remove();
				
				$(control).addClass('ui-selectBox-focus');
				$(document).bind('mousedown', { select: select, control: control }, _blur);
				$(document).bind('keydown', { select: select, control: control }, _key);
				$(select).trigger('focus');
				$(control).focus();
				
			};
			
			
			var _blur = function(event) {
				
				var select = event.data.select;
				var control = event.data.control;
				
				// Prevent blur if the click was on the dropdown
				if( event.target.id === 'ui-selectBox-dropdown' || 
					$(event.target).parents('#ui-selectBox-dropdown').size() === 1 ) {
					$(control).trigger('focus');
					return false;
				}
				
				if( $(control).hasClass('ui-selectBox-focus') ) {
					$(control).removeClass('ui-selectBox-focus');
					$(document).unbind('mousedown', _blur);
					$(document).unbind('keydown', _key);
					$(select).trigger('blur');
					_hide(event);
				}
				
			};
			
			
			var _key = function(event) {
				
				var select = event.data.select;
				var control = event.data.control;
				var dropdown = $("#ui-selectBox-dropdown");
				
				if( $(control).hasClass('ui-selectBox-disabled') ) return false;
				
				switch( event.keyCode ) {
					
					case 9: // tab
						_blur(event);
						break;
					
					case 13: // enter
						
						if( $(dropdown).size() === 0 ) return false;
						
						var siblings = $(dropdown).find('.ui-selectBox-option');
						var currentIndex = -1;
						$.each(siblings, function(index, option) {
							if( $(option).hasClass('ui-selectBox-current') ) {
								currentIndex = index;
								return;
							}
						});
						
						if( currentIndex >= 0 ) {
							_select(event, $(siblings).eq(currentIndex));
						}
						
						return false;
						
						break;
						
					case 27: // esc
						_hide(event, true);
						break;
						
					case 38: // up
					case 37: // left
					case 33: // page up
						
						var interval = event.keyCode === 33 ? 20 : 1;
						
						if( $(dropdown).size() === 0 ) {
							
							if( event.altKey ) {
								_show(event);
								return false;
							}
							
							// Previous selection
							var totalIndexes = $(select).find('OPTION').size(),
								oldSelectedIndex = $(select)[0].selectedIndex,
								newSelectedIndex = $(select)[0].selectedIndex - interval;
							
							// Look for non-disabled option
							while( $(select).find('OPTION').eq(newSelectedIndex).attr('disabled') === true && newSelectedIndex >= 0 ) {
								newSelectedIndex--;
							}
							
							// Look for first enabled option
							if( newSelectedIndex < 0 ) {
								newSelectedIndex = $(select).find('OPTION:not([disabled]):first').index();
							}
							
							$(select)[0].selectedIndex = newSelectedIndex;
							if( $(select)[0].selectedIndex === -1 ) {
								newSelectedIndex = 0;
								$(select)[0].selectedIndex = newSelectedIndex;
							}
							var label = $(select).find('OPTION:selected').text();
							if( label === '' ) label = '\u00A0'; // &nbsp;
							$(control).find('.ui-selectBox-label').text(label);
							
							if( newSelectedIndex !== oldSelectedIndex ) $(select).trigger('change');
							
							return false;
							
						}
						
						// Determine currently selected index (ignoring optgroup LIs)
						var siblings = $(dropdown).find('.ui-selectBox-option');
						var currentIndex = -1;
						$.each(siblings, function(index, option) {
							if( $(option).hasClass('ui-selectBox-current') ) {
								currentIndex = index;
								return;
							}
						});
						
						currentIndex = currentIndex - interval;
						if( currentIndex < 0 ) currentIndex = 0;
						
						$(siblings).removeClass('ui-selectBox-current');
						$(siblings).eq(currentIndex).addClass('ui-selectBox-current');						
						
						_dropdownScrollFix();
						
						return false;
						
						break;
						
					case 40: // down
					case 39: // right
					case 34: // page down
						
						var interval = event.keyCode === 34 ? 20 : 1;
						
						if( $(dropdown).size() === 0 ) {
							
							if( event.altKey ) {
								_show(event);
								return false;
							}
							
							var totalIndexes = $(select).find('OPTION').size(),
								oldSelectedIndex = $(select)[0].selectedIndex,
								newSelectedIndex = $(select)[0].selectedIndex + interval;
							
							// Look for non-disabled option
							while( $(select).find('OPTION').eq(newSelectedIndex).attr('disabled') === true  && newSelectedIndex <= $(select).find('OPTION').size() ) {
								newSelectedIndex++;
							}
							
							// Look for last enabled option
							if( newSelectedIndex > totalIndexes - 1 ) {
								newSelectedIndex = $(select).find('OPTION:not([disabled]):last').index();
							}
							
							$(select)[0].selectedIndex = newSelectedIndex;
							if( $(select)[0].selectedIndex === -1 ) {
								newSelectedIndex = $(select).find('OPTION').size() - 1;
								$(select)[0].selectedIndex = newSelectedIndex;
							}
							var label = $(select).find('OPTION:selected').text();
							if( label === '' ) label = '\u00A0'; // &nbsp;
							$(control).find('.ui-selectBox-label').text(label);
							
							if( newSelectedIndex != oldSelectedIndex ) $(select).trigger('change');
							
							return false;
							
						}
						
						// Determine currently selected index (ignoring optgroup LIs)
						var siblings = $(dropdown).find('.ui-selectBox-option');
						var currentIndex = -1;
						$.each(siblings, function(index, option) {
							if( $(option).hasClass('ui-selectBox-current') ) {
								currentIndex = index;
								return;
							}
						});
						
						currentIndex = currentIndex + interval;
						if( currentIndex > $(siblings).size() - 1 ) currentIndex = $(siblings).size() - 1;
						
						$(siblings).removeClass('ui-selectBox-current');
						$(siblings).eq(currentIndex).addClass('ui-selectBox-current');
						
						_dropdownScrollFix();
						
						return false;
						
						break;
						
					case 36: // home
					case 35: // end
						
						if( $(dropdown).size() === 0 ) {
							
							if( event.altKey ) {
								_show(event);
								return false;
							}
							
							var oldSelectedIndex = $(select)[0].selectedIndex,
								newSelectedIndex;
							
							if( event.keyCode === 36 ) {
								// First
								newSelectedIndex = 0;
							} else {
								// Last
								newSelectedIndex = $(select).find('OPTION').size() - 1;
							}
							
							// Handle disabled options
							if( $(select).find('OPTION').eq(newSelectedIndex).attr('disabled') === true ) {
								if( event.keyCode === 36 ) {
									newSelectedIndex = $(select).find('OPTION:not([disabled]):first').index();	
								} else {
									newSelectedIndex = $(select).find('OPTION:not([disabled]):last').index();
								}
							}
							
							$(select)[0].selectedIndex = newSelectedIndex;
							var label = $(select).find('OPTION:selected').text();
							if( label === '' ) label = '\u00A0'; // &nbsp;
							$(control).find('.ui-selectBox-label').text(label);
							
							if( newSelectedIndex != oldSelectedIndex ) $(select).trigger('change');
							
							return false;
						}					
						
						$(dropdown).find('.ui-selectBox-current').removeClass('ui-selectBox-current');
						if( event.keyCode === 36 ) {
							// First
							$(dropdown).find('.ui-selectBox-option:first').addClass('ui-selectBox-current');
						} else {
							// Last
							$(dropdown).find('.ui-selectBox-option:last').addClass('ui-selectBox-current');
						}
						
						_dropdownScrollFix();
						
						return false;
						
						break;
						
				}
				
			};
			
			
			var _dropdownScrollFix = function(centerSelection) {
				
				var dropdown = $("#ui-selectBox-dropdown");
				if( $(dropdown).size() === 0 ) return false;
				
				var target = $(dropdown).find('.ui-selectBox-current');
				if( $(target).size() === 0 ) return false;
				
				var targetTop = parseInt($(target).offset().top - $(dropdown).position().top);
				var targetBottom = parseInt(targetTop + $(target).outerHeight());
				
				if( centerSelection ) {
					
					$(dropdown).scrollTop(
						$(target).offset().top - $(dropdown).offset().top + $(dropdown).scrollTop() - ($(dropdown).height() / 2)
					);
					
				} else {
				
					if( targetTop < 0 ) {
						$(dropdown).scrollTop(
							$(target).offset().top - $(dropdown).offset().top + $(dropdown).scrollTop()
						);
					}
					
					if( targetBottom > $(dropdown).height() ) {
						$(dropdown).scrollTop(
							($(target).offset().top + $(target).outerHeight() ) - $(dropdown).offset().top + $(dropdown).scrollTop() - $(dropdown).height()
						);
					}
				
				}
				
			};
			
			
			var _disableSelection = function(selector) {
				
				$(selector)
					.css('MozUserSelect', 'none')
					.bind('selectstart', function() {
						return false;
					})
					.bind('mousedown', function() {
						return false;
					});
				
				return true;
				
			};
			
			
			var _htmlspecialchars = function(string) {
				return( string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;') );
			};
			
			
			switch( o ) {
				
				
				case 'destroy':
					
					$(this).each( function() {
						
						var select = $(this);
						var control = $(this).next('.ui-selectBox');
						
						if( $(select)[0].tagName.toLowerCase() === 'select' ) {
							$(control).remove();
							$(select).removeData('selectBox-options').show();
						}
						
					});
					
					return $(this);
					
					break;
				
				
				case 'disable':
					
					$(this).each( function() {
						
						var select = $(this);
						var control = $(this).next('.ui-selectBox');
						
						$(select).attr('disabled', true);
						$(control).addClass('ui-selectBox-disabled');
						
					});
					
					return $(this);
					
					break;
				
				
				case 'enable':
					
					$(this).each( function() {
						
						var select = $(this);
						var control = $(this).next('.ui-selectBox');
						
						$(select).attr('disabled', false);
						$(control).removeClass('ui-selectBox-disabled');
						
					});
					
					return $(this);
					
					break;				
				
				
				case 'setOptions':
					
					if( !data ) return $(this);
					
					$(this).each( function() {
						
						var select = $(this);
						var control = $(this).next('.ui-selectBox');
						
						switch( typeof(data) ) {
							
							case 'string':
								
								$(select).html(data);
								
								break;
								
							case 'object':
								
								$(select).html('');
								
								for( var i in data ) {
									
									if( data[i] === null ) continue;
									
									if( typeof(data[i]) === 'object' ) {
										// OPTGROUP
										var optgroup = $('<optgroup label="' + i + '" />');
										for( var j in data[i] ) {
											$(optgroup).append('<option value="' + j + '">' + data[i][j] + '</option>');
										}
										$(select).append(optgroup);
									} else {
										// OPTION
										var option = $('<option value="' + i + '">' + data[i] + '</option>');
										$(select).append(option);
									}
									
								}
								
								break;
							
						}
						
						// Refresh the options
						var options = $(select).data('selectBox-options');
						$(select).selectBox('destroy');
						$(select).selectBox(options);
						
					});
					
					return $(this);
					
					break;
				
				
				case 'value':
					
					// Remove dropdown
					$("#ui-selectBox-dropdown").remove();
					
					$(this).each( function() {
						
						var select = $(this);
						var control = $(this).next('.ui-selectBox');
						
						// Update value
						$(select).val(data);
						
						// Fix corners and update label
						var label = $(select).find(':selected').text();
						if( label === '' ) label = '\u00A0'; // &nbsp;
						$(control).removeClass('ui-corner-top').addClass('ui-corner-all').find('.ui-selectBox-label').text(label);
						
					});
					
					return $(this);
					
					break;
				
				
				default:
					
					// Create the control
					$(this).each( function() {
						
						// Default options
						if( !o ) o = {};
						var options = $.extend({
							autoWidth: true
						}, o);
						
						var select = $(this);
						
						if( $(this).next('.ui-selectBox').size() === 0 ) {
							
							// Generate new control
							var control = $('<a href="#" class="ui-selectBox ui-corner-all" tabindex="' + parseInt($(select).attr('tabindex')) + '" />');
							
							// Inherit class names, style, and title attributes
							$(control).addClass($(select).attr('class')).attr({
								style: ($(select).attr('style') + '').replace(/inline/, 'inline-block'),
								title: $(select).attr('title')
							});
							
							// Store options for later use
							$(select).data('selectBox-options', options);
							
							// Auto-width based on longest option
							if( options.autoWidth ) {
								
								// Determine character count of longest option
								var longestOption = '';
								$(select).find('OPTION').each( function() {
									if( $(this).text().length > longestOption.length ) longestOption = $(this).text();
								});
								
								// Create a fake option, measure it, set the width, and remove the fake option
								var div = $('<div class="ui-selectBox-dropdown" style="position: absolute; top: -9999em; left: -9999em; width: auto; display: inline-block;" />');
								var li = $('<li class="ui-selectBox-option">' + _htmlspecialchars(longestOption) + '</li>');
								$(div).append(li);
								$('BODY').append(div);
								$(control).width(li.outerWidth());
								$(div).remove();
								
							}
							
							if( $(select)[0].tagName.toLowerCase() !== 'select' || $(select).attr('multiple') === true ) return;
							if( $(select).attr('disabled') === true ) $(control).addClass('ui-selectBox-disabled');
							
							var label = $(select).find('OPTION:selected').text();
							if( label === '' ) label = '\u00A0'; // &nbsp;
							
							// Add label and arrow
							$(control).append('<span class="ui-selectBox-label">' + _htmlspecialchars(label) + '</span>');
							$(control).append('<span class="ui-selectBox-arrow"></span>');
							$(select).hide().after(control);
							
							_disableSelection(control);
							
							$(control)
								.bind('click', function() { return false; })
								.bind('mousedown', { select: select, control: control }, _show)
								.bind('focus', { select: select, control: control }, _focus)
								.bind('blur', { select: select, control: control }, _blur);
							
						}
						
					});
					
					return $(this);
					
					break;
				
			}

				
		}
		
			
	});
	
})(jQuery);
/*
    http://www.JSON.org/json2.js
    2008-11-19

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

    See http://www.JSON.org/js.html

    This file creates a global JSON object containing two methods: stringify
    and parse.

        JSON.stringify(value, replacer, space)
            value       any JavaScript value, usually an object or array.

            replacer    an optional parameter that determines how object
                        values are stringified for objects. It can be a
                        function or an array of strings.

            space       an optional parameter that specifies the indentation
                        of nested structures. If it is omitted, the text will
                        be packed without extra whitespace. If it is a number,
                        it will specify the number of spaces to indent at each
                        level. If it is a string (such as '\t' or '&nbsp;'),
                        it contains the characters used to indent at each level.

            This method produces a JSON text from a JavaScript value.

            When an object value is found, if the object contains a toJSON
            method, its toJSON method will be called and the result will be
            stringified. A toJSON method does not serialize: it returns the
            value represented by the name/value pair that should be serialized,
            or undefined if nothing should be serialized. The toJSON method
            will be passed the key associated with the value, and this will be
            bound to the object holding the key.

            For example, this would serialize Dates as ISO strings.

                Date.prototype.toJSON = function (key) {
                    function f(n) {
                        // Format integers to have at least two digits.
                        return n < 10 ? '0' + n : n;
                    }

                    return this.getUTCFullYear()   + '-' +
                         f(this.getUTCMonth() + 1) + '-' +
                         f(this.getUTCDate())      + 'T' +
                         f(this.getUTCHours())     + ':' +
                         f(this.getUTCMinutes())   + ':' +
                         f(this.getUTCSeconds())   + 'Z';
                };

            You can provide an optional replacer method. It will be passed the
            key and value of each member, with this bound to the containing
            object. The value that is returned from your method will be
            serialized. If your method returns undefined, then the member will
            be excluded from the serialization.

            If the replacer parameter is an array of strings, then it will be
            used to select the members to be serialized. It filters the results
            such that only members with keys listed in the replacer array are
            stringified.

            Values that do not have JSON representations, such as undefined or
            functions, will not be serialized. Such values in objects will be
            dropped; in arrays they will be replaced with null. You can use
            a replacer function to replace those with JSON values.
            JSON.stringify(undefined) returns undefined.

            The optional space parameter produces a stringification of the
            value that is filled with line breaks and indentation to make it
            easier to read.

            If the space parameter is a non-empty string, then that string will
            be used for indentation. If the space parameter is a number, then
            the indentation will be that many spaces.

            Example:

            text = JSON.stringify(['e', {pluribus: 'unum'}]);
            // text is '["e",{"pluribus":"unum"}]'


            text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
            // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

            text = JSON.stringify([new Date()], function (key, value) {
                return this[key] instanceof Date ?
                    'Date(' + this[key] + ')' : value;
            });
            // text is '["Date(---current time---)"]'


        JSON.parse(text, reviver)
            This method parses a JSON text to produce an object or array.
            It can throw a SyntaxError exception.

            The optional reviver parameter is a function that can filter and
            transform the results. It receives each of the keys and values,
            and its return value is used instead of the original value.
            If it returns what it received, then the structure is not modified.
            If it returns undefined then the member is deleted.

            Example:

            // Parse the text. Values that look like ISO date strings will
            // be converted to Date objects.

            myData = JSON.parse(text, function (key, value) {
                var a;
                if (typeof value === 'string') {
                    a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
                    if (a) {
                        return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
                            +a[5], +a[6]));
                    }
                }
                return value;
            });

            myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
                var d;
                if (typeof value === 'string' &&
                        value.slice(0, 5) === 'Date(' &&
                        value.slice(-1) === ')') {
                    d = new Date(value.slice(5, -1));
                    if (d) {
                        return d;
                    }
                }
                return value;
            });


    This is a reference implementation. You are free to copy, modify, or
    redistribute.

    This code should be minified before deployment.
    See http://javascript.crockford.com/jsmin.html

    USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
    NOT CONTROL.
*/

/*jslint evil: true */

/*global JSON */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
    call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (!this.JSON) {
    JSON = {};
}
(function () {

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? '0' + n : n;
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function (key) {

            return this.getUTCFullYear()   + '-' +
                 f(this.getUTCMonth() + 1) + '-' +
                 f(this.getUTCDate())      + 'T' +
                 f(this.getUTCHours())     + ':' +
                 f(this.getUTCMinutes())   + ':' +
                 f(this.getUTCSeconds())   + 'Z';
        };

        String.prototype.toJSON =
        Number.prototype.toJSON =
        Boolean.prototype.toJSON = function (key) {
            return this.valueOf();
        };
    }

    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        escapable.lastIndex = 0;
        return escapable.test(string) ?
            '"' + string.replace(escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"' :
            '"' + string + '"';
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i,          // The loop counter.
            k,          // The member key.
            v,          // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

        case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
                return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                            partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                          '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                        mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== 'function') {
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = '';
            indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === 'string') {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                     typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

            return str('', {'': value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            cx.lastIndex = 0;
            if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

            if (/^[\],:{}\s]*$/.
test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError('JSON.parse');
        };
    }
})();

CanvasRenderingContext2D.prototype.dashedLineTo = function( fromX, fromY, toX, toY, pattern ) {
	// Our growth rate for our line can be one of the following:
	//	 (+,+), (+,-), (-,+), (-,-)
	// Because of this, our algorithm needs to understand if the x-coord and
	// y-coord should be getting smaller or larger and properly cap the values
	// based on (x,y).
	var lt = function ( a, b ) { return a <= b; };
	var gt = function ( a, b ) { return a >= b; };
	var capmin = function ( a, b ) { return Math.min( a, b ); };
	var capmax = function ( a, b ) { return Math.max( a, b ); };

	// if ( typeof(pattern) != "Array" ) pattern = [pattern];
	var checkX = { thereYet: gt, cap: capmin };
	var checkY = { thereYet: gt, cap: capmin };

	if ( fromY - toY > 0 ) {
		checkY.thereYet = lt;
		checkY.cap = capmax;
	}
	if ( fromX - toX > 0 ) {
		checkX.thereYet = lt;
		checkX.cap = capmax;
	}

	this.moveTo( fromX, fromY );
	var offsetX = fromX;
	var offsetY = fromY;
	var idx = 0, dash = true;
	while ( !( checkX.thereYet( offsetX, toX ) && checkY.thereYet( offsetY, toY ) ) ) {
		var ang = Math.atan2( toY - fromY, toX - fromX );
		var len = pattern[idx];

		offsetX = checkX.cap( toX, offsetX + (Math.cos( ang ) * len ) );
		offsetY = checkY.cap( toY, offsetY + (Math.sin( ang ) * len ) );

		if ( dash ) this.lineTo( offsetX, offsetY );
		else this.moveTo( offsetX, offsetY );

		idx = ( idx + 1 ) % pattern.length;
		dash = !dash;
	}
};
CanvasRenderingContext2D.prototype.dottedArc = function( x, y, radius, startAngle, endAngle, anticlockwise ) {
	var g = Math.PI / radius / 2, sa = startAngle, ea = startAngle + g;
	while( ea < endAngle ) {
		this.beginPath();
		this.arc( x, y, radius, sa, ea, anticlockwise );
		this.stroke();
		sa = ea + g;
		ea = sa + g;
	}
};

var Mark = ( function ( mark ) { 
	
	mark.layer = function( manager, name ) {
	
		this.canvas = null; 
		this.context = null;
		this.dirtyRectangles = [];
		this.layerName = name;
		this.manager = manager;
	
		this.clean = function() {
			if( this.dirtyRectangles.length == 0 ) {
				// if theres no dirtyRectangles, clear the whole thing (probably not the best default)
				this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			} else {
				// loop through dirty rectangles, and run clearRect on each
				for( var i = 0; i< this.dirtyRectangles.length; i++ ) {
					var rect = this.dirtyRectangles[i];
					this.context.clearRect( i.x, i.y, i.w, i.h );
				}
			}
		};
	
		this.setSize = function( w, h ) {
			if( this.canvas.width != w ) this.canvas.width = w;
			if( this.canvas.height != h ) this.canvas.height = h;
		};
	
		this.init = function () {
			this.canvas = document.createElement( 'canvas' );
			this.context = this.canvas.getContext( '2d' );
			this.setSize( this.manager.container.scrollWidth, this.manager.container.scrollHeight );
			this.manager.layerWrapper.appendChild( this.canvas );
		};
	
		this.remove = function ()  {
			this.manager.layerWrapper.removeChild( this.canvas );
		};
	
		this.init();
	};
	
	return mark;
	
}( Mark || {} ) );
var Mark = ( function ( mark ) { 
	mark.layerManager = function( container ) {
	
		this.container = container; 
		this.layerWrapper = null;
		this.layers = {};
	
		this.init = function () { 
			// attach a new div for our layers to reside in 
			this.layerWrapper = document.createElement( 'div' );
			this.layerWrapper.className = 'mark-layerManager';
			this.container.appendChild( this.layerWrapper );
		};
	
		// add a layer to our container
		this.addLayer = function( name ) {
			var layer = new mark.layer( this, name );
			this.layers[name] = layer;
			return layer;
		};
		
		// remove all layers from our container 
		this.removeAll = function () {
			for( var layer in this.layers ) {
				this.layers[layer].remove();
				delete this.layers[layer];
			}
		};
		
		// resize all layers to the passed width and height
		this.resizeAll = function( w, h ) {
			for( var layer in this.layers ) {
				this.layers[layer].setSize( w, h );
			}
		};
		
		this.init();
	
	};
	return mark;
	
}( Mark || {} ) );
var Mark = ( function ( mark ) { 
	mark.gmlPoint = function( x, y, time, speed, z ) {
		this.x = x; 
		this.y = y;
		this.z = typeof z == "integer" ? z : 0;
		this.time = time;
		this.speed = speed; 
		this.angle = 0; 
		this.significance = 1; // 1-5 value for how significant this point is -- useful for easign the complexity of lines that are far from the camera
		 
		// returns the distance between this and another point
		this.distanceToPoint = function( point ) {
			return Math.sqrt( Math.pow( (point.x - this.x ), 2 ) + Math.pow( (point.y - this.y ), 2 ) );
		};
		
		// returns a speed between this point and a point in the future
		this.speedToPoint = function( point ) {
			var dp = this.distanceToPoint( point );
			var dt = point.time - this.time;
			return dp / dt;
		};
		
		// ensures this point's speed is not changing substantially faster than it should
		// allowance is a per unit distance change
		this.smoothAgainst = function( point, allowance ) {
			var d = this.distanceToPoint( point );
			var a = allowance * d;
			if ( Math.abs( this.speed - point.speed ) > a ) {
				this.speed = this.speed > point.speed ? point.speed + a : point.speed - a;
			} 
		};
		
		// considers a prior point and sets this point's angle accordingly
		// ensures that the angle is a radian value between 0 and 2 * PI
		this.setAngleFromPoint = function ( point ) {
			this.angle = Math.atan2( point.y - this.y, point.x - this.x ) + ( Math.PI / 2 );
			this.angle = this.angle % ( 2 * Math.PI );
			if( this.angle < 0 ) this.angle = ( 2 * Math.PI ) + this.angle; 
		};
		
		// returns a basic copy of this point
		this.clone = function ()  {
			return { x: this.x, y: this.y, z: this.z, time: this.time, significance: this.significance, angle: this.angle, speed: this.speed };
		};
		
		// returns a copy of this point translated by x, y
		this.getTranslatedPoint = function ( x, y ) {
			var point = this.clone();
			point.x += x;
			point.y += y;
			return point;
		};
		
	};
	return mark; 
}( Mark || {} ) );

var Mark = ( function ( mark ) { 
	mark.simplification = {
		// helper function
		Line: function( p1, p2 ) {
			this.p1 = p1;
			this.p2 = p2;
			this.distanceToPoint = function( point ) {
				// slope
				var m = ( this.p2.y - this.p1.y ) / ( this.p2.x - this.p1.x );
				// y offset
				var b = this.p1.y - ( m * this.p1.x );
				var d = [];
				// distance to the linear equation
				d.push( Math.abs( point.y - ( m * point.x ) - b ) / Math.sqrt( Math.pow( m, 2 ) + 1 ) )
				// distance to p1
				d.push( Math.sqrt( Math.pow( ( point.x - this.p1.x ), 2 ) + Math.pow( ( point.y - this.p1.y ), 2 ) ) )
				// distance to p2
				d.push( Math.sqrt( Math.pow( ( point.x - this.p2.x ), 2 ) + Math.pow( ( point.y - this.p2.y ), 2 ) ) );
				// return the smallest distance
				return d.sort( function( a, b ) {
					return ( a - b ) //causes an array to be sorted numerically and ascending
				} )[0];
			}
		},
		// main simplification algorithm
		douglasPeucker: function( points, tolerance ) {
			var returnPoints = [];
			if ( points.length <= 2 ) {
				return [points[0]];
			}
			// make line from start to end 
			var line = new mark.simplification.Line( points[0], points[points.length - 1] );
			// find the largest distance from intermediate poitns to this line
			var maxDistance = 0;
			var maxDistanceIndex = 0;
			for( var i = 1; i <= points.length - 2; i++ ) {
				var distance = line.distanceToPoint( points[ i ] );
				if( distance > maxDistance ) {
					maxDistance = distance;
					maxDistanceIndex = i;
				}
			}
			// check if the max distance is greater than our tollerance allows 
			if ( maxDistance >= tolerance ) {
				var p = points[maxDistanceIndex];
				line.distanceToPoint( p, true );
				// include this point in the output 
				returnPoints = returnPoints.concat( mark.simplification.douglasPeucker( points.slice( 0, maxDistanceIndex + 1 ), tolerance ) );
				// returnPoints.push( points[maxDistanceIndex] );
				returnPoints = returnPoints.concat( mark.simplification.douglasPeucker( points.slice( maxDistanceIndex, points.length ), tolerance ) );
			} else {
				// ditching this point
				var p = points[maxDistanceIndex];
				line.distanceToPoint( p, true );
				returnPoints = [points[0]];
			}
			return returnPoints;
		},
		// returns a simplified version of a stroke based on the passed tolerance
		simplifyPath: function( points, tolerance ) {
			var arr = mark.simplification.douglasPeucker( points, tolerance );
			// always have to push the very last point on so it doesn't get left off
			arr.push( points[points.length - 1 ] );
			return arr;
		},
		// weights a stroke based on the passed tolerances 
		weightPath: function( points, tolerances ) {
			var maxSignificance = tolerances.length + 1;
			var tmpPoints = points;
			while( tolerance = tolerances.shift() ) {
				// limit the points array by the current tolerance
				tmpPoints = mark.simplification.douglasPeucker( tmpPoints, tolerance );
				// increment the significance of all points that pass the simplfification
				for( var i = 0; i < tmpPoints.length; i++ ) {
					tmpPoints[i].significance++;
				}
			}
			// maker sure the beginning and end of all strokes get the hightest significance
			points[0].significance = maxSignificance;
			points[points.length - 1].significance = maxSignificance;
			return points;
		}
	};
	
	return mark;
}( Mark || {} ) );
var Mark = ( function ( mark ) { 
	
	mark.dof = 10000;

	mark.thickMarkBrush = function( g, strokes, translateOptions, colorBase, w, h ) {
		var colorBase = colorBase ? colorBase : '0,0,0';
		// setup our starting bound
		var p = Mark.renderer.translatePoint( strokes[0][0], translateOptions );
		var bounds = { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y };
		// if this mark isn't even close to being on screen, just return
		if ( ( w && h ) && ( p.x > w*2 || p.x < -w || p.y > h*2 || p.y < -h || p.z > mark.dof || p.z < 0 ) ) return;
		// iterate
		for( var i = 0; i < strokes.length; i++ ) {
			if( typeof( strokes[i] ) == "undefined" || strokes[i].length <= 1 ) continue;
			var prevP = null;
			for( var j=0; j < strokes[i].length; j++ ) {
				var p = Mark.renderer.translatePoint( strokes[i][j], translateOptions );
				// if this point is out of the depth of field, on to the next one
				if( p.z && ( p.z > mark.dof ) ) continue;
				// if this point isn't significant enough, on to the next one
				if( p.significance && p.significance * ( mark.dof / 5 )  < p.z - 500  ) continue;
				// if this is the first point in a stroke
				if( !prevP ) {
					// if this isn't the first stroke in this mark, and this mark is a reasonable distance from the camera, connect them
					if( i != 0 && p.z < 1500 ) {
						var lastStrokePoint = Mark.renderer.translatePoint( strokes[i-1][strokes[i-1].length - 1], translateOptions );
						if( lastStrokePoint.z && lastStrokePoint.z < mark.dof ) {
							g.strokeStyle = 'rgba(0,0,0,0.3)';
							g.lineWidth = 1;
							g.beginPath();
							g.dashedLineTo( lastStrokePoint.x, lastStrokePoint.y, p.x, p.y, [6,4] );
							g.closePath();
							g.stroke();
						}
					}
					prevP = p;
					prevPX = 0;
					prevPY = 0;
					continue;
				}
				g.lineWidth = 1;
				// set line width
				if ( j == strokes[i].length - 1 ) {
					// if this is the last point, make the widht 0 so we dont have a blunt end
					var px = 0;
					var py = 0;
				} else {
					var distance = 9 - Math.max( 0, Math.pow(p.speed + 1, 3) );
					if( translateOptions.mode == "flatScale" && translateOptions.scale.thickness ) {
						distance *= translateOptions.scale.thickness;
					} else {
						if( p.z ) distance *= (2/p.z) * ( h / 2 );
					}
					if ( distance < 0.1 ) distance = 0.1;
					distance += 1;
					var px = Math.cos( p.angle ) * distance;
					var py =  Math.sin( p.angle ) * distance;
				}
				g.strokeStyle = 'rgba(' + colorBase + ',' + ( ( mark.dof - p.z ) / mark.dof )+')';
				g.fillStyle = 'rgba(' + colorBase + ',' + ( ( mark.dof - p.z ) / mark.dof  )+')';
				
					
				try {
					g.beginPath();
					g.lineWidth = 0.5 * ( ( mark.dof - p.z ) / mark.dof );
					g.moveTo( prevP.x - prevPX - 0.5, prevP.y - prevPY - 0.5 );
					g.lineTo( prevP.x + prevPX - 0.5, prevP.y + prevPY - 0.5 );
					g.lineTo( p.x + px - 0.5, p.y + py - 0.5 );
					g.lineTo( p.x - px - 0.5, p.y - py - 0.5 );
					g.lineTo( prevP.x - prevPX - 0.5, prevP.y - prevPY - 0.5 );
					g.fill();
					g.stroke();
				} catch( e ) {
					// console.error( p, prevX, prevY, prevT, px, py, dx, dy, dt );
				}
				// expand bounds
				bounds.minX = p.x < bounds.minX ? p.x : bounds.minX;
				bounds.minY = p.y < bounds.minY ? p.y : bounds.minY;
				bounds.maxX = p.x > bounds.maxX ? p.x : bounds.maxX;
				bounds.maxY = p.y > bounds.maxY ? p.y : bounds.maxY;
				// stash variables for later
				prevP = p
				prevPX = px;
				prevPY = py;
			}
		}
		// return our bounds for storage
		return bounds;
	};
	mark.connectionBrush = function( g, p1, p2, offset1, offset2, w, h ) {
		var tO = { offset: offset1, w: w, h: h, mode: 'pinhole' };
		p1 = Mark.renderer.translatePoint( p1, tO );
		tO.offset = offset2;
		p2 = Mark.renderer.translatePoint( p2, tO );
		// if these points are both off the screen, don't render the line
		if ( ( p1.x > w || p1.x < 0 || p1.y > h || p1.y < 0 ) && ( p2.x > w || p2.x < 0 || p2.y > h || p2.y < 0 )  ) return;
		// if these points are out of the dof, don't render the line
		if ( p1.z && p2.z && ( p1.z > mark.dof || p1.z < 0 ) && ( p2.z > mark.dof || p2.z < 0 ) ) return;
		g.strokeStyle = 'rgba(0,0,0,' + ( ( mark.dof - p1.z ) / (mark.dof*2) )+')';
		var distance = 3 * (2/p1.z) * ( h / 2 );
		if ( distance < 1 ) distance = 1;
		g.lineWidth = distance;
		g.beginPath();
		g.moveTo( p1.x, p1.y );
		g.lineTo( p2.x, p2.y );
		g.closePath();
		g.stroke();
	},
	mark.thickBrush = function( g, strokes, offsetX, offsetY, depth ) {
		var offsetX = offsetX ? offsetX : 0;
		var offsetY = offsetY ? offsetY : 0;
		var depth = depth ? depth : 1;
		
		for( var i = 0; i < strokes.length; i++ ) {
			if( typeof( strokes[i] ) == "undefined" || strokes[i].length <= 1 ) continue;
			// if this is the first point in a stroke
			if( i > 0 ) {
				// connect to the last stroke
				g.strokeStyle = 'rgba(0,0,0,0.1)';
				g.lineWidth = 1;
				g.beginPath();
				var lastX = strokes[i-1][strokes[i-1].length - 1].x,
					lastY = strokes[i-1][strokes[i-1].length - 1].y,
					firstX = strokes[i][0].x,
					firstY = strokes[i][0].y;
				g.dashedLineTo( lastX + offsetX, lastY + offsetY, firstX + offsetX, firstY + offsetY, [6,4] );
				g.closePath();
				g.stroke();
			}
			g.lineWidth = 1;
			g.strokeStyle = '#000000';
			g.fillStyle = '#000000';
			var prevPX = 0,
				prevPY = 0,
				prevT = strokes[i][0].time,
				prevX = strokes[i][0].x,
				prevY = strokes[i][0].y ;
			for( var j=1; j < strokes[i].length; j++ ) {
				var p = strokes[i][j];
				// if this point is insignificant, on to the next one
				if( p.significance < depth ) continue;
				// if this is the last stroke
				if ( j == strokes[i].length - 1 ) {
					var px = 0;
					var py = 0;
				} else {
					var distance = 9 - Math.pow(p.speed + 1, 3);
					if ( distance < 0.5 ) distance = 0.5;
					distance += 1;
					var px = Math.cos( p.angle ) * distance;
					var py =  Math.sin( p.angle ) * distance;
				}
				try {
					g.beginPath();
					g.moveTo( prevX - prevPX - 0.5 + offsetX, prevY - prevPY - 0.5 + offsetY );
					g.lineTo( prevX + prevPX - 0.5 + offsetX, prevY + prevPY - 0.5 + offsetY );
					g.lineTo( p.x + px - 0.5 + offsetX, p.y + py - 0.5 + offsetY );
					g.lineTo( p.x - px - 0.5 + offsetX, p.y - py - 0.5 + offsetY );
					g.lineTo( prevX - prevPX - 0.5 + offsetX, prevY - prevPY - 0.5 + offsetY );
					g.fill();
					g.stroke();
				} catch( e ) {
					// console.error( p, prevX, prevY, prevT, px, py, dx, dy, dt );
				}
				prevPX = px;
				prevPY = py;
				prevX = p.x;
				prevY = p.y;
				prevT = p.time;
				prevAng = p.angle;
			}
		}
	};
	
	mark.circleMarkBrush = function( g, strokes, offsetParent ) {
		var d = 3;
		for( var i = 0; i < strokes.length; i++ ) {
			if( strokes[i].length == 0 ) continue;
			for( var j=0; j < strokes[i].length; j++ ) {
				var p = Mark.renderer.translatePoint( strokes[i][j], offsetParent );
				if( p.z && p.z > mark.dof ) continue;
				d = 3 * ( ( mark.dof - p.z ) / mark.dof );
				g.fillStyle = "rgba(255,255,255,0.4)";
				g.strokeStyle = "rgba(255,255,255,0.4)";
				g.beginPath();
				g.arc(p.x, p.y, d, 0, Math.PI*2, true);
				g.closePath();
				g.fill();
				g.stroke();
				g.lineTo( p.x, p.y );
			}
		}
	};
	
	mark.circleBrush = function( g, strokes, offsetX, offsetY, depth ) {
		var offsetX = offsetX ? offsetX : 0;
		var offsetY = offsetY ? offsetY : 0;
		var depth = depth ? depth : 1;
		for( var i = 0; i < strokes.length; i++ ) {
			if( strokes[i].length == 0 ) continue;
			var p1 = strokes[i][0];
			g.beginPath();
			for( var j=0; j < strokes[i].length; j++ ) {
				var p = strokes[i][j];
				// if this point is insignificant, on to the next one
				if( p.significance < depth ) continue;
				g.beginPath();
				g.arc(p.x + offsetX, p.y + offsetY, 3, 0, Math.PI*2, true);
				g.closePath();
				g.fill();
				g.stroke();
				g.lineTo( p.x + offsetX, p.y + offsetY );
			}
		}
	};
	
	return mark; 
}( Mark || {} ) );

var Mark = ( function ( mark ) { 
	mark.gmlMark = function( strokes, reference, country_code, time, rtl, id, is_approved ) {
		this.strokes = strokes;
		this.country_code = country_code; 
		this.time = time;
		this.rtl = rtl;
		this.maxTime = 0;
		this.reference = reference;
		this.hoverState = false;
		this.renderedBounds = null;
		this.id = id ? id : null;
		this.is_approved = is_approved;
		this.contributor_name = null;
		this.extra_info = null;
		
		// colors for this mark
		this.color = '0,0,0';
		
		// current position of this mark
		this.x = 0;
		this.y = 0; 
		
		// we represent the mark as a plane sitting in 3d space -- all point positions can then be calculatd relative to this
		// top left corner of the bounding box
		this.position = {x: 0, y: 0, z: 0};
		// angle of the plane in 3d space -- values are between -1 and 1, and really we only want to allow rotation around the Y axis
		this.rotationAngle = {x: 0, y: 0, z: 0};
		
		// offset of the start point from the origin of the bounding box
		this.sX = 0;
		this.sY = 0;
		
		// bounding box dimensions
		this.bWidth = 0;
		this.bHeight = 0;
		
		this.init = function () {
			if( this.strokes.length > 0 ) {
				this.setupVars();
			}
		};
		
		this.setupVars = function () {
			this.maxTime = this.lastPoint().time;
			this.getBoundingBox();
		};
		
		// looks for and returns the start of a stroke that is the furthes to the left
		this.leftmostStrokeStart = function () {
			var firstPoint = this.strokes[0][0];
			for ( var i = 1; i < this.strokes.length; i++ ) {
				var p = this.strokes[i][0];
				if ( p.x < firstPoint.x ) lastPoint = p;
			}
			return firstPoint;
		}
		// looks for and returns the end of a stroke that is furthest to the right
		this.rightmostStrokeEnd = function () {
			// start with the last point of the first stroke
			var lastPoint = this.strokes[0][this.strokes[0].length - 1];
			for ( var i = 1; i < this.strokes.length; i++ ) {
				var p = this.strokes[i][this.strokes[i].length - 1];
				if ( p.x > lastPoint.x ) lastPoint = p;
			}
			return lastPoint;
		};
		
		// returns the very first point drawn in this stroke
		this.firstPoint = function () {
			return this.strokes[0][0];
		};
		
		// returns the very last point drawn in this stroke
		this.lastPoint = function () {
			return this.strokes[this.strokes.length - 1][this.strokes[this.strokes.length - 1].length - 1];
		};
		
		this.translatePoint = function ( point ) {
			var tP = point.clone();
			tP.x = this.x + point.x;
			tP.y = this.y + point.y;
			return tP;
		};
		
		this.getBoundingBox = function () {
			var p1 = this.strokes[0][0];
			var maxX = p1.x, minX = p1.x, maxY = p1.y, minY= p1.y;
			for( var i = 0; i < this.strokes.length; i ++ ) {
				for( var j = 0; j < this.strokes[i].length; j++ ) {
					var p = this.strokes[i][j];
					maxX = p.x > maxX ? p.x : maxX;
					maxY = p.y > maxY ? p.y : maxY;
					minX = p.x < minX ? p.x : minX;
					minY = p.y < minY ? p.y : minY;
				}
			}
			this.bWidth = maxX - minX;
			this.bHeight = maxY - minY;
			this.x = minX;
			this.y = minY;
			if ( minX != 0 || minY != 0 )
				this.fitPointsToBounds( minX, minY );
		};
		
		this.fitPointsToBounds = function ( minX, minY ) {
			for( var i = 0; i < this.strokes.length; i ++ ) {
				for( var j = 0; j < this.strokes[i].length; j++ ) {
					this.strokes[i][j].x -= minX;
					this.strokes[i][j].y -= minY;
				}
			}
		};
		
		// returns a subset of this marks strokes, at a given time
		this.strokesAtTime =  function ( time ) {
			if( time > this.maxTime ) return this.strokes;
			var sat = [[]];
			var curIndex = [0, 0]
			var nextPoint = this.strokes[curIndex[0]][curIndex[1]];
			while( nextPoint.time < time ) {
				sat[sat.length - 1].push( nextPoint );
				curIndex[1]++;
				if( this.strokes[curIndex[0]].length == curIndex[1] ) {
					curIndex[0]++;
					curIndex[1] = 0;
					sat.push([]);
				}
				nextPoint = this.strokes[curIndex[0]][curIndex[1]];
			}
			return sat;
		};
		
		// If reverse is true, we position relative to the start of the mark
		// if it's false, or ommitted, we position relative to the end of the mark
		this.positionRelativeTo = function ( mark, reverse ) {
			var reverse = reverse ? !!reverse : false;
			var buffer = 50;
			if ( reverse ) {
				this.position.x = mark.position.x - buffer - this.bWidth;
				// this.x = mark.x + mark.firstPoint().x - this.lastPoint().x;
				this.position.y = mark.position.y + mark.leftmostStrokeStart().y - this.rightmostStrokeEnd().y;
				// this is based on a static computation in mark.renderer
				// if you change it there, change it here
				this.position.z =  mark.position.z - ( this.maxTime / 50 );
			} else {
				this.position.x = mark.position.x + mark.bWidth + this.leftmostStrokeStart().x + buffer;
				// this.x = mark.x + mark.rightmostStrokeEnd().x - this.leftmostStrokeStart().x;
				this.position.y = mark.position.y + mark.rightmostStrokeEnd().y - this.firstPoint().y;
				// this is based on a static computation in mark.renderer
				// if you change it there, change it here
				this.position.z =  mark.position.z + ( mark.maxTime / 50 );
			}
		};
		
		this.positionToStart = function () {
			this.position.x = 0;
			this.position.y = 0;
			this.position.z =  0;
		};
		
		
		this.init();
		
	};
	return mark; 
}( Mark || {} ) );

var Mark = ( function ( mark ) { 
	
	mark.scene = function ( ) {
	
		this.camera = new Mark.camera();
		this.objects = [];
		this.canvasContext = null;
		this.timers = {};
		
		this.init = function ( ) {
			
		};
		
		this.addObject = function ( object ) {
			this.objects.push( object );
		};
		
		this.removeObject = function ( index ) {
			this.objects.splice( index, 1 );
		};
		
		this.update = function ( ) {
			var now = ( new Date() ).getTime();
			for( mark in this.timers ) {
				if( this.timers[mark].end < now ) {
					delete this.timers[mark];
				} 
			}
		};
		
		this.init();
		
	};
	
	return mark;
	
}( Mark || {} ) );
var Mark = ( function ( mark ) { 
	
	mark.renderer = {
		// all points are passed through here durring rendering 
		// current supported options
		// - offset - an object with x, y, and possibly z 
		// - w - output width - defaults to 500
		// - h - output height - defaults to 500
		// - mode - which of the translate modes we should use. defaults to 'pinhole'
		// - scale - an object with x, y and possibly thickness values to scale the x, y coords and the stroke thickness by.
		translatePoint: function( point, options ) {
			var modes = {
				// simple offset and scale translate
				'flatScale': function( rP, options ) {
					var offsetX = ('offset' in options) && ( 'x' in options['offset'] ) ? options.offset.x : 0;
					var offsetY = ('offset' in options) && ( 'y' in options['offset'] ) ? options.offset.y : 0;
					var scaleX = ('scale' in options) && ( 'x' in options['scale'] ) ? options.scale.x : 1;
					var scaleY = ('scale' in options) && ( 'y' in options['scale'] ) ? options.scale.y : 1;
					rP.x *= scaleX;
					rP.y *= scaleY;
					rP.x += offsetX;
					rP.y += offsetY;
					return rP;
				},
				// maps the point to a 3D parabolic shape and then uses a pinhole camera approace to map it back to 2D coords
				'pinhole': function( rP, options ) {
					var offsetX = ('offset' in options) && ( 'x' in options['offset'] ) ? options.offset.x : 0;
					var offsetY = ('offset' in options) && ( 'y' in options['offset'] ) ? options.offset.y : 0;
					var offsetZ = ('offset' in options) && ( 'z' in options['offset'] ) ? options.offset.z : 0;
					var w = ('w' in options) ? options.w : 500;
					var h = ('h' in options) ? options.h : 500;
					var spread = 100;
					var shift = -100;
					rP.x += offsetX;
					rP.y += offsetY;
					if( rP.x > 0 ) {
						rP.z = Math.pow( ( ( rP.x - shift ) / spread ), 2) + offsetZ;
					} else {
						rP.z = Math.pow( ( ( rP.x - shift ) / spread / 2 ), 2) + offsetZ;
					}
					// make it a bit deeper based on time
					if( rP.time ) rP.z += rP.time / 50;
					var v = 2 / ( rP.z );
					rP.x = rP.x * v * ( h / 2 ) + ( w / 2 );
					rP.y = rP.y * v * ( h / 2 ) + ( h / 2 );
					return rP;
				}
			};
			// create a new object based on our point. Basically this will be a clone of the gmlPoint w/o functions
			var rP = { x: point.x, y: point.y, z: point.z, time: point.time, significance: point.significance, angle: point.angle, speed: point.speed };
			// run the appropriate function and return the result
			return ( 'mode' in options ) && ( options['mode'] in modes ) ? 
				modes[options['mode']]( rP, options ) : modes['pinhole']( rP, options );
		},
		// returns a subset of strokes for the given time
		strokesAtTime: function ( strokes, time ) {
			// if( time > this.maxTime ) return this.strokes;
			var sat = [[]];
			var curIndex = [0, 0];
			var nextPoint = strokes[curIndex[0]][curIndex[1]];
			while( nextPoint.time < time ) {
				sat[sat.length - 1].push( nextPoint );
				curIndex[1]++;
				if( strokes[curIndex[0]].length == curIndex[1] ) {
					// next stroke if we've got another
					if( strokes.length == curIndex[0] + 1 ) break;
					curIndex[0]++;
					curIndex[1] = 0;
					sat.push([]);
				}
				nextPoint = strokes[curIndex[0]][curIndex[1]];
			}
			return sat;
		},
		// renders a scene for the viz
		// accepted options - cursor { x, y }, width, height
		renderScene: function( scene, options ) {
			var lastMarkStart;
			var w = options.width;
			var h = options.height;
			for( var i = scene.objects.length - 1; i >= 0; i-- ) {
				// set our offset based on the camera and the marks position
				var offset = {
					x: scene.objects[i].position.x - scene.camera.position.x,
					y: scene.objects[i].position.y - scene.camera.position.y,
					z: scene.objects[i].position.z - scene.camera.position.z
				};
				colorBase = scene.objects[i].color;
				var translateOptions = {
					offset: offset,
					w: options.width,
					h: options.height,
					mode: 'pinhole'
				};
				if( i < scene.objects.length - 1 && !( scene.objects[i].reference in scene.timers ) ) {
					// draw the connection
					var offset1 = {
						x: scene.objects[i+1].position.x - scene.camera.position.x,
						y: scene.objects[i+1].position.y - scene.camera.position.y,
						z: scene.objects[i+1].position.z - scene.camera.position.z
					};
					var offset2 = {
						x: scene.objects[i].position.x - scene.camera.position.x,
						y: scene.objects[i].position.y - scene.camera.position.y,
						z: scene.objects[i].position.z - scene.camera.position.z
					};
					var p1 = scene.objects[i+1].leftmostStrokeStart();
					var p2 = scene.objects[i].rightmostStrokeEnd();
					Mark.connectionBrush( scene.canvasContext , p1, p2, offset1, offset2, w, h );
				}
				
				var translateOptions = {
					offset: offset,
					w: options.width,
					h: options.height,
					mode: 'pinhole'
				};
				// DRAW THAT MARK
				if( scene.objects[i].reference in scene.timers ) {
					// render a mark that is currently being replayed
					var strokes = mark.renderer.strokesAtTime( 
						scene.objects[i].strokes, 
						( ( new Date() ).getTime() - scene.timers[scene.objects[i].reference].start ) * scene.timers[scene.objects[i].reference].speed );
					if( strokes && strokes.length > 0 && strokes[0].length > 0 ) 
						scene.objects[i].renderedBounds = 
							Mark.thickMarkBrush( scene.canvasContext, strokes, translateOptions, colorBase, options.width, options.height );
				} else {
					// render a mark that is not being played back
					scene.objects[i].renderedBounds = 
						Mark.thickMarkBrush( scene.canvasContext, scene.objects[i].strokes, translateOptions, colorBase, options.width, options.height );
				}
			}
		},
		// simpler render method for playing back an individual mark using our flatScale translate method
		// accepted options - timer, width, height, offset {x, y}, scale, color
		renderMark: function( canvasContext, aMark, options ) {
			// DRAW THAT MARK
			var translateOptions = {
				offset: options.offset, 
				scale: options.scale,
				mode: 'flatScale'
			};
			if( 'timer' in options && options.timer ) {
				// render a mark that is currently being replayed
				var strokes = mark.renderer.strokesAtTime( aMark.strokes, ( ( new Date() ).getTime() - options.timer.start ) * options.timer.speed );
				if( strokes && strokes.length > 0 && strokes[0].length > 0 ) 
					aMark.renderedBounds = Mark.thickMarkBrush( canvasContext, strokes, translateOptions, options.color  );
			} else {
				// render a mark that is not being played back
				aMark.renderedBounds = Mark.thickMarkBrush( canvasContext, aMark.strokes, translateOptions, options.color );
			}
		}
	};
	
	return mark; 
}( Mark || {} ) );

var Mark = ( function ( mark ) { 
	
	// This is currently very rudimentry
	// no projection math happening, just some offsets to consult when rendering marks
	
	mark.camera = function ( ) {
	
		this.position = new mark.vector( 0, 0 ,-1000 );
		
	};
	
	return mark;
	
}( Mark || {} ) );
var Mark = ( function ( mark ) { 
	
	// Basic classes for use throughout Mark
	
	mark.vector = function ( x, y, z ) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}
	
	return mark;
	
}( Mark || {} ) );
/**
 * @author sole / http://soledadpenades.com
 * @author mr.doob / http://mrdoob.com
 * @author Robert Eisele / http://www.xarg.org
 * @author Philippe / http://philippe.elsass.me
 * @author Robert Penner / http://www.robertpenner.com/easing_terms_of_use.html
 */

var TWEEN = TWEEN || ( function() {

	var i, n, time, tweens = [];

	this.add = function ( tween ) {

		tweens.push( tween );

	};

	this.remove = function ( tween ) {

		i = tweens.indexOf( tween );

		if ( i !== -1 ) {

			tweens.splice( i, 1 );

		}

	};

	this.update = function () {

		i = 0;
		n = tweens.length;
		time = new Date().getTime();

		while ( i < n ) {

			if ( tweens[ i ].update( time ) ) {

				i++;

			} else {

				tweens.splice( i, 1 );
				n--;

			}

		}

	};

	return this;

} )();

TWEEN.Tween = function ( object ) {

	var _object = object,
	_valuesStart = {},
	_valuesDelta = {},
	_valuesEnd = {},
	_duration = 1000,
	_delayTime = 0,
	_startTime = null,
	_easingFunction = TWEEN.Easing.Linear.EaseNone,
	_chainedTween = null,
	_onUpdateCallback = null,
	_onCompleteCallback = null;

	this.to = function ( properties, duration ) {

		if( duration !== null ) {

			_duration = duration;

		}

		for ( var property in properties ) {

			// This prevents the engine from interpolating null values
			if ( _object[ property ] === null ) {

				continue;

			}

			// The current values are read when the tween starts;
			// here we only store the final desired values
			_valuesEnd[ property ] = properties[ property ];

		}

		return this;

	};

	this.start = function () {

		TWEEN.add( this );

		_startTime = new Date().getTime() + _delayTime;

		for ( var property in _valuesEnd ) {

			// Again, prevent dealing with null values
			if ( _object[ property ] === null ) {

				continue;

			}

			_valuesStart[ property ] = _object[ property ];
			_valuesDelta[ property ] = _valuesEnd[ property ] - _object[ property ];

		}

		return this;
	};

	this.stop = function () {

		TWEEN.remove( this );
		return this;

	};

	this.delay = function ( amount ) {

		_delayTime = amount;
		return this;

	};

	this.easing = function ( easing ) {

		_easingFunction = easing;
		return this;

	};

	this.chain = function ( chainedTween ) {

		_chainedTween = chainedTween;

	};

	this.onUpdate = function ( onUpdateCallback ) {

		_onUpdateCallback = onUpdateCallback;
		return this;

	};

	this.onComplete = function ( onCompleteCallback ) {

		_onCompleteCallback = onCompleteCallback;
		return this;

	};

	this.update = function ( time ) {

		var property, elapsed, value;

		if ( time < _startTime ) {

			return true;

		}

		elapsed = ( time - _startTime ) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction( elapsed );

		for ( property in _valuesDelta ) {

			_object[ property ] = _valuesStart[ property ] + _valuesDelta[ property ] * value;

		}

		if ( _onUpdateCallback !== null ) {

			_onUpdateCallback.call( _object, value );

		}

		if ( elapsed == 1 ) {

			if ( _onCompleteCallback !== null ) {

				_onCompleteCallback.call( _object );

			}

			if ( _chainedTween !== null ) {

				_chainedTween.start();

			}

			return false;

		}

		return true;

	};

	/*
	this.destroy = function () {

		TWEEN.remove( this );

	};
	*/
}

TWEEN.Easing = { Linear: {}, Quadratic: {}, Cubic: {}, Quartic: {}, Quintic: {}, Sinusoidal: {}, Exponential: {}, Circular: {}, Elastic: {}, Back: {}, Bounce: {} };


TWEEN.Easing.Linear.EaseNone = function ( k ) {

	return k;

};

//

TWEEN.Easing.Quadratic.EaseIn = function ( k ) {

	return k * k;

};

TWEEN.Easing.Quadratic.EaseOut = function ( k ) {

	return - k * ( k - 2 );

};

TWEEN.Easing.Quadratic.EaseInOut = function ( k ) {

	if ( ( k *= 2 ) < 1 ) return 0.5 * k * k;
	return - 0.5 * ( --k * ( k - 2 ) - 1 );

};

//

TWEEN.Easing.Cubic.EaseIn = function ( k ) {

	return k * k * k;

};

TWEEN.Easing.Cubic.EaseOut = function ( k ) {

	return --k * k * k + 1;

};

TWEEN.Easing.Cubic.EaseInOut = function ( k ) {

	if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k;
	return 0.5 * ( ( k -= 2 ) * k * k + 2 );

};

//

TWEEN.Easing.Quartic.EaseIn = function ( k ) {

	return k * k * k * k;

};

TWEEN.Easing.Quartic.EaseOut = function ( k ) {

	 return - ( --k * k * k * k - 1 );

}

TWEEN.Easing.Quartic.EaseInOut = function ( k ) {

	if ( ( k *= 2 ) < 1) return 0.5 * k * k * k * k;
	return - 0.5 * ( ( k -= 2 ) * k * k * k - 2 );

};

//

TWEEN.Easing.Quintic.EaseIn = function ( k ) {

	return k * k * k * k * k;

};

TWEEN.Easing.Quintic.EaseOut = function ( k ) {

	return ( k = k - 1 ) * k * k * k * k + 1;

};

TWEEN.Easing.Quintic.EaseInOut = function ( k ) {

	if ( ( k *= 2 ) < 1 ) return 0.5 * k * k * k * k * k;
	return 0.5 * ( ( k -= 2 ) * k * k * k * k + 2 );

};

// 

TWEEN.Easing.Sinusoidal.EaseIn = function ( k ) {

	return - Math.cos( k * Math.PI / 2 ) + 1;

};

TWEEN.Easing.Sinusoidal.EaseOut = function ( k ) {

	return Math.sin( k * Math.PI / 2 );

};

TWEEN.Easing.Sinusoidal.EaseInOut = function ( k ) {

	return - 0.5 * ( Math.cos( Math.PI * k ) - 1 );

};

//

TWEEN.Easing.Exponential.EaseIn = function ( k ) {

	return k == 0 ? 0 : Math.pow( 2, 10 * ( k - 1 ) );

};

TWEEN.Easing.Exponential.EaseOut = function ( k ) {

	return k == 1 ? 1 : - Math.pow( 2, - 10 * k ) + 1;

};

TWEEN.Easing.Exponential.EaseInOut = function ( k ) {

	if ( k == 0 ) return 0;
        if ( k == 1 ) return 1;
        if ( ( k *= 2 ) < 1 ) return 0.5 * Math.pow( 2, 10 * ( k - 1 ) );
        return 0.5 * ( - Math.pow( 2, - 10 * ( k - 1 ) ) + 2 );

};

// 

TWEEN.Easing.Circular.EaseIn = function ( k ) {

	return - ( Math.sqrt( 1 - k * k ) - 1);

};

TWEEN.Easing.Circular.EaseOut = function ( k ) {

	return Math.sqrt( 1 - --k * k );

};

TWEEN.Easing.Circular.EaseInOut = function ( k ) {

	if ( ( k /= 0.5 ) < 1) return - 0.5 * ( Math.sqrt( 1 - k * k) - 1);
	return 0.5 * ( Math.sqrt( 1 - ( k -= 2) * k) + 1);

};

//

TWEEN.Easing.Elastic.EaseIn = function( k ) {

	var s, a = 0.1, p = 0.4;
	if ( k == 0 ) return 0; if ( k == 1 ) return 1; if ( !p ) p = 0.3;
	if ( !a || a < 1 ) { a = 1; s = p / 4; }
	else s = p / ( 2 * Math.PI ) * Math.asin( 1 / a );
	return - ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );

};

TWEEN.Easing.Elastic.EaseOut = function( k ) {

	var s, a = 0.1, p = 0.4;
	if ( k == 0 ) return 0; if ( k == 1 ) return 1; if ( !p ) p = 0.3;
	if ( !a || a < 1 ) { a = 1; s = p / 4; }
	else s = p / ( 2 * Math.PI ) * Math.asin( 1 / a );
	return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

};

TWEEN.Easing.Elastic.EaseInOut = function( k ) {

	var s, a = 0.1, p = 0.4;
	if ( k == 0 ) return 0; if ( k == 1 ) return 1; if ( !p ) p = 0.3;
        if ( !a || a < 1 ) { a = 1; s = p / 4; }
        else s = p / ( 2 * Math.PI ) * Math.asin( 1 / a );
        if ( ( k *= 2 ) < 1 ) return - 0.5 * ( a * Math.pow( 2, 10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) );
        return a * Math.pow( 2, -10 * ( k -= 1 ) ) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) * 0.5 + 1;

};

//

TWEEN.Easing.Back.EaseIn = function( k ) {

	var s = 1.70158;
	return k * k * ( ( s + 1 ) * k - s );

};

TWEEN.Easing.Back.EaseOut = function( k ) {

	var s = 1.70158;
	return ( k = k - 1 ) * k * ( ( s + 1 ) * k + s ) + 1;

};

TWEEN.Easing.Back.EaseInOut = function( k ) {

	var s = 1.70158 * 1.525;
	if ( ( k *= 2 ) < 1 ) return 0.5 * ( k * k * ( ( s + 1 ) * k - s ) );
	return 0.5 * ( ( k -= 2 ) * k * ( ( s + 1 ) * k + s ) + 2 );

};

// 

TWEEN.Easing.Bounce.EaseIn = function( k ) {

	return 1 - TWEEN.Easing.Bounce.EaseOut( 1 - k );

};

TWEEN.Easing.Bounce.EaseOut = function( k ) {

	if ( ( k /= 1 ) < ( 1 / 2.75 ) ) {

		return 7.5625 * k * k;

	} else if ( k < ( 2 / 2.75 ) ) {

		return 7.5625 * ( k -= ( 1.5 / 2.75 ) ) * k + 0.75;

	} else if ( k < ( 2.5 / 2.75 ) ) {

		return 7.5625 * ( k -= ( 2.25 / 2.75 ) ) * k + 0.9375;

	} else {

		return 7.5625 * ( k -= ( 2.625 / 2.75 ) ) * k + 0.984375;

	}

};

TWEEN.Easing.Bounce.EaseInOut = function( k ) {

	if ( k < 0.5 ) return TWEEN.Easing.Bounce.EaseIn( k * 2 ) * 0.5;
	return TWEEN.Easing.Bounce.EaseOut( k * 2 - 1 ) * 0.5 + 0.5;

};
// name: sammy
// version: 0.6.3

// Sammy.js / http://sammyjs.org

(function($, window) {

	var Sammy,
			PATH_REPLACER = "([^\/]+)",
			PATH_NAME_MATCHER = /:([\w\d]+)/g,
			QUERY_STRING_MATCHER = /\?([^#]*)$/,
			// mainly for making `arguments` an Array
			_makeArray = function(nonarray) { return Array.prototype.slice.call(nonarray); },
			// borrowed from jQuery
			_isFunction = function( obj ) { return Object.prototype.toString.call(obj) === "[object Function]"; },
			_isArray = function( obj ) { return Object.prototype.toString.call(obj) === "[object Array]"; },
			_decode = function( str ) { return decodeURIComponent(str.replace(/\+/g, ' ')); },
			_encode = encodeURIComponent,
			_escapeHTML = function(s) {
				return String(s).replace(/&(?!\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
			},
			_routeWrapper = function(verb) {
				return function(path, callback) { return this.route.apply(this, [verb, path, callback]); };
			},
			_template_cache = {},
			loggers = [];


	// `Sammy` (also aliased as $.sammy) is not only the namespace for a
	// number of prototypes, its also a top level method that allows for easy
	// creation/management of `Sammy.Application` instances. There are a
	// number of different forms for `Sammy()` but each returns an instance
	// of `Sammy.Application`. When a new instance is created using
	// `Sammy` it is added to an Object called `Sammy.apps`. This
	// provides for an easy way to get at existing Sammy applications. Only one
	// instance is allowed per `element_selector` so when calling
	// `Sammy('selector')` multiple times, the first time will create
	// the application and the following times will extend the application
	// already added to that selector.
	//
	// ### Example
	//
	//			// returns the app at #main or a new app
	//			Sammy('#main')
	//
	//			// equivilent to "new Sammy.Application", except appends to apps
	//			Sammy();
	//			Sammy(function() { ... });
	//
	//			// extends the app at '#main' with function.
	//			Sammy('#main', function() { ... });
	//
	Sammy = function() {
		var args = _makeArray(arguments),
				app, selector;
		Sammy.apps = Sammy.apps || {};
		if (args.length === 0 || args[0] && _isFunction(args[0])) { // Sammy()
			return Sammy.apply(Sammy, ['body'].concat(args));
		} else if (typeof (selector = args.shift()) == 'string') { // Sammy('#main')
			app = Sammy.apps[selector] || new Sammy.Application();
			app.element_selector = selector;
			if (args.length > 0) {
				$.each(args, function(i, plugin) {
					app.use(plugin);
				});
			}
			// if the selector changes make sure the refrence in Sammy.apps changes
			if (app.element_selector != selector) {
				delete Sammy.apps[selector];
			}
			Sammy.apps[app.element_selector] = app;
			return app;
		}
	};

	Sammy.VERSION = '0.6.3';

	// Add to the global logger pool. Takes a function that accepts an
	// unknown number of arguments and should print them or send them somewhere
	// The first argument is always a timestamp.
	Sammy.addLogger = function(logger) {
		loggers.push(logger);
	};

	// Sends a log message to each logger listed in the global
	// loggers pool. Can take any number of arguments.
	// Also prefixes the arguments with a timestamp.
	Sammy.log = function()	{
		var args = _makeArray(arguments);
		args.unshift("[" + Date() + "]");
		$.each(loggers, function(i, logger) {
			logger.apply(Sammy, args);
		});
	};

	if (typeof window.console != 'undefined') {
		if (_isFunction(window.console.log.apply)) {
			Sammy.addLogger(function() {
				window.console.log.apply(window.console, arguments);
			});
		} else {
			Sammy.addLogger(function() {
				window.console.log(arguments);
			});
		}
	} else if (typeof console != 'undefined') {
		Sammy.addLogger(function() {
			console.log.apply(console, arguments);
		});
	}

	$.extend(Sammy, {
		makeArray: _makeArray,
		isFunction: _isFunction,
		isArray: _isArray
	})

	// Sammy.Object is the base for all other Sammy classes. It provides some useful
	// functionality, including cloning, iterating, etc.
	Sammy.Object = function(obj) { // constructor
		return $.extend(this, obj || {});
	};

	$.extend(Sammy.Object.prototype, {

		// Escape HTML in string, use in templates to prevent script injection.
		// Also aliased as `h()`
		escapeHTML: _escapeHTML,
		h: _escapeHTML,

		// Returns a copy of the object with Functions removed.
		toHash: function() {
			var json = {};
			$.each(this, function(k,v) {
				if (!_isFunction(v)) {
					json[k] = v;
				}
			});
			return json;
		},

		// Renders a simple HTML version of this Objects attributes.
		// Does not render functions.
		// For example. Given this Sammy.Object:
		//
		//		 var s = new Sammy.Object({first_name: 'Sammy', last_name: 'Davis Jr.'});
		//		 s.toHTML()
		//		 //=> '<strong>first_name</strong> Sammy<br /><strong>last_name</strong> Davis Jr.<br />'
		//
		toHTML: function() {
			var display = "";
			$.each(this, function(k, v) {
				if (!_isFunction(v)) {
					display += "<strong>" + k + "</strong> " + v + "<br />";
				}
			});
			return display;
		},

		// Returns an array of keys for this object. If `attributes_only`
		// is true will not return keys that map to a `function()`
		keys: function(attributes_only) {
			var keys = [];
			for (var property in this) {
				if (!_isFunction(this[property]) || !attributes_only) {
					keys.push(property);
				}
			}
			return keys;
		},

		// Checks if the object has a value at `key` and that the value is not empty
		has: function(key) {
			return this[key] && $.trim(this[key].toString()) != '';
		},

		// convenience method to join as many arguments as you want
		// by the first argument - useful for making paths
		join: function() {
			var args = _makeArray(arguments);
			var delimiter = args.shift();
			return args.join(delimiter);
		},

		// Shortcut to Sammy.log
		log: function() {
			Sammy.log.apply(Sammy, arguments);
		},

		// Returns a string representation of this object.
		// if `include_functions` is true, it will also toString() the
		// methods of this object. By default only prints the attributes.
		toString: function(include_functions) {
			var s = [];
			$.each(this, function(k, v) {
				if (!_isFunction(v) || include_functions) {
					s.push('"' + k + '": ' + v.toString());
				}
			});
			return "Sammy.Object: {" + s.join(',') + "}";
		}
	});

	// The HashLocationProxy is the default location proxy for all Sammy applications.
	// A location proxy is a prototype that conforms to a simple interface. The purpose
	// of a location proxy is to notify the Sammy.Application its bound to when the location
	// or 'external state' changes. The HashLocationProxy considers the state to be
	// changed when the 'hash' (window.location.hash / '#') changes. It does this in two
	// different ways depending on what browser you are using. The newest browsers
	// (IE, Safari > 4, FF >= 3.6) support a 'onhashchange' DOM event, thats fired whenever
	// the location.hash changes. In this situation the HashLocationProxy just binds
	// to this event and delegates it to the application. In the case of older browsers
	// a poller is set up to track changes to the hash. Unlike Sammy 0.3 or earlier,
	// the HashLocationProxy allows the poller to be a global object, eliminating the
	// need for multiple pollers even when thier are multiple apps on the page.
	Sammy.HashLocationProxy = function(app, run_interval_every) {
		this.app = app;
		// set is native to false and start the poller immediately
		this.is_native = false;
		this._startPolling(run_interval_every);
	};

	Sammy.HashLocationProxy.prototype = {

		// bind the proxy events to the current app.
		bind: function() {
			var proxy = this, app = this.app;
			$(window).bind('hashchange.' + this.app.eventNamespace(), function(e, non_native) {
				// if we receive a native hash change event, set the proxy accordingly
				// and stop polling
				if (proxy.is_native === false && !non_native) {
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
		},

		// unbind the proxy events from the current app
		unbind: function() {
			$(window).unbind('hashchange.' + this.app.eventNamespace());
			Sammy.HashLocationProxy._bindings--;
			if (Sammy.HashLocationProxy._bindings <= 0) {
				window.clearInterval(Sammy.HashLocationProxy._interval);
			}
		},

		// get the current location from the hash.
		getLocation: function() {
		 // Bypass the `window.location.hash` attribute.	If a question mark
			// appears in the hash IE6 will strip it and all of the following
			// characters from `window.location.hash`.
			var matches = window.location.toString().match(/^[^#]*(#.+)$/);
			return matches ? matches[1] : '';
		},

		// set the current location to `new_location`
		setLocation: function(new_location) {
			return (window.location = new_location);
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


	// Sammy.Application is the Base prototype for defining 'applications'.
	// An 'application' is a collection of 'routes' and bound events that is
	// attached to an element when `run()` is called.
	// The only argument an 'app_function' is evaluated within the context of the application.
	Sammy.Application = function(app_function) {
		var app = this;
		this.routes						 = {};
		this.listeners				 = new Sammy.Object({});
		this.arounds					 = [];
		this.befores					 = [];
		// generate a unique namespace
		this.namespace				 = (new Date()).getTime() + '-' + parseInt(Math.random() * 1000, 10);
		this.context_prototype = function() { Sammy.EventContext.apply(this, arguments); };
		this.context_prototype.prototype = new Sammy.EventContext();

		if (_isFunction(app_function)) {
			app_function.apply(this, [this]);
		}
		// set the location proxy if not defined to the default (HashLocationProxy)
		if (!this._location_proxy) {
			this.setLocationProxy(new Sammy.HashLocationProxy(this, this.run_interval_every));
		}
		if (this.debug) {
			this.bindToAllEvents(function(e, data) {
				app.log(app.toString(), e.cleaned_type, data || {});
			});
		}
	};

	Sammy.Application.prototype = $.extend({}, Sammy.Object.prototype, {

		// the four route verbs
		ROUTE_VERBS: ['get','post','put','delete'],

		// An array of the default events triggered by the
		// application during its lifecycle
		APP_EVENTS: ['run', 'unload', 'lookup-route', 'run-route', 'route-found', 'event-context-before', 'event-context-after', 'changed', 'error', 'check-form-submission', 'redirect', 'location-changed'],

		_last_route: null,
		_location_proxy: null,
		_running: false,

		// Defines what element the application is bound to. Provide a selector
		// (parseable by `jQuery()`) and this will be used by `$element()`
		element_selector: 'body',

		// When set to true, logs all of the default events using `log()`
		debug: false,

		// When set to true, and the error() handler is not overriden, will actually
		// raise JS errors in routes (500) and when routes can't be found (404)
		raise_errors: false,

		// The time in milliseconds that the URL is queried for changes
		run_interval_every: 50,

		// The default template engine to use when using `partial()` in an
		// `EventContext`. `template_engine` can either be a string that
		// corresponds to the name of a method/helper on EventContext or it can be a function
		// that takes two arguments, the content of the unrendered partial and an optional
		// JS object that contains interpolation data. Template engine is only called/refered
		// to if the extension of the partial is null or unknown. See `partial()`
		// for more information
		template_engine: null,

		// //=> Sammy.Application: body
		toString: function() {
			return 'Sammy.Application:' + this.element_selector;
		},

		// returns a jQuery object of the Applications bound element.
		$element: function(selector) {
			return selector ? $(this.element_selector).find(selector) : $(this.element_selector);
		},

		// `use()` is the entry point for including Sammy plugins.
		// The first argument to use should be a function() that is evaluated
		// in the context of the current application, just like the `app_function`
		// argument to the `Sammy.Application` constructor.
		//
		// Any additional arguments are passed to the app function sequentially.
		//
		// For much more detail about plugins, check out:
		// [http://sammyjs.org/docs/plugins](http://sammyjs.org/docs/plugins)
		//
		// ### Example
		//
		//			var MyPlugin = function(app, prepend) {
		//
		//				this.helpers({
		//					myhelper: function(text) {
		//						alert(prepend + " " + text);
		//					}
		//				});
		//
		//			};
		//
		//			var app = $.sammy(function() {
		//
		//				this.use(MyPlugin, 'This is my plugin');
		//
		//				this.get('#/', function() {
		//					this.myhelper('and dont you forget it!');
		//					//=> Alerts: This is my plugin and dont you forget it!
		//				});
		//
		//			});
		//
		// If plugin is passed as a string it assumes your are trying to load
		// Sammy."Plugin". This is the prefered way of loading core Sammy plugins
		// as it allows for better error-messaging.
		//
		// ### Example
		//
		//			$.sammy(function() {
		//				this.use('Mustache'); //=> Sammy.Mustache
		//				this.use('Storage'); //=> Sammy.Storage
		//			});
		//
		use: function() {
			// flatten the arguments
			var args = _makeArray(arguments),
					plugin = args.shift(),
					plugin_name = plugin || '';
			try {
				args.unshift(this);
				if (typeof plugin == 'string') {
					plugin_name = 'Sammy.' + plugin;
					plugin = Sammy[plugin];
				}
				plugin.apply(this, args);
			} catch(e) {
				if (typeof plugin === 'undefined') {
					this.error("Plugin Error: called use() but plugin (" + plugin_name.toString() + ") is not defined", e);
				} else if (!_isFunction(plugin)) {
					this.error("Plugin Error: called use() but '" + plugin_name.toString() + "' is not a function", e);
				} else {
					this.error("Plugin Error", e);
				}
			}
			return this;
		},

		// Sets the location proxy for the current app. By default this is set to
		// a new `Sammy.HashLocationProxy` on initialization. However, you can set
		// the location_proxy inside you're app function to give your app a custom
		// location mechanism. See `Sammy.HashLocationProxy` and `Sammy.DataLocationProxy`
		// for examples.
		//
		// `setLocationProxy()` takes an initialized location proxy.
		//
		// ### Example
		//
		//				// to bind to data instead of the default hash;
		//				var app = $.sammy(function() {
		//					this.setLocationProxy(new Sammy.DataLocationProxy(this));
		//				});
		//
		setLocationProxy: function(new_proxy) {
			var original_proxy = this._location_proxy;
			this._location_proxy = new_proxy;
			if (this.isRunning()) {
				if (original_proxy) {
					// if there is already a location proxy, unbind it.
					original_proxy.unbind();
				}
				this._location_proxy.bind();
			}
		},

		// `route()` is the main method for defining routes within an application.
		// For great detail on routes, check out:
		// [http://sammyjs.org/docs/routes](http://sammyjs.org/docs/routes)
		//
		// This method also has aliases for each of the different verbs (eg. `get()`, `post()`, etc.)
		//
		// ### Arguments
		//
		// * `verb` A String in the set of ROUTE_VERBS or 'any'. 'any' will add routes for each
		//		of the ROUTE_VERBS. If only two arguments are passed,
		//		the first argument is the path, the second is the callback and the verb
		//		is assumed to be 'any'.
		// * `path` A Regexp or a String representing the path to match to invoke this verb.
		// * `callback` A Function that is called/evaluated whent the route is run see: `runRoute()`.
		//		It is also possible to pass a string as the callback, which is looked up as the name
		//		of a method on the application.
		//
		route: function(verb, path, callback) {
			var app = this, param_names = [], add_route, path_match;

			// if the method signature is just (path, callback)
			// assume the verb is 'any'
			if (!callback && _isFunction(path)) {
				path = verb;
				callback = path;
				verb = 'any';
			}

			verb = verb.toLowerCase(); // ensure verb is lower case

			// if path is a string turn it into a regex
			if (path.constructor == String) {

				// Needs to be explicitly set because IE will maintain the index unless NULL is returned,
				// which means that with two consecutive routes that contain params, the second set of params will not be found and end up in splat instead of params
				// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Global_Objects/RegExp/lastIndex
				PATH_NAME_MATCHER.lastIndex = 0;

				// find the names
				while ((path_match = PATH_NAME_MATCHER.exec(path)) !== null) {
					param_names.push(path_match[1]);
				}
				// replace with the path replacement
				path = new RegExp("^" + path.replace(PATH_NAME_MATCHER, PATH_REPLACER) + "$");
			}
			// lookup callback
			if (typeof callback == 'string') {
				callback = app[callback];
			}

			add_route = function(with_verb) {
				var r = {verb: with_verb, path: path, callback: callback, param_names: param_names};
				// add route to routes array
				app.routes[with_verb] = app.routes[with_verb] || [];
				// place routes in order of definition
				app.routes[with_verb].push(r);
			};

			if (verb === 'any') {
				$.each(this.ROUTE_VERBS, function(i, v) { add_route(v); });
			} else {
				add_route(verb);
			}

			// return the app
			return this;
		},

		// Alias for route('get', ...)
		get: _routeWrapper('get'),

		// Alias for route('post', ...)
		post: _routeWrapper('post'),

		// Alias for route('put', ...)
		put: _routeWrapper('put'),

		// Alias for route('delete', ...)
		del: _routeWrapper('delete'),

		// Alias for route('any', ...)
		any: _routeWrapper('any'),

		// `mapRoutes` takes an array of arrays, each array being passed to route()
		// as arguments, this allows for mass definition of routes. Another benefit is
		// this makes it possible/easier to load routes via remote JSON.
		//
		// ### Example
		//
		//			var app = $.sammy(function() {
		//
		//				this.mapRoutes([
		//						['get', '#/', function() { this.log('index'); }],
		//						// strings in callbacks are looked up as methods on the app
		//						['post', '#/create', 'addUser'],
		//						// No verb assumes 'any' as the verb
		//						[/dowhatever/, function() { this.log(this.verb, this.path)}];
		//					]);
		//			});
		//
		mapRoutes: function(route_array) {
			var app = this;
			$.each(route_array, function(i, route_args) {
				app.route.apply(app, route_args);
			});
			return this;
		},

		// A unique event namespace defined per application.
		// All events bound with `bind()` are automatically bound within this space.
		eventNamespace: function() {
			return ['sammy-app', this.namespace].join('-');
		},

		// Works just like `jQuery.fn.bind()` with a couple noteable differences.
		//
		// * It binds all events to the application element
		// * All events are bound within the `eventNamespace()`
		// * Events are not actually bound until the application is started with `run()`
		// * callbacks are evaluated within the context of a Sammy.EventContext
		//
		bind: function(name, data, callback) {
			var app = this;
			// build the callback
			// if the arity is 2, callback is the second argument
			if (typeof callback == 'undefined') { callback = data; }
			var listener_callback =	 function() {
				// pull off the context from the arguments to the callback
				var e, context, data;
				e				= arguments[0];
				data		= arguments[1];
				if (data && data.context) {
					context = data.context;
					delete data.context;
				} else {
					context = new app.context_prototype(app, 'bind', e.type, data, e.target);
				}
				e.cleaned_type = e.type.replace(app.eventNamespace(), '');
				callback.apply(context, [e, data]);
			};

			// it could be that the app element doesnt exist yet
			// so attach to the listeners array and then run()
			// will actually bind the event.
			if (!this.listeners[name]) { this.listeners[name] = []; }
			this.listeners[name].push(listener_callback);
			if (this.isRunning()) {
				// if the app is running
				// *actually* bind the event to the app element
				this._listen(name, listener_callback);
			}
			return this;
		},

		// Triggers custom events defined with `bind()`
		//
		// ### Arguments
		//
		// * `name` The name of the event. Automatically prefixed with the `eventNamespace()`
		// * `data` An optional Object that can be passed to the bound callback.
		// * `context` An optional context/Object in which to execute the bound callback.
		//	 If no context is supplied a the context is a new `Sammy.EventContext`
		//
		trigger: function(name, data) {
			this.$element().trigger([name, this.eventNamespace()].join('.'), [data]);
			return this;
		},

		// Reruns the current route
		refresh: function() {
			this.last_location = null;
			this.trigger('location-changed');
			return this;
		},

		// Takes a single callback that is pushed on to a stack.
		// Before any route is run, the callbacks are evaluated in order within
		// the current `Sammy.EventContext`
		//
		// If any of the callbacks explicitly return false, execution of any
		// further callbacks and the route itself is halted.
		//
		// You can also provide a set of options that will define when to run this
		// before based on the route it proceeds.
		//
		// ### Example
		//
		//			var app = $.sammy(function() {
		//
		//				// will run at #/route but not at #/
		//				this.before('#/route', function() {
		//					//...
		//				});
		//
		//				// will run at #/ but not at #/route
		//				this.before({except: {path: '#/route'}}, function() {
		//					this.log('not before #/route');
		//				});
		//
		//				this.get('#/', function() {});
		//
		//				this.get('#/route', function() {});
		//
		//			});
		//
		// See `contextMatchesOptions()` for a full list of supported options
		//
		before: function(options, callback) {
			if (_isFunction(options)) {
				callback = options;
				options = {};
			}
			this.befores.push([options, callback]);
			return this;
		},

		// A shortcut for binding a callback to be run after a route is executed.
		// After callbacks have no guarunteed order.
		after: function(callback) {
			return this.bind('event-context-after', callback);
		},


		// Adds an around filter to the application. around filters are functions
		// that take a single argument `callback` which is the entire route
		// execution path wrapped up in a closure. This means you can decide whether
		// or not to proceed with execution by not invoking `callback` or,
		// more usefuly wrapping callback inside the result of an asynchronous execution.
		//
		// ### Example
		//
		// The most common use case for around() is calling a _possibly_ async function
		// and executing the route within the functions callback:
		//
		//			var app = $.sammy(function() {
		//
		//				var current_user = false;
		//
		//				function checkLoggedIn(callback) {
		//					// /session returns a JSON representation of the logged in user
		//					// or an empty object
		//					if (!current_user) {
		//						$.getJSON('/session', function(json) {
		//							if (json.login) {
		//								// show the user as logged in
		//								current_user = json;
		//								// execute the route path
		//								callback();
		//							} else {
		//								// show the user as not logged in
		//								current_user = false;
		//								// the context of aroundFilters is an EventContext
		//								this.redirect('#/login');
		//							}
		//						});
		//					} else {
		//						// execute the route path
		//						callback();
		//					}
		//				};
		//
		//				this.around(checkLoggedIn);
		//
		//			});
		//
		around: function(callback) {
			this.arounds.push(callback);
			return this;
		},

		// Returns `true` if the current application is running.
		isRunning: function() {
			return this._running;
		},

		// Helpers extends the EventContext prototype specific to this app.
		// This allows you to define app specific helper functions that can be used
		// whenever you're inside of an event context (templates, routes, bind).
		//
		// ### Example
		//
		//		 var app = $.sammy(function() {
		//
		//			 helpers({
		//				 upcase: function(text) {
		//					return text.toString().toUpperCase();
		//				 }
		//			 });
		//
		//			 get('#/', function() { with(this) {
		//				 // inside of this context I can use the helpers
		//				 $('#main').html(upcase($('#main').text());
		//			 }});
		//
		//		 });
		//
		//
		// ### Arguments
		//
		// * `extensions` An object collection of functions to extend the context.
		//
		helpers: function(extensions) {
			$.extend(this.context_prototype.prototype, extensions);
			return this;
		},

		// Helper extends the event context just like `helpers()` but does it
		// a single method at a time. This is especially useful for dynamically named
		// helpers
		//
		// ### Example
		//
		//		 // Trivial example that adds 3 helper methods to the context dynamically
		//		 var app = $.sammy(function(app) {
		//
		//			 $.each([1,2,3], function(i, num) {
		//				 app.helper('helper' + num, function() {
		//					 this.log("I'm helper number " + num);
		//				 });
		//			 });
		//
		//			 this.get('#/', function() {
		//				 this.helper2(); //=> I'm helper number 2
		//			 });
		//		 });
		//
		// ### Arguments
		//
		// * `name` The name of the method
		// * `method` The function to be added to the prototype at `name`
		//
		helper: function(name, method) {
			this.context_prototype.prototype[name] = method;
			return this;
		},

		// Actually starts the application's lifecycle. `run()` should be invoked
		// within a document.ready block to ensure the DOM exists before binding events, etc.
		//
		// ### Example
		//
		//		 var app = $.sammy(function() { ... }); // your application
		//		 $(function() { // document.ready
		//				app.run();
		//		 });
		//
		// ### Arguments
		//
		// * `start_url` Optionally, a String can be passed which the App will redirect to
		//	 after the events/routes have been bound.
		run: function(start_url) {
			if (this.isRunning()) { return false; }
			var app = this;

			// actually bind all the listeners
			$.each(this.listeners.toHash(), function(name, callbacks) {
				$.each(callbacks, function(i, listener_callback) {
					app._listen(name, listener_callback);
				});
			});

			this.trigger('run', {start_url: start_url});
			this._running = true;
			// set last location
			this.last_location = null;
			if (this.getLocation() == '' && typeof start_url != 'undefined') {
				this.setLocation(start_url);
			}
			// check url
			this._checkLocation();
			this._location_proxy.bind();
			this.bind('location-changed', function() {
				app._checkLocation();
			});

			// bind to submit to capture post/put/delete routes
			this.bind('submit', function(e) {
				var returned = app._checkFormSubmission($(e.target).closest('form'));
				return (returned === false) ? e.preventDefault() : false;
			});

			// bind unload to body unload
			$(window).bind('beforeunload', function() {
				app.unload();
			});

			// trigger html changed
			return this.trigger('changed');
		},

		// The opposite of `run()`, un-binds all event listeners and intervals
		// `run()` Automaticaly binds a `onunload` event to run this when
		// the document is closed.
		unload: function() {
			if (!this.isRunning()) { return false; }
			var app = this;
			this.trigger('unload');
			// clear interval
			this._location_proxy.unbind();
			// unbind form submits
			this.$element().unbind('submit').removeClass(app.eventNamespace());
			// unbind all events
			$.each(this.listeners.toHash() , function(name, listeners) {
				$.each(listeners, function(i, listener_callback) {
					app._unlisten(name, listener_callback);
				});
			});
			this._running = false;
			return this;
		},

		// Will bind a single callback function to every event that is already
		// being listened to in the app. This includes all the `APP_EVENTS`
		// as well as any custom events defined with `bind()`.
		//
		// Used internally for debug logging.
		bindToAllEvents: function(callback) {
			var app = this;
			// bind to the APP_EVENTS first
			$.each(this.APP_EVENTS, function(i, e) {
				app.bind(e, callback);
			});
			// next, bind to listener names (only if they dont exist in APP_EVENTS)
			$.each(this.listeners.keys(true), function(i, name) {
				if (app.APP_EVENTS.indexOf(name) == -1) {
					app.bind(name, callback);
				}
			});
			return this;
		},

		// Returns a copy of the given path with any query string after the hash
		// removed.
		routablePath: function(path) {
			return path.replace(QUERY_STRING_MATCHER, '');
		},

		// Given a verb and a String path, will return either a route object or false
		// if a matching route can be found within the current defined set.
		lookupRoute: function(verb, path) {
			var app = this, routed = false;
			this.trigger('lookup-route', {verb: verb, path: path});
			if (typeof this.routes[verb] != 'undefined') {
				$.each(this.routes[verb], function(i, route) {
					if (app.routablePath(path).match(route.path)) {
						routed = route;
						return false;
					}
				});
			}
			return routed;
		},

		// First, invokes `lookupRoute()` and if a route is found, parses the
		// possible URL params and then invokes the route's callback within a new
		// `Sammy.EventContext`. If the route can not be found, it calls
		// `notFound()`. If `raise_errors` is set to `true` and
		// the `error()` has not been overriden, it will throw an actual JS
		// error.
		//
		// You probably will never have to call this directly.
		//
		// ### Arguments
		//
		// * `verb` A String for the verb.
		// * `path` A String path to lookup.
		// * `params` An Object of Params pulled from the URI or passed directly.
		//
		// ### Returns
		//
		// Either returns the value returned by the route callback or raises a 404 Not Found error.
		//
		runRoute: function(verb, path, params, target) {
			var app = this,
					route = this.lookupRoute(verb, path),
					context,
					wrapped_route,
					arounds,
					around,
					befores,
					before,
					callback_args,
					path_params,
					final_returned;

			this.log('runRoute', [verb, path].join(' '));
			this.trigger('run-route', {verb: verb, path: path, params: params});
			if (typeof params == 'undefined') { params = {}; }

			$.extend(params, this._parseQueryString(path));

			if (route) {
				this.trigger('route-found', {route: route});
				// pull out the params from the path
				if ((path_params = route.path.exec(this.routablePath(path))) !== null) {
					// first match is the full path
					path_params.shift();
					// for each of the matches
					$.each(path_params, function(i, param) {
						// if theres a matching param name
						if (route.param_names[i]) {
							// set the name to the match
							params[route.param_names[i]] = _decode(param);
						} else {
							// initialize 'splat'
							if (!params.splat) { params.splat = []; }
							params.splat.push(_decode(param));
						}
					});
				}

				// set event context
				context	 = new this.context_prototype(this, verb, path, params, target);
				// ensure arrays
				arounds = this.arounds.slice(0);
				befores = this.befores.slice(0);
				// set the callback args to the context + contents of the splat
				callback_args = [context].concat(params.splat);
				// wrap the route up with the before filters
				wrapped_route = function() {
					var returned;
					while (befores.length > 0) {
						before = befores.shift();
						// check the options
						if (app.contextMatchesOptions(context, before[0])) {
							returned = before[1].apply(context, [context]);
							if (returned === false) { return false; }
						}
					}
					app.last_route = route;
					context.trigger('event-context-before', {context: context});
					returned = route.callback.apply(context, callback_args);
					context.trigger('event-context-after', {context: context});
					return returned;
				};
				$.each(arounds.reverse(), function(i, around) {
					var last_wrapped_route = wrapped_route;
					wrapped_route = function() { return around.apply(context, [last_wrapped_route]); };
				});
				try {
					final_returned = wrapped_route();
				} catch(e) {
					this.error(['500 Error', verb, path].join(' '), e);
				}
				return final_returned;
			} else {
				return this.notFound(verb, path);
			}
		},

		// Matches an object of options against an `EventContext` like object that
		// contains `path` and `verb` attributes. Internally Sammy uses this
		// for matching `before()` filters against specific options. You can set the
		// object to _only_ match certain paths or verbs, or match all paths or verbs _except_
		// those that match the options.
		//
		// ### Example
		//
		//		 var app = $.sammy(),
		//				 context = {verb: 'get', path: '#/mypath'};
		//
		//		 // match against a path string
		//		 app.contextMatchesOptions(context, '#/mypath'); //=> true
		//		 app.contextMatchesOptions(context, '#/otherpath'); //=> false
		//		 // equivilent to
		//		 app.contextMatchesOptions(context, {only: {path:'#/mypath'}}); //=> true
		//		 app.contextMatchesOptions(context, {only: {path:'#/otherpath'}}); //=> false
		//		 // match against a path regexp
		//		 app.contextMatchesOptions(context, /path/); //=> true
		//		 app.contextMatchesOptions(context, /^path/); //=> false
		//		 // match only a verb
		//		 app.contextMatchesOptions(context, {only: {verb:'get'}}); //=> true
		//		 app.contextMatchesOptions(context, {only: {verb:'post'}}); //=> false
		//		 // match all except a verb
		//		 app.contextMatchesOptions(context, {except: {verb:'post'}}); //=> true
		//		 app.contextMatchesOptions(context, {except: {verb:'get'}}); //=> false
		//		 // match all except a path
		//		 app.contextMatchesOptions(context, {except: {path:'#/otherpath'}}); //=> true
		//		 app.contextMatchesOptions(context, {except: {path:'#/mypath'}}); //=> false
		//
		contextMatchesOptions: function(context, match_options, positive) {
			// empty options always match
			var options = match_options;
			if (typeof options === 'undefined' || options == {}) {
				return true;
			}
			if (typeof positive === 'undefined') {
				positive = true;
			}
			// normalize options
			if (typeof options === 'string' || _isFunction(options.test)) {
				options = {path: options};
			}
			if (options.only) {
				return this.contextMatchesOptions(context, options.only, true);
			} else if (options.except) {
				return this.contextMatchesOptions(context, options.except, false);
			}
			var path_matched = true, verb_matched = true;
			if (options.path) {
				// wierd regexp test
				if (_isFunction(options.path.test)) {
					path_matched = options.path.test(context.path);
				} else {
					path_matched = (options.path.toString() === context.path);
				}
			}
			if (options.verb) {
				verb_matched = options.verb === context.verb;
			}
			return positive ? (verb_matched && path_matched) : !(verb_matched && path_matched);
		},


		// Delegates to the `location_proxy` to get the current location.
		// See `Sammy.HashLocationProxy` for more info on location proxies.
		getLocation: function() {
			return this._location_proxy.getLocation();
		},

		// Delegates to the `location_proxy` to set the current location.
		// See `Sammy.HashLocationProxy` for more info on location proxies.
		//
		// ### Arguments
		//
		// * `new_location` A new location string (e.g. '#/')
		//
		setLocation: function(new_location) {
			return this._location_proxy.setLocation(new_location);
		},

		// Swaps the content of `$element()` with `content`
		// You can override this method to provide an alternate swap behavior
		// for `EventContext.partial()`.
		//
		// ### Example
		//
		//			var app = $.sammy(function() {
		//
		//				// implements a 'fade out'/'fade in'
		//				this.swap = function(content) {
		//					this.$element().hide('slow').html(content).show('slow');
		//				}
		//
		//				get('#/', function() {
		//					this.partial('index.html.erb') // will fade out and in
		//				});
		//
		//			});
		//
		swap: function(content) {
			return this.$element().html(content);
		},

		// a simple global cache for templates. Uses the same semantics as
		// `Sammy.Cache` and `Sammy.Storage` so can easily be replaced with
		// a persistant storage that lasts beyond the current request.
		templateCache: function(key, value) {
			if (typeof value != 'undefined') {
				return _template_cache[key] = value;
			} else {
				return _template_cache[key];
			}
		},

		// clear the templateCache
		clearTemplateCache: function() {
			return _template_cache = {};
		},

		// This thows a '404 Not Found' error by invoking `error()`.
		// Override this method or `error()` to provide custom
		// 404 behavior (i.e redirecting to / or showing a warning)
		notFound: function(verb, path) {
			var ret = this.error(['404 Not Found', verb, path].join(' '));
			return (verb === 'get') ? ret : true;
		},

		// The base error handler takes a string `message` and an `Error`
		// object. If `raise_errors` is set to `true` on the app level,
		// this will re-throw the error to the browser. Otherwise it will send the error
		// to `log()`. Override this method to provide custom error handling
		// e.g logging to a server side component or displaying some feedback to the
		// user.
		error: function(message, original_error) {
			if (!original_error) { original_error = new Error(); }
			original_error.message = [message, original_error.message].join(' ');
			this.trigger('error', {message: original_error.message, error: original_error});
			if (this.raise_errors) {
				throw(original_error);
			} else {
				this.log(original_error.message, original_error);
			}
		},

		_checkLocation: function() {
			var location, returned;
			// get current location
			location = this.getLocation();
			// compare to see if hash has changed
			if (!this.last_location || this.last_location[0] != 'get' || this.last_location[1] != location) {
				// reset last location
				this.last_location = ['get', location];
				// lookup route for current hash
				returned = this.runRoute('get', location);
			}
			return returned;
		},

		_getFormVerb: function(form) {
			var $form = $(form), verb, $_method;
			$_method = $form.find('input[name="_method"]');
			if ($_method.length > 0) { verb = $_method.val(); }
			if (!verb) { verb = $form[0].getAttribute('method'); }
			if (!verb || verb == '') { verb = 'get'; }
			return $.trim(verb.toString().toLowerCase());
		},

		_checkFormSubmission: function(form) {
			var $form, path, verb, params, returned;
			this.trigger('check-form-submission', {form: form});
			$form = $(form);
			path	= $form.attr('action');
			verb	= this._getFormVerb($form);
			this.log('_checkFormSubmission', $form, path, verb);
			if (verb === 'get') {
				this.setLocation(path + '?' + this._serializeFormParams($form));
				returned = false;
			} else {
				params = $.extend({}, this._parseFormParams($form));
				returned = this.runRoute(verb, path, params, form.get(0));
			};
			return (typeof returned == 'undefined') ? false : returned;
		},

		_serializeFormParams: function($form) {
			 var queryString = "",
				 fields = $form.serializeArray(),
				 i;
			 if (fields.length > 0) {
				 queryString = this._encodeFormPair(fields[0].name, fields[0].value);
				 for (i = 1; i < fields.length; i++) {
					 queryString = queryString + "&" + this._encodeFormPair(fields[i].name, fields[i].value);
				 }
			 }
			 return queryString;
		},

		_encodeFormPair: function(name, value){
			return _encode(name) + "=" + _encode(value);
		},

		_parseFormParams: function($form) {
			var params = {},
					form_fields = $form.serializeArray(),
					i;
			for (i = 0; i < form_fields.length; i++) {
				params = this._parseParamPair(params, form_fields[i].name, form_fields[i].value);
			}
			return params;
		},

		_parseQueryString: function(path) {
			var params = {}, parts, pairs, pair, i;

			parts = path.match(QUERY_STRING_MATCHER);
			if (parts) {
				pairs = parts[1].split('&');
				for (i = 0; i < pairs.length; i++) {
					pair = pairs[i].split('=');
					params = this._parseParamPair(params, _decode(pair[0]), _decode(pair[1]));
				}
			}
			return params;
		},

		_parseParamPair: function(params, key, value) {
			if (params[key]) {
				if (_isArray(params[key])) {
					params[key].push(value);
				} else {
					params[key] = [params[key], value];
				}
			} else {
				params[key] = value;
			}
			return params;
		},

		_listen: function(name, callback) {
			return this.$element().bind([name, this.eventNamespace()].join('.'), callback);
		},

		_unlisten: function(name, callback) {
			return this.$element().unbind([name, this.eventNamespace()].join('.'), callback);
		}

	});

	// `Sammy.RenderContext` is an object that makes sequential template loading,
	// rendering and interpolation seamless even when dealing with asyncronous
	// operations.
	//
	// `RenderContext` objects are not usually created directly, rather they are
	// instatiated from an `Sammy.EventContext` by using `render()`, `load()` or
	// `partial()` which all return `RenderContext` objects.
	//
	// `RenderContext` methods always returns a modified `RenderContext`
	// for chaining (like jQuery itself).
	//
	// The core magic is in the `then()` method which puts the callback passed as
	// an argument into a queue to be executed once the previous callback is complete.
	// All the methods of `RenderContext` are wrapped in `then()` which allows you
	// to queue up methods by chaining, but maintaing a guarunteed execution order
	// even with remote calls to fetch templates.
	//
	Sammy.RenderContext = function(event_context) {
		this.event_context		= event_context;
		this.callbacks				= [];
		this.previous_content = null;
		this.content					= null;
		this.next_engine			= false;
		this.waiting					= false;
	};

	Sammy.RenderContext.prototype = $.extend({}, Sammy.Object.prototype, {

		// The "core" of the `RenderContext` object, adds the `callback` to the
		// queue. If the context is `waiting` (meaning an async operation is happening)
		// then the callback will be executed in order, once the other operations are
		// complete. If there is no currently executing operation, the `callback`
		// is executed immediately.
		//
		// The value returned from the callback is stored in `content` for the
		// subsiquent operation. If you return `false`, the queue will pause, and
		// the next callback in the queue will not be executed until `next()` is
		// called. This allows for the guarunteed order of execution while working
		// with async operations.
		//
		// If then() is passed a string instead of a function, the string is looked
		// up as a helper method on the event context.
		//
		// ### Example
		//
		//			this.get('#/', function() {
		//				// initialize the RenderContext
		//				// Even though `load()` executes async, the next `then()`
		//				// wont execute until the load finishes
		//				this.load('myfile.txt')
		//						.then(function(content) {
		//							// the first argument to then is the content of the
		//							// prev operation
		//							$('#main').html(content);
		//						});
		//			});
		//
		then: function(callback) {
			if (!_isFunction(callback)) {
				// if a string is passed to then, assume we want to call
				// a helper on the event context in its context
				if (typeof callback === 'string' && callback in this.event_context) {
					var helper = this.event_context[callback];
					callback = function(content) {
						return helper.apply(this.event_context, [content]);
					};
				} else {
					return this;
				}
			}
			var context = this;
			if (this.waiting) {
				this.callbacks.push(callback);
			} else {
				this.wait();
				window.setTimeout(function() {
					var returned = callback.apply(context, [context.content, context.previous_content]);
					if (returned !== false) {
						context.next(returned);
					}
				}, 13);
			}
			return this;
		},

		// Pause the `RenderContext` queue. Combined with `next()` allows for async
		// operations.
		//
		// ### Example
		//
		//				this.get('#/', function() {
		//					this.load('mytext.json')
		//							.then(function(content) {
		//								var context = this,
		//										data		= JSON.parse(content);
		//								// pause execution
		//								context.wait();
		//								// post to a url
		//								$.post(data.url, {}, function(response) {
		//									context.next(JSON.parse(response));
		//								});
		//							})
		//							.then(function(data) {
		//								// data is json from the previous post
		//								$('#message').text(data.status);
		//							});
		//				});
		wait: function() {
			this.waiting = true;
		},

		// Resume the queue, setting `content` to be used in the next operation.
		// See `wait()` for an example.
		next: function(content) {
			this.waiting = false;
			if (typeof content !== 'undefined') {
				this.previous_content = this.content;
				this.content = content;
			}
			if (this.callbacks.length > 0) {
				this.then(this.callbacks.shift());
			}
		},

		// Load a template into the context.
		// The `location` can either be a string specifiying the remote path to the
		// file, a jQuery object, or a DOM element.
		//
		// No interpolation happens by default, the content is stored in
		// `content`.
		//
		// In the case of a path, unless the option `{cache: false}` is passed the
		// data is stored in the app's `templateCache()`.
		//
		// If a jQuery or DOM object is passed the `innerHTML` of the node is pulled in.
		// This is useful for nesting templates as part of the initial page load wrapped
		// in invisible elements or `<script>` tags. With template paths, the template
		// engine is looked up by the extension. For DOM/jQuery embedded templates,
		// this isnt possible, so there are a couple of options:
		//
		//	* pass an `{engine:}` option.
		//	* define the engine in the `data-engine` attribute of the passed node.
		//	* just store the raw template data and use `interpolate()` manually
		//
		// If a `callback` is passed it is executed after the template load.
		load: function(location, options, callback) {
			var context = this;
			return this.then(function() {
				var should_cache, cached, is_json, location_array;
				if (_isFunction(options)) {
					callback = options;
					options = {};
				} else {
					options = $.extend({}, options);
				}
				if (callback) { this.then(callback); }
				if (typeof location === 'string') {
					// its a path
					is_json			 = (location.match(/\.json$/) || options.json);
					should_cache = ((is_json && options.cache === true) || options.cache !== false);
					context.next_engine = context.event_context.engineFor(location);
					delete options.cache;
					delete options.json;
					if (options.engine) {
						context.next_engine = options.engine;
						delete options.engine;
					}
					if (should_cache && (cached = this.event_context.app.templateCache(location))) {
						return cached;
					}
					this.wait();
					$.ajax($.extend({
						url: location,
						data: {},
						dataType: is_json ? 'json' : null,
						type: 'get',
						success: function(data) {
							if (should_cache) {
								context.event_context.app.templateCache(location, data);
							}
							context.next(data);
						}
					}, options));
					return false;
				} else {
					// its a dom/jQuery
					if (location.nodeType) {
						return location.innerHTML;
					}
					if (location.selector) {
						// its a jQuery
						context.next_engine = location.attr('data-engine');
						if (options.clone === false) {
							return location.remove()[0].innerHTML.toString();
						} else {
							return location[0].innerHTML.toString();
						}
					}
				}
			});
		},

		// `load()` a template and then `interpolate()` it with data.
		//
		// ### Example
		//
		//			this.get('#/', function() {
		//				this.render('mytemplate.template', {name: 'test'});
		//			});
		//
		render: function(location, data, callback) {
			if (_isFunction(location) && !data) {
				return this.then(location);
			} else {
				if (!data && this.content) { data = this.content; }
				return this.load(location)
									 .interpolate(data, location)
									 .then(callback);
			}
		},

		// `render()` the the `location` with `data` and then `swap()` the
		// app's `$element` with the rendered content.
		partial: function(location, data) {
			return this.render(location, data).swap();
		},

		// defers the call of function to occur in order of the render queue.
		// The function can accept any number of arguments as long as the last
		// argument is a callback function. This is useful for putting arbitrary
		// asynchronous functions into the queue. The content passed to the
		// callback is passed as `content` to the next item in the queue.
		//
		// ### Example
		//
		//		 this.send($.getJSON, '/app.json')
		//				 .then(function(json) {
		//					 $('#message).text(json['message']);
		//					});
		//
		//
		send: function() {
			var context = this,
					args = _makeArray(arguments),
					fun	 = args.shift();

			if (_isArray(args[0])) { args = args[0]; }

			return this.then(function(content) {
				args.push(function(response) { context.next(response); });
				context.wait();
				fun.apply(fun, args);
				return false;
			});
		},

		// itterates over an array, applying the callback for each item item. the
		// callback takes the same style of arguments as `jQuery.each()` (index, item).
		// The return value of each callback is collected as a single string and stored
		// as `content` to be used in the next iteration of the `RenderContext`.
		collect: function(array, callback, now) {
			var context = this;
			var coll = function() {
				if (_isFunction(array)) {
					callback = array;
					array = this.content;
				}
				var contents = [], doms = false;
				$.each(array, function(i, item) {
					var returned = callback.apply(context, [i, item]);
					if (returned.jquery && returned.length == 1) {
						returned = returned[0];
						doms = true;
					}
					contents.push(returned);
					return returned;
				});
				return doms ? contents : contents.join('');
			};
			return now ? coll() : this.then(coll);
		},

		// loads a template, and then interpolates it for each item in the `data`
		// array. If a callback is passed, it will call the callback with each
		// item in the array _after_ interpolation
		renderEach: function(location, name, data, callback) {
			if (_isArray(name)) {
				callback = data;
				data = name;
				name = null;
			}
			return this.load(location).then(function(content) {
					var rctx = this;
					if (!data) {
						data = _isArray(this.previous_content) ? this.previous_content : [];
					}
					if (callback) {
						$.each(data, function(i, value) {
							var idata = {}, engine = this.next_engine || location;
							name ? (idata[name] = value) : (idata = value);
							callback(value, rctx.event_context.interpolate(content, idata, engine));
						});
					} else {
						return this.collect(data, function(i, value) {
							var idata = {}, engine = this.next_engine || location;
							name ? (idata[name] = value) : (idata = value);
							return this.event_context.interpolate(content, idata, engine);
						}, true);
					}
			});
		},

		// uses the previous loaded `content` and the `data` object to interpolate
		// a template. `engine` defines the templating/interpolation method/engine
		// that should be used. If `engine` is not passed, the `next_engine` is
		// used. If `retain` is `true`, the final interpolated data is appended to
		// the `previous_content` instead of just replacing it.
		interpolate: function(data, engine, retain) {
			var context = this;
			return this.then(function(content, prev) {
				if (!data && prev) { data = prev; }
				if (this.next_engine) {
					engine = this.next_engine;
					this.next_engine = false;
				}
				var rendered = context.event_context.interpolate(content, data, engine);
				return retain ? prev + rendered : rendered;
			});
		},

		// executes `EventContext#swap()` with the `content`
		swap: function() {
			return this.then(function(content) {
				this.event_context.swap(content);
			}).trigger('changed', {});
		},

		// Same usage as `jQuery.fn.appendTo()` but uses `then()` to ensure order
		appendTo: function(selector) {
			return this.then(function(content) {
				$(selector).append(content);
			}).trigger('changed', {});
		},

		// Same usage as `jQuery.fn.prependTo()` but uses `then()` to ensure order
		prependTo: function(selector) {
			return this.then(function(content) {
				$(selector).prepend(content);
			}).trigger('changed', {});
		},

		// Replaces the `$(selector)` using `html()` with the previously loaded
		// `content`
		replace: function(selector) {
			return this.then(function(content) {
				$(selector).html(content);
			}).trigger('changed', {});
		},

		// trigger the event in the order of the event context. Same semantics
		// as `Sammy.EventContext#trigger()`. If data is ommitted, `content`
		// is sent as `{content: content}`
		trigger: function(name, data) {
			return this.then(function(content) {
				if (typeof data == 'undefined') { data = {content: content}; }
				this.event_context.trigger(name, data);
			});
		}

	});

	// `Sammy.EventContext` objects are created every time a route is run or a
	// bound event is triggered. The callbacks for these events are evaluated within a `Sammy.EventContext`
	// This within these callbacks the special methods of `EventContext` are available.
	//
	// ### Example
	//
	//			 $.sammy(function() {
	//				 // The context here is this Sammy.Application
	//				 this.get('#/:name', function() {
	//					 // The context here is a new Sammy.EventContext
	//					 if (this.params['name'] == 'sammy') {
	//						 this.partial('name.html.erb', {name: 'Sammy'});
	//					 } else {
	//						 this.redirect('#/somewhere-else')
	//					 }
	//				 });
	//			 });
	//
	// Initialize a new EventContext
	//
	// ### Arguments
	//
	// * `app` The `Sammy.Application` this event is called within.
	// * `verb` The verb invoked to run this context/route.
	// * `path` The string path invoked to run this context/route.
	// * `params` An Object of optional params to pass to the context. Is converted
	//	 to a `Sammy.Object`.
	// * `target` a DOM element that the event that holds this context originates
	//	 from. For post, put and del routes, this is the form element that triggered
	//	 the route.
	//
	Sammy.EventContext = function(app, verb, path, params, target) {
		this.app		= app;
		this.verb		= verb;
		this.path		= path;
		this.params = new Sammy.Object(params);
		this.target = target;
	};

	Sammy.EventContext.prototype = $.extend({}, Sammy.Object.prototype, {

		// A shortcut to the app's `$element()`
		$element: function() {
			return this.app.$element(_makeArray(arguments).shift());
		},

		// Look up a templating engine within the current app and context.
		// `engine` can be one of the following:
		//
		// * a function: should conform to `function(content, data) { return interploated; }`
		// * a template path: 'template.ejs', looks up the extension to match to
		//	 the `ejs()` helper
		// * a string referering to the helper: "mustache" => `mustache()`
		//
		// If no engine is found, use the app's default `template_engine`
		//
		engineFor: function(engine) {
			var context = this, engine_match;
			// if path is actually an engine function just return it
			if (_isFunction(engine)) { return engine; }
			// lookup engine name by path extension
			engine = (engine || context.app.template_engine).toString();
			if ((engine_match = engine.match(/\.([^\.]+)$/))) {
				engine = engine_match[1];
			}
			// set the engine to the default template engine if no match is found
			if (engine && _isFunction(context[engine])) {
				return context[engine];
			}

			if (context.app.template_engine) {
				return this.engineFor(context.app.template_engine);
			}
			return function(content, data) { return content; };
		},

		// using the template `engine` found with `engineFor()`, interpolate the
		// `data` into `content`
		interpolate: function(content, data, engine) {
			return this.engineFor(engine).apply(this, [content, data]);
		},

		// Create and return a `Sammy.RenderContext` calling `render()` on it.
		// Loads the template and interpolate the data, however does not actual
		// place it in the DOM.
		//
		// ### Example
		//
		//			// mytemplate.mustache <div class="name">{{name}}</div>
		//			render('mytemplate.mustache', {name: 'quirkey'});
		//			// sets the `content` to <div class="name">quirkey</div>
		//			render('mytemplate.mustache', {name: 'quirkey'})
		//				.appendTo('ul');
		//			// appends the rendered content to $('ul')
		//
		render: function(location, data, callback) {
			return new Sammy.RenderContext(this).render(location, data, callback);
		},

		// Create and return a `Sammy.RenderContext` calling `renderEach()` on it.
		// Loads the template and interpolates the data for each item,
		// however does not actual place it in the DOM.
		//
		// ### Example
		//
		//			// mytemplate.mustache <div class="name">{{name}}</div>
		//			renderEach('mytemplate.mustache', [{name: 'quirkey'}, {name: 'endor'}])
		//			// sets the `content` to <div class="name">quirkey</div><div class="name">endor</div>
		//			renderEach('mytemplate.mustache', [{name: 'quirkey'}, {name: 'endor'}]).appendTo('ul');
		//			// appends the rendered content to $('ul')
		//
		renderEach: function(location, name, data, callback) {
			return new Sammy.RenderContext(this).renderEach(location, name, data, callback);
		},

		// create a new `Sammy.RenderContext` calling `load()` with `location` and
		// `options`. Called without interpolation or placement, this allows for
		// preloading/caching the templates.
		load: function(location, options, callback) {
			return new Sammy.RenderContext(this).load(location, options, callback);
		},

		// `render()` the the `location` with `data` and then `swap()` the
		// app's `$element` with the rendered content.
		partial: function(location, data) {
			return new Sammy.RenderContext(this).partial(location, data);
		},

		// create a new `Sammy.RenderContext` calling `send()` with an arbitrary
		// function
		send: function() {
			var rctx = new Sammy.RenderContext(this);
			return rctx.send.apply(rctx, arguments);
		},

		// Changes the location of the current window. If `to` begins with
		// '#' it only changes the document's hash. If passed more than 1 argument
		// redirect will join them together with forward slashes.
		//
		// ### Example
		//
		//			redirect('#/other/route');
		//			// equivilent to
		//			redirect('#', 'other', 'route');
		//
		redirect: function() {
			var to, args = _makeArray(arguments),
					current_location = this.app.getLocation();
			if (args.length > 1) {
				args.unshift('/');
				to = this.join.apply(this, args);
			} else {
				to = args[0];
			}
			this.trigger('redirect', {to: to});
			this.app.last_location = [this.verb, this.path];
			this.app.setLocation(to);
			if (current_location == to) {
				this.app.trigger('location-changed');
			}
		},

		// Triggers events on `app` within the current context.
		trigger: function(name, data) {
			if (typeof data == 'undefined') { data = {}; }
			if (!data.context) { data.context = this; }
			return this.app.trigger(name, data);
		},

		// A shortcut to app's `eventNamespace()`
		eventNamespace: function() {
			return this.app.eventNamespace();
		},

		// A shortcut to app's `swap()`
		swap: function(contents) {
			return this.app.swap(contents);
		},

		// Raises a possible `notFound()` error for the current path.
		notFound: function() {
			return this.app.notFound(this.verb, this.path);
		},

		// Default JSON parsing uses jQuery's `parseJSON()`. Include `Sammy.JSON`
		// plugin for the more conformant "crockford special".
		json: function(string) {
			return $.parseJSON(string);
		},

		// //=> Sammy.EventContext: get #/ {}
		toString: function() {
			return "Sammy.EventContext: " + [this.verb, this.path, this.params].join(' ');
		}

	});

	// An alias to Sammy
	$.sammy = window.Sammy = Sammy;

})(jQuery, window);

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
(function($) {

  // Simple JavaScript Templating
  // John Resig - http://ejohn.org/ - MIT Licensed
  // adapted from: http://ejohn.org/blog/javascript-micro-templating/
  // originally $.srender by Greg Borenstein http://ideasfordozens.com in Feb 2009
  // modified for Sammy by Aaron Quint for caching templates by name
  var srender_cache = {};
  var srender = function(name, template, data, options) {
    var fn, escaped_string;
    // target is an optional element; if provided, the result will be inserted into it
    // otherwise the result will simply be returned to the caller
    if (srender_cache[name]) {
      fn = srender_cache[name];
    } else {
      if (typeof template == 'undefined') {
        // was a cache check, return false
        return false;
      }
      // If options escape_html is false, dont escape the contents by default
      if (options && options.escape_html === false) {
        escaped_string = "\",$1,\"";
      } else {
        escaped_string = "\",h($1),\"";
      }
      // Generate a reusable function that will serve as a template
      // generator (and which will be cached).
      fn = srender_cache[name] = new Function("obj",
      "var ___$$$___=[],print=function(){___$$$___.push.apply(___$$$___,arguments);};" +

      // Introduce the data as local variables using with(){}
      "with(obj){___$$$___.push(\"" +

      // Convert the template into pure JavaScript
      String(template)
        .replace(/[\r\t\n]/g, " ")
        .replace(/\"/g, '\\"')
        .split("<%").join("\t")
        .replace(/((^|%>)[^\t]*)/g, "$1\r")
        .replace(/\t=(.*?)%>/g, escaped_string)
        .replace(/\t!(.*?)%>/g, "\",$1,\"")
        .split("\t").join("\");")
        .split("%>").join("___$$$___.push(\"")
        .split("\r").join("")
        + "\");}return ___$$$___.join('');");
    }

    if (typeof data != 'undefined') {
      return fn(data);
    } else {
      return fn;
    }
  };

  Sammy = Sammy || {};

  // `Sammy.Template` is a simple plugin that provides a way to create
  // and render client side templates. The rendering code is based on John Resig's
  // quick templates and Greg Borenstien's srender plugin.
  // This is also a great template/boilerplate for Sammy plugins.
  //
  // Templates use `<% %>` tags to denote embedded javascript.
  //
  // ### Examples
  //
  // Here is an example template (user.template):
  //
  //       // user.template
  //       <div class="user">
  //         <div class="user-name"><%= user.name %></div>
  //         <% if (user.photo_url) { %>
  //           <div class="photo"><img src="<%= user.photo_url %>" /></div>
  //         <% } %>
  //       </div>
  //
  // Given that is a publicly accesible file, you would render it like:
  //
  //       // app.js
  //       $.sammy(function() {
  //         // include the plugin
  //         this.use('Template');
  //
  //         this.get('#/', function() {
  //           // the template is rendered in the current context.
  //           this.user = {name: 'Aaron Quint'};
  //           // partial calls template() because of the file extension
  //           this.partial('user.template');
  //         })
  //       });
  //
  // You can also pass a second argument to use() that will alias the template
  // method and therefore allow you to use a different extension for template files
  // in <tt>partial()</tt>
  //
  //       // alias to 'tpl'
  //       this.use(Sammy.Template, 'tpl');
  //
  //       // now .tpl files will be run through srender
  //       this.get('#/', function() {
  //         this.partial('myfile.tpl');
  //       });
  //
  // By default, the data passed into the tempalate is passed automatically passed through
  // Sammy's `escapeHTML` method in order to prevent possible XSS attacks. This is
  // a problem though if you're using something like `Sammy.Form` which renders HTML
  // within the templates. You can get around this in two ways. One, you can use the
  // `<%! %>` instead of `<%= %>`. Two, you can pass the `escape_html = false` option
  // when interpolating, i.e:
  //
  //       this.get('#/', function() {
  //         this.template('myform.tpl', {form: "<form></form>"}, {escape_html: false});
  //       });
  //
  Sammy.Template = function(app, method_alias) {

    // *Helper:* Uses simple templating to parse ERB like templates.
    //
    // ### Arguments
    //
    // * `template` A String template. '<% %>' tags are evaluated as Javascript and replaced with the elements in data.
    // * `data` An Object containing the replacement values for the template.
    //   data is extended with the <tt>EventContext</tt> allowing you to call its methods within the template.
    // * `name` An optional String name to cache the template.
    //
    var template = function(template, data, name, options) {
      // use name for caching
      if (typeof name == 'undefined') { name = template; }
      if (typeof options == 'undefined' && typeof name == 'object') {
        options = name; name = template;
      }
      return srender(name, template, $.extend({}, this, data), options);
    };

    // set the default method name/extension
    if (!method_alias) { method_alias = 'template'; }
    // create the helper at the method alias
    app.helper(method_alias, template);

  };

})(jQuery);

