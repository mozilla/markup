( function( $ ) {
	
	// TODO -- support loose augmentation of $.markApp, in case module code is ever loaded before this. 
	
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
				minWidth: 300,
				minHeight: 400,
				countries: [],
				mouseX: null,
				mouseY: null,
				mouseDown: false,
				mouseIn: false,
				modules: {},
				usersMark: null,
				defaultErrorMsg: $( '#default-error-msg' ).text(),
				defaultLoadingMsg: $( '#default-loading-msg' ).text(),
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
						var custom_class = custom_class || '';
						var msg = typeof msg === "string" ? msg : context.defaultLoadingMsg;
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
						// TODO -- translate this default string
						var msg = typeof msg === "string" ? msg : context.defaultErrorMsg;
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
								.append( $( '<p />' ).text( msg ) ) );
						context.$container
							.append( $error );
						$error.fadeIn( 'fast' );
					},
					hideError: function ( ) {
						$( '#markapp-error' ).fadeOut( 'fast', function() {
							$( this ).remove();
						} );
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
						} else {
							// use cookies
							// todo -- impliment cookie fallback....maybe
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
					if( lC.hoverMark ) lC.hoverMark.color = lC.hoverMark.contributor_name ? '171,73,27' : '0,0,0';
					// store this hover mark
					lC.hoverMark = mark;
					if ( lC.hoverMark.reference == lC.currentMark.reference && lC.hoverMark.contributor_name && $( '#mark-information' ).is( ':visible' ) ) {
						$( '#contributor-quote-box' )
							.fadeIn( 'fast' )
							.css( { left: context.mouseX - 15, top: context.mouseY - $( '#contributor-quote-box' ).height() - 15 } );
					} else {
						lC.hoverMark.color = '0,139,211';
					}
				} else if ( lC.hoverMark ) {
					lC.hoverMark.color = lC.hoverMark.contributor_name ? '171,73,27' : '0,0,0';
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
					lC.hoverMark.color = lC.hoverMark.contributor_name ? '171,73,27' : '0,0,0';
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
					'share_params': { 'text': 'Mozilla Firefox Mark Up. The internet is your creation. Show your support to keep it open and free. Make your mark.' }
					} );
				$( '#facebook-share' ).socialShare( {
					'share_url': 'http://www.facebook.com/sharer.php',
					'share_params': { 't': 'The internet is your creation. Show your support to keep it open and free. Make your mark.' }
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
								modules.linear.fn.jumpToMark( context, data.marks[0].reference );
							} else {
								// show the error message, with a link back to the main visualization link
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
					$("#contributor-select").next().hide();
					$( '#contributor-select-label' ).hide();
				} else {
					$("#contributor-select").next().show();
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
							$( '.collapsible' ).collapsibleMod( { 'previewSelector': '.collapsed-preview' } );
							// if the contributor box is empty, fill it
							if( $( '#contributor-select option' ).size() == 1 ) {
								var $select = $( '#contributor-select' );
								for( var i = 0; i < data.contributor_marks.length; i++ ) {
									var $option = $( '<option />' )
										.val( data.contributor_marks[i].reference )
										.text( data.contributor_marks[i].contributor );
									$select.append( $option );
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
			// TODO -- add nonSequentialAllowed param for dumping non-overlapping sets when we're not doing a controlled update, ie first and last mark buttons
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
					context.fn.showLoader( $( '#loading-marks-msg' ).text(), 'overlay-light' );
				} else if ( ! options.reference ) {
					context.fn.showLoader( $( '#loading-marks-msg' ).text(), 'overlay-light' );
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
						mark.color = '171,73,27';
					}
					// if ( !lC.currentMark ) lC.currentMark = mark;
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
				// reset our ordere marks array
				// modules.linear.fn.updatedOrderedMarks( context );
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
							if ( data.marks.length < lC.bufferSize ) {
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
				dateString.push( $( '#month-abreviations li:eq(' + d.getMonth() + ')' ).text() + " " + d.getDate() );
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
				} else {
					$( '#mark-contributor-name, #contributor-quote' ).text( "" );
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
						// TODO translate this msg
						context.fn.showError( "Sorry, an error occured." );
					}
				} );
				
			},
			deleteCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				// ajax request goes here, with error handling
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
						context.fn.showError( "Sorry, an error occured." );
					}
				} );
			},
			approveCurrentMark: function ( context, shouldApprove ) {
				var lC = context.modules.linear;
				// ajax request goes here, with error handling
				$.ajax( {
					url: '/requests/approve_mark',
					data: {
						'reference': lC.currentMark.reference,
						'should_approve': shouldApprove
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						//	TODO
						console.log( data );
						//	Update approved status locally
						lC.currentMark.is_approved = shouldApprove;
					},
					error: function ( data ) {
						// TODO translate this msg
						context.fn.showError( "Sorry, an error occured." );
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
				var speed = Math.min( 8000, Math.max( 1000, speed) );
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
					.easing( TWEEN.Easing.Quartic.EaseInOut )
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
			events: [],  // unexecuted events we bind to times to 
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
				} 
				$( '#markmaker' ).css( 'background-position', '0 ' + ( context.height - 100 ) + 'px' );
				// update our resize handler 
				$( '#markmaker' )
					.unbind( 'resize.markApp' )
					.bind( 'resize.markApp', function ( e, w, h ) {
						$( '#markmaker' ).css( 'background-position', '0 ' + ( context.height - 100 ) + 'px' );
						
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
				context.fn.showLoader( $( '.translated-strings #submitting-mark' ).text() );
				var params = {
					'points_obj': points_obj,
					'points_obj_simplified': points_obj_simplified,
					'country_code': country_code,
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
						// store the users mark for later access
						context.fn.storeData( 'userMark', { 'reference': data.mark_reference, 'country_code': country_code } );
						// now tell the app to redirect to our FRESH mark
						context.app.setLocation( '#/linear/'+ data.mark_reference + '?playback=true' );
						// hide loader
						context.fn.hideLoader();
					},
					error: function( data ) {
						context.fn.showError();
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
								{ offset: {x: (context.width / 2) - 115, y: context.height - 200 }, 
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
							{ offset: {x: 10, y: -50 }, 
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
					console.log( "this module isn't really intended to be reloaded" );
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
						var bOffset = ( h - 100 ); // position of the background graphic
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
			createBigX: function( context ) {
				var now = ( new Date() ).getTime();
				var x = new Mark.gmlMark( [], '', '', now, false );
				// stroke points - x, y, speed
				var s1 = [
					[20, 0, 10],
					[20, 0, 10],
					[20, 0, 10],
					[20, 0, 10],
					[20, 0, 10],
					[20, 0, 10],
					];
				var point = new Mark.gmlPoint( context.mouseX, context.mouseY, time - lC.captureTime, 0 );
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
						console.warn( "Mark failed import", marks[i].reference );
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
				var xMarkData = {"strokes":[[{"x":234,"y":10,"z":0,"time":33,"speed":0,"angle":0,"significance":5},{"x":222,"y":20,"z":0,"time":116,"speed":0.16371630891611244,"angle":0.7853981633974483,"significance":1},{"x":174,"y":77,"z":0,"time":250,"speed":0.5882352941176471,"angle":0.7086262721276702,"significance":1},{"x":159,"y":92,"z":0,"time":284,"speed":0.5823232315653921,"angle":0.7853981633974483,"significance":3},{"x":127,"y":143,"z":0,"time":434,"speed":0.49442499055474537,"angle":0.6202494859828214,"significance":2},{"x":119,"y":157,"z":0,"time":467,"speed":0.48690596886566767,"angle":0.5880026035475675,"significance":1},{"x":107,"y":184,"z":0,"time":550,"speed":0.4777756803443185,"angle":0.46364760900080615,"significance":1},{"x":92,"y":222,"z":0,"time":659,"speed":0.4268730969028777,"angle":0.3805063771123649,"significance":2},{"x":86,"y":247,"z":0,"time":745,"speed":0.29870357798334235,"angle":0.244978663126864,"significance":1},{"x":86,"y":261,"z":0,"time":934,"speed":0.1987035779833423,"angle":0,"significance":5}],[{"x":0,"y":0,"z":0,"time":1389,"speed":0,"angle":0,"significance":5},{"x":14,"y":9,"z":0,"time":1439,"speed":0.16680012497506194,"angle":5.332638466367511,"significance":1},{"x":25,"y":13,"z":0,"time":1459,"speed":0.2838471240822582,"angle":5.061159983968596,"significance":1},{"x":102,"y":55,"z":0,"time":1589,"speed":0.8336425711723694,"angle":5.20633034930427,"significance":2},{"x":137,"y":79,"z":0,"time":1639,"speed":0.8679809578874739,"angle":5.355890089177974,"significance":1},{"x":165,"y":104,"z":0,"time":1689,"speed":0.6923947004617487,"angle":5.497787143782138,"significance":3},{"x":185,"y":133,"z":0,"time":1801,"speed":0.37418250299576344,"angle":5.639684198386302,"significance":1},{"x":198,"y":164,"z":0,"time":1889,"speed":0.4385604630344515,"angle":5.81953769817878,"significance":2},{"x":203,"y":184,"z":0,"time":1940,"speed":0.46422811047509116,"angle":6.064516361305644,"significance":1},{"x":211,"y":204,"z":0,"time":1990,"speed":0.3747853913750996,"angle":5.961434752782944,"significance":1},{"x":226,"y":264,"z":0,"time":2273,"speed":0.248185115401781,"angle":0,"significance":5}]],"country_code":"","time":1300905482370,"rtl":false,"maxTime":2273,"reference":"","hoverState":false,"renderedBounds":null,"id":null,"color":"0,0,0","hoverColor":"0,139,211","x":194,"y":209,"position":{"x":0,"y":0,"z":0},"rotationAngle":{"x":0,"y":0,"z":0},"sX":0,"sY":0,"bWidth":234,"bHeight":264};
				
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
/*
 * jQuery touch and gesture detection.
 * 
 * identifies support for touch and gestures.
 * 
 * Usage:  
 * 
 * if ($fn.browserTouchSupport.touches) {
 *     // Touch specific interactions
 * }
 * 
 * Support:
 * bool $.fn.browserTouchSupport.touches  // all touches supported
 * bool $.fn.browserTouchSupport.gestures // all gestures supported
 * bool $.fn.browserTouchSupport.touchstart
 * bool $.fn.browserTouchSupport.touchmove
 * bool $.fn.browserTouchSupport.touchend
 * bool $.fn.browserTouchSupport.gesturestart
 * bool $.fn.browserTouchSupport.gesturechange
 * bool $.fn.browserTouchSupport.gestureend
 * 
 * 
 * @author     Jeffrey Sambells <jeff@tropicalpixels.com>
 * @license    The MIT License
 * 
 * Copyright (c) 2010 Jeffrey Sambells / TropicalPixels
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function($) {
	
	var support = {};
	
	var events = [
		'touchstart',
		'touchmove',
		'touchend',
		'gesturestart',
		'gesturechange',
		'gestureend'
	];

	var el = document.createElement('div');

	for( i in events ) {
		var eventName = events[i];
		eventName = 'on' + eventName;
		var isSupported = (eventName in el);
		if (!isSupported) {
			el.setAttribute(eventName, 'return;');
			isSupported = typeof el[eventName] == 'function';
		}
		support[events[i]] = isSupported;
	}

	support.touches = 
		support.touchstart 
		&& support.touchend 
		&& support.touchmove;
	
	support.gestures = 
		support.gesturestart && 
		support.gesturechange && 
		support.gestureend;
	
	$.fn.browserTouchSupport = support;
	
})(jQuery);

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
			'previewSelector': '',
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
				context.$content = $this.children().not( 'h3:first' ).not( context.previewSelector );
				
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
					.slideUp( 'fast' );
				context.collapsed = true;
				$.collapsibleMod.fn.saveState( context );
			},
			'expand': function ( context ) {
				context.$container
					.removeClass( context.collapsedClass )
					.addClass( context.expandedClass );
				context.$content
					.slideDown( 'fast' );
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
 * A generic plugin to assist with those fucking social media buttons we have to put on every god damn website these days.
 * 
 * Actually, you know what? This is more basic than that. It just opens up a new window with the dimensions you specify
 * and the URL you specify, with the GET params you specify.
 * 
 * That just happens to be the basic functionality you need to impliment a twitter or facebook share button. 
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
	
		this.sendToTop = function () {
			// this.manager.sendToTop( this );
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
				if( p.z && ( p.z > mark.dof || p.z < 0 ) ) continue;
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
		this.hoverColor = '0,139,211';
		
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
		},
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
		},
		this.positionToStart = function () {
			this.position.x = 0;
			this.position.y = 0;
			this.position.z =  0;
		};
		
		// translates a point according to this marks location in 3d space
		this.translatePoint = function( x, y, z ) {
			// find the change in x, y and z from the top lef of our bounding box to the bottom right
			var dX = ( this.angle.x * this.bWidth ) - this.position.x, 
				dY = ( this.angle.y * this.bHeight ) - this.position.y, 
				dZ = ( this.angle.z * 1 );
			x = x * this.rotationAngle.x;
			y = y * this.rotationAngle.y;
			z = z * this.rotationAngle.z;
		};
		
		// doesn't really belong here
		this.url = function () {
			return "http://domain.tld/#/mark/" + this.reference;
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
		// - scale - a value to scale this points x, y coords by. Only supported by flatScale currently
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



/* The translatePoint Graveyard. Where unloved point translations go to die. 

case 'parabolic': 
	// offset by parent
	rP.x += offset.x;
	rP.y += offset.y;
	// calculate 3d position
	rP.z = ( rP.x * rP.x / mark.renderer.dof );
	rP.y += rP.z / 2;
	// map 3d to 2d
	var scale = mark.renderer.dof / ( mark.renderer.dof + rP.z );
	rP.x *= scale * 2;
	rP.y *= scale;
	rP.x += 600;
	rP.y -= 200;
	break;
case 'flat': 
	// offset by parent
	rP.x += offset.x;
	rP.y += offset.y;
	// scale by width and height 
	rP.z = 100;
	break;
case 'linear': 
	// offsets
	rP.x += offset.x;
	rP.y += offset.y;
	// rP.z = ( ( rP.x - 500 ) * ( rP.x / 2000 ) ) - 1500; 
	spread = w * 2;
	shift = w * .5;
	rP.z = ( ( rP.x - shift ) * ( ( rP.x - shift ) / spread ) ) + offset.z;
	// make it a bit deeper based on time
	if( rP.time ) rP.z += rP.time / 100;
	var scale = mark.renderer.dof / ( mark.renderer.dof + rP.z );
	rP.x *= scale;
	rP.y *= scale;
	break;
	
	
*/

var Mark = ( function ( mark ) { 
	
	// This is currently very rudimentry
	// no projection math happening, just some offsets to consult when rendering marks
	
	mark.camera = function ( ) {
	
		this.position = new mark.vector( 0, 0 ,-1000 );
		// currently not used
		this.targetPosition = new mark.vector( 0, 0, 0 );
		
		this.tweenTo = function( x, y, z ) {
			
		};
		
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
// -- Sammy.js -- /sammy.js
// http://sammyjs.org
// Version: 0.6.3
// Built: 2011-01-27 10:31:14 -0800
(function(h,j){var o,g="([^/]+)",k=/:([\w\d]+)/g,l=/\?([^#]*)$/,c=function(p){return Array.prototype.slice.call(p)},d=function(p){return Object.prototype.toString.call(p)==="[object Function]"},m=function(p){return Object.prototype.toString.call(p)==="[object Array]"},i=function(p){return decodeURIComponent(p.replace(/\+/g," "))},b=encodeURIComponent,f=function(p){return String(p).replace(/&(?!\w+;)/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},n=function(p){return function(q,r){return this.route.apply(this,[p,q,r])}},a={},e=[];o=function(){var q=c(arguments),r,p;o.apps=o.apps||{};if(q.length===0||q[0]&&d(q[0])){return o.apply(o,["body"].concat(q))}else{if(typeof(p=q.shift())=="string"){r=o.apps[p]||new o.Application();r.element_selector=p;if(q.length>0){h.each(q,function(s,t){r.use(t)})}if(r.element_selector!=p){delete o.apps[p]}o.apps[r.element_selector]=r;return r}}};o.VERSION="0.6.3";o.addLogger=function(p){e.push(p)};o.log=function(){var p=c(arguments);p.unshift("["+Date()+"]");h.each(e,function(r,q){q.apply(o,p)})};if(typeof j.console!="undefined"){if(d(j.console.log.apply)){o.addLogger(function(){j.console.log.apply(j.console,arguments)})}else{o.addLogger(function(){j.console.log(arguments)})}}else{if(typeof console!="undefined"){o.addLogger(function(){console.log.apply(console,arguments)})}}h.extend(o,{makeArray:c,isFunction:d,isArray:m});o.Object=function(p){return h.extend(this,p||{})};h.extend(o.Object.prototype,{escapeHTML:f,h:f,toHash:function(){var p={};h.each(this,function(r,q){if(!d(q)){p[r]=q}});return p},toHTML:function(){var p="";h.each(this,function(r,q){if(!d(q)){p+="<strong>"+r+"</strong> "+q+"<br />"}});return p},keys:function(p){var q=[];for(var r in this){if(!d(this[r])||!p){q.push(r)}}return q},has:function(p){return this[p]&&h.trim(this[p].toString())!=""},join:function(){var q=c(arguments);var p=q.shift();return q.join(p)},log:function(){o.log.apply(o,arguments)},toString:function(p){var q=[];h.each(this,function(s,r){if(!d(r)||p){q.push('"'+s+'": '+r.toString())}});return"Sammy.Object: {"+q.join(",")+"}"}});o.HashLocationProxy=function(q,p){this.app=q;this.is_native=false;this._startPolling(p)};o.HashLocationProxy.prototype={bind:function(){var p=this,q=this.app;h(j).bind("hashchange."+this.app.eventNamespace(),function(s,r){if(p.is_native===false&&!r){o.log("native hash change exists, using");p.is_native=true;j.clearInterval(o.HashLocationProxy._interval)}q.trigger("location-changed")});if(!o.HashLocationProxy._bindings){o.HashLocationProxy._bindings=0}o.HashLocationProxy._bindings++},unbind:function(){h(j).unbind("hashchange."+this.app.eventNamespace());o.HashLocationProxy._bindings--;if(o.HashLocationProxy._bindings<=0){j.clearInterval(o.HashLocationProxy._interval)}},getLocation:function(){var p=j.location.toString().match(/^[^#]*(#.+)$/);return p?p[1]:""},setLocation:function(p){return(j.location=p)},_startPolling:function(r){var q=this;if(!o.HashLocationProxy._interval){if(!r){r=10}var p=function(){var s=q.getLocation();if(!o.HashLocationProxy._last_location||s!=o.HashLocationProxy._last_location){j.setTimeout(function(){h(j).trigger("hashchange",[true])},13)}o.HashLocationProxy._last_location=s};p();o.HashLocationProxy._interval=j.setInterval(p,r)}}};o.Application=function(p){var q=this;this.routes={};this.listeners=new o.Object({});this.arounds=[];this.befores=[];this.namespace=(new Date()).getTime()+"-"+parseInt(Math.random()*1000,10);this.context_prototype=function(){o.EventContext.apply(this,arguments)};this.context_prototype.prototype=new o.EventContext();if(d(p)){p.apply(this,[this])}if(!this._location_proxy){this.setLocationProxy(new o.HashLocationProxy(this,this.run_interval_every))}if(this.debug){this.bindToAllEvents(function(s,r){q.log(q.toString(),s.cleaned_type,r||{})})}};o.Application.prototype=h.extend({},o.Object.prototype,{ROUTE_VERBS:["get","post","put","delete"],APP_EVENTS:["run","unload","lookup-route","run-route","route-found","event-context-before","event-context-after","changed","error","check-form-submission","redirect","location-changed"],_last_route:null,_location_proxy:null,_running:false,element_selector:"body",debug:false,raise_errors:false,run_interval_every:50,template_engine:null,toString:function(){return"Sammy.Application:"+this.element_selector},$element:function(p){return p?h(this.element_selector).find(p):h(this.element_selector)},use:function(){var p=c(arguments),r=p.shift(),q=r||"";try{p.unshift(this);if(typeof r=="string"){q="Sammy."+r;r=o[r]}r.apply(this,p)}catch(s){if(typeof r==="undefined"){this.error("Plugin Error: called use() but plugin ("+q.toString()+") is not defined",s)}else{if(!d(r)){this.error("Plugin Error: called use() but '"+q.toString()+"' is not a function",s)}else{this.error("Plugin Error",s)}}}return this},setLocationProxy:function(p){var q=this._location_proxy;this._location_proxy=p;if(this.isRunning()){if(q){q.unbind()}this._location_proxy.bind()}},route:function(t,q,v){var s=this,u=[],p,r;if(!v&&d(q)){q=t;v=q;t="any"}t=t.toLowerCase();if(q.constructor==String){k.lastIndex=0;while((r=k.exec(q))!==null){u.push(r[1])}q=new RegExp("^"+q.replace(k,g)+"$")}if(typeof v=="string"){v=s[v]}p=function(w){var x={verb:w,path:q,callback:v,param_names:u};s.routes[w]=s.routes[w]||[];s.routes[w].push(x)};if(t==="any"){h.each(this.ROUTE_VERBS,function(x,w){p(w)})}else{p(t)}return this},get:n("get"),post:n("post"),put:n("put"),del:n("delete"),any:n("any"),mapRoutes:function(q){var p=this;h.each(q,function(r,s){p.route.apply(p,s)});return this},eventNamespace:function(){return["sammy-app",this.namespace].join("-")},bind:function(p,r,t){var s=this;if(typeof t=="undefined"){t=r}var q=function(){var w,u,v;w=arguments[0];v=arguments[1];if(v&&v.context){u=v.context;delete v.context}else{u=new s.context_prototype(s,"bind",w.type,v,w.target)}w.cleaned_type=w.type.replace(s.eventNamespace(),"");t.apply(u,[w,v])};if(!this.listeners[p]){this.listeners[p]=[]}this.listeners[p].push(q);if(this.isRunning()){this._listen(p,q)}return this},trigger:function(p,q){this.$element().trigger([p,this.eventNamespace()].join("."),[q]);return this},refresh:function(){this.last_location=null;this.trigger("location-changed");return this},before:function(p,q){if(d(p)){q=p;p={}}this.befores.push([p,q]);return this},after:function(p){return this.bind("event-context-after",p)},around:function(p){this.arounds.push(p);return this},isRunning:function(){return this._running},helpers:function(p){h.extend(this.context_prototype.prototype,p);return this},helper:function(p,q){this.context_prototype.prototype[p]=q;return this},run:function(p){if(this.isRunning()){return false}var q=this;h.each(this.listeners.toHash(),function(r,s){h.each(s,function(u,t){q._listen(r,t)})});this.trigger("run",{start_url:p});this._running=true;this.last_location=null;if(this.getLocation()==""&&typeof p!="undefined"){this.setLocation(p)}this._checkLocation();this._location_proxy.bind();this.bind("location-changed",function(){q._checkLocation()});this.bind("submit",function(s){var r=q._checkFormSubmission(h(s.target).closest("form"));return(r===false)?s.preventDefault():false});h(j).bind("beforeunload",function(){q.unload()});return this.trigger("changed")},unload:function(){if(!this.isRunning()){return false}var p=this;this.trigger("unload");this._location_proxy.unbind();this.$element().unbind("submit").removeClass(p.eventNamespace());h.each(this.listeners.toHash(),function(q,r){h.each(r,function(t,s){p._unlisten(q,s)})});this._running=false;return this},bindToAllEvents:function(q){var p=this;h.each(this.APP_EVENTS,function(r,s){p.bind(s,q)});h.each(this.listeners.keys(true),function(s,r){if(p.APP_EVENTS.indexOf(r)==-1){p.bind(r,q)}});return this},routablePath:function(p){return p.replace(l,"")},lookupRoute:function(s,q){var r=this,p=false;this.trigger("lookup-route",{verb:s,path:q});if(typeof this.routes[s]!="undefined"){h.each(this.routes[s],function(u,t){if(r.routablePath(q).match(t.path)){p=t;return false}})}return p},runRoute:function(r,E,t,w){var s=this,C=this.lookupRoute(r,E),q,z,u,y,D,A,x,B,p;this.log("runRoute",[r,E].join(" "));this.trigger("run-route",{verb:r,path:E,params:t});if(typeof t=="undefined"){t={}}h.extend(t,this._parseQueryString(E));if(C){this.trigger("route-found",{route:C});if((B=C.path.exec(this.routablePath(E)))!==null){B.shift();h.each(B,function(F,G){if(C.param_names[F]){t[C.param_names[F]]=i(G)}else{if(!t.splat){t.splat=[]}t.splat.push(i(G))}})}q=new this.context_prototype(this,r,E,t,w);u=this.arounds.slice(0);D=this.befores.slice(0);x=[q].concat(t.splat);z=function(){var F;while(D.length>0){A=D.shift();if(s.contextMatchesOptions(q,A[0])){F=A[1].apply(q,[q]);if(F===false){return false}}}s.last_route=C;q.trigger("event-context-before",{context:q});F=C.callback.apply(q,x);q.trigger("event-context-after",{context:q});return F};h.each(u.reverse(),function(F,G){var H=z;z=function(){return G.apply(q,[H])}});try{p=z()}catch(v){this.error(["500 Error",r,E].join(" "),v)}return p}else{return this.notFound(r,E)}},contextMatchesOptions:function(s,u,q){var r=u;if(typeof r==="undefined"||r=={}){return true}if(typeof q==="undefined"){q=true}if(typeof r==="string"||d(r.test)){r={path:r}}if(r.only){return this.contextMatchesOptions(s,r.only,true)}else{if(r.except){return this.contextMatchesOptions(s,r.except,false)}}var p=true,t=true;if(r.path){if(d(r.path.test)){p=r.path.test(s.path)}else{p=(r.path.toString()===s.path)}}if(r.verb){t=r.verb===s.verb}return q?(t&&p):!(t&&p)},getLocation:function(){return this._location_proxy.getLocation()},setLocation:function(p){return this._location_proxy.setLocation(p)},swap:function(p){return this.$element().html(p)},templateCache:function(p,q){if(typeof q!="undefined"){return a[p]=q}else{return a[p]}},clearTemplateCache:function(){return a={}},notFound:function(r,q){var p=this.error(["404 Not Found",r,q].join(" "));return(r==="get")?p:true},error:function(q,p){if(!p){p=new Error()}p.message=[q,p.message].join(" ");this.trigger("error",{message:p.message,error:p});if(this.raise_errors){throw (p)}else{this.log(p.message,p)}},_checkLocation:function(){var p,q;p=this.getLocation();if(!this.last_location||this.last_location[0]!="get"||this.last_location[1]!=p){this.last_location=["get",p];q=this.runRoute("get",p)}return q},_getFormVerb:function(r){var q=h(r),s,p;p=q.find('input[name="_method"]');if(p.length>0){s=p.val()}if(!s){s=q[0].getAttribute("method")}if(!s||s==""){s="get"}return h.trim(s.toString().toLowerCase())},_checkFormSubmission:function(r){var p,s,u,t,q;this.trigger("check-form-submission",{form:r});p=h(r);s=p.attr("action");u=this._getFormVerb(p);this.log("_checkFormSubmission",p,s,u);if(u==="get"){this.setLocation(s+"?"+this._serializeFormParams(p));q=false}else{t=h.extend({},this._parseFormParams(p));q=this.runRoute(u,s,t,r.get(0))}return(typeof q=="undefined")?false:q},_serializeFormParams:function(q){var s="",p=q.serializeArray(),r;if(p.length>0){s=this._encodeFormPair(p[0].name,p[0].value);for(r=1;r<p.length;r++){s=s+"&"+this._encodeFormPair(p[r].name,p[r].value)}}return s},_encodeFormPair:function(p,q){return b(p)+"="+b(q)},_parseFormParams:function(p){var s={},r=p.serializeArray(),q;for(q=0;q<r.length;q++){s=this._parseParamPair(s,r[q].name,r[q].value)}return s},_parseQueryString:function(s){var u={},r,q,t,p;r=s.match(l);if(r){q=r[1].split("&");for(p=0;p<q.length;p++){t=q[p].split("=");u=this._parseParamPair(u,i(t[0]),i(t[1]))}}return u},_parseParamPair:function(r,p,q){if(r[p]){if(m(r[p])){r[p].push(q)}else{r[p]=[r[p],q]}}else{r[p]=q}return r},_listen:function(p,q){return this.$element().bind([p,this.eventNamespace()].join("."),q)},_unlisten:function(p,q){return this.$element().unbind([p,this.eventNamespace()].join("."),q)}});o.RenderContext=function(p){this.event_context=p;this.callbacks=[];this.previous_content=null;this.content=null;this.next_engine=false;this.waiting=false};o.RenderContext.prototype=h.extend({},o.Object.prototype,{then:function(r){if(!d(r)){if(typeof r==="string"&&r in this.event_context){var q=this.event_context[r];r=function(s){return q.apply(this.event_context,[s])}}else{return this}}var p=this;if(this.waiting){this.callbacks.push(r)}else{this.wait();j.setTimeout(function(){var s=r.apply(p,[p.content,p.previous_content]);if(s!==false){p.next(s)}},13)}return this},wait:function(){this.waiting=true},next:function(p){this.waiting=false;if(typeof p!=="undefined"){this.previous_content=this.content;this.content=p}if(this.callbacks.length>0){this.then(this.callbacks.shift())}},load:function(p,q,s){var r=this;return this.then(function(){var t,u,w,v;if(d(q)){s=q;q={}}else{q=h.extend({},q)}if(s){this.then(s)}if(typeof p==="string"){w=(p.match(/\.json$/)||q.json);t=((w&&q.cache===true)||q.cache!==false);r.next_engine=r.event_context.engineFor(p);delete q.cache;delete q.json;if(q.engine){r.next_engine=q.engine;delete q.engine}if(t&&(u=this.event_context.app.templateCache(p))){return u}this.wait();h.ajax(h.extend({url:p,data:{},dataType:w?"json":null,type:"get",success:function(x){if(t){r.event_context.app.templateCache(p,x)}r.next(x)}},q));return false}else{if(p.nodeType){return p.innerHTML}if(p.selector){r.next_engine=p.attr("data-engine");if(q.clone===false){return p.remove()[0].innerHTML.toString()}else{return p[0].innerHTML.toString()}}}})},render:function(p,q,r){if(d(p)&&!q){return this.then(p)}else{if(!q&&this.content){q=this.content}return this.load(p).interpolate(q,p).then(r)}},partial:function(p,q){return this.render(p,q).swap()},send:function(){var r=this,q=c(arguments),p=q.shift();if(m(q[0])){q=q[0]}return this.then(function(s){q.push(function(t){r.next(t)});r.wait();p.apply(p,q);return false})},collect:function(t,s,p){var r=this;var q=function(){if(d(t)){s=t;t=this.content}var u=[],v=false;h.each(t,function(w,y){var x=s.apply(r,[w,y]);if(x.jquery&&x.length==1){x=x[0];v=true}u.push(x);return x});return v?u:u.join("")};return p?q():this.then(q)},renderEach:function(p,q,r,s){if(m(q)){s=r;r=q;q=null}return this.load(p).then(function(u){var t=this;if(!r){r=m(this.previous_content)?this.previous_content:[]}if(s){h.each(r,function(v,x){var y={},w=this.next_engine||p;q?(y[q]=x):(y=x);s(x,t.event_context.interpolate(u,y,w))})}else{return this.collect(r,function(v,x){var y={},w=this.next_engine||p;q?(y[q]=x):(y=x);return this.event_context.interpolate(u,y,w)},true)}})},interpolate:function(s,r,p){var q=this;return this.then(function(u,t){if(!s&&t){s=t}if(this.next_engine){r=this.next_engine;this.next_engine=false}var v=q.event_context.interpolate(u,s,r);return p?t+v:v})},swap:function(){return this.then(function(p){this.event_context.swap(p)}).trigger("changed",{})},appendTo:function(p){return this.then(function(q){h(p).append(q)}).trigger("changed",{})},prependTo:function(p){return this.then(function(q){h(p).prepend(q)}).trigger("changed",{})},replace:function(p){return this.then(function(q){h(p).html(q)}).trigger("changed",{})},trigger:function(p,q){return this.then(function(r){if(typeof q=="undefined"){q={content:r}}this.event_context.trigger(p,q)})}});o.EventContext=function(t,s,q,r,p){this.app=t;this.verb=s;this.path=q;this.params=new o.Object(r);this.target=p};o.EventContext.prototype=h.extend({},o.Object.prototype,{$element:function(){return this.app.$element(c(arguments).shift())},engineFor:function(r){var q=this,p;if(d(r)){return r}r=(r||q.app.template_engine).toString();if((p=r.match(/\.([^\.]+)$/))){r=p[1]}if(r&&d(q[r])){return q[r]}if(q.app.template_engine){return this.engineFor(q.app.template_engine)}return function(s,t){return s}},interpolate:function(q,r,p){return this.engineFor(p).apply(this,[q,r])},render:function(p,q,r){return new o.RenderContext(this).render(p,q,r)},renderEach:function(p,q,r,s){return new o.RenderContext(this).renderEach(p,q,r,s)},load:function(p,q,r){return new o.RenderContext(this).load(p,q,r)},partial:function(p,q){return new o.RenderContext(this).partial(p,q)},send:function(){var p=new o.RenderContext(this);return p.send.apply(p,arguments)},redirect:function(){var r,q=c(arguments),p=this.app.getLocation();if(q.length>1){q.unshift("/");r=this.join.apply(this,q)}else{r=q[0]}this.trigger("redirect",{to:r});this.app.last_location=[this.verb,this.path];this.app.setLocation(r);if(p==r){this.app.trigger("location-changed")}},trigger:function(p,q){if(typeof q=="undefined"){q={}}if(!q.context){q.context=this}return this.app.trigger(p,q)},eventNamespace:function(){return this.app.eventNamespace()},swap:function(p){return this.app.swap(p)},notFound:function(){return this.app.notFound(this.verb,this.path)},json:function(p){return h.parseJSON(p)},toString:function(){return"Sammy.EventContext: "+[this.verb,this.path,this.params].join(" ")}});h.sammy=j.Sammy=o})(jQuery,window);

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
// -- Sammy.js -- /plugins/sammy.template.js
// http://sammyjs.org
// Version: 0.6.3
// Built: 2011-01-27 10:31:12 -0800
(function(c){var a={};var b=function(e,g,h,d){var f,i;if(a[e]){f=a[e]}else{if(typeof g=="undefined"){return false}if(d&&d.escape_html===false){i='",$1,"'}else{i='",h($1),"'}f=a[e]=new Function("obj",'var ___$$$___=[],print=function(){___$$$___.push.apply(___$$$___,arguments);};with(obj){___$$$___.push("'+String(g).replace(/[\r\t\n]/g," ").replace(/\"/g,'\\"').split("<%").join("\t").replace(/((^|%>)[^\t]*)/g,"$1\r").replace(/\t=(.*?)%>/g,i).replace(/\t!(.*?)%>/g,'",$1,"').split("\t").join('");').split("%>").join('___$$$___.push("').split("\r").join("")+"\");}return ___$$$___.join('');")}if(typeof h!="undefined"){return f(h)}else{return f}};Sammy=Sammy||{};Sammy.Template=function(f,d){var e=function(i,j,h,g){if(typeof h=="undefined"){h=i}if(typeof g=="undefined"&&typeof h=="object"){g=h;h=i}return b(h,i,c.extend({},this,j),g)};if(!d){d="template"}f.helper(d,e)}})(jQuery);

