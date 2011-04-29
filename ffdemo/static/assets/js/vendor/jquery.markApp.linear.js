( function( $ ) {
	
	// support loose augmentation
	markApp = $.markApp = $.markApp || {};
	modules = $.markApp.modules = $.markApp.modules || {};
	
	modules.linear = {
		defaults: {
			reference_mark: null, // optional reference mark -- will init the visualization on this mark if passed
			country_code: null, // optional country code -- only loads marks with this county code if present 
			playback: false, // set this to true to immediately play back the initial mark
			show_thanks: false, // if this is set to true, we assume we were redirected from the submission screen
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
						if( $( '#contributor-quote-box' ).is( ':not(:visible)' ) ) {
							$( '#contributor-quote-box' )
								.fadeIn( 'fast' )
								.css( { left: context.mouseX - 15, top: context.mouseY - $( '#contributor-quote-box' ).height() - 15 } );
						}
					} else {
						$( '#contributor-quote-box:visible' ).fadeOut( 'fast' );
						// set mark to the orange highlight color
						lC.hoverMark.color = '255,111,40';
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
							$( '.ui-selectBox-focus' ).removeClass( 'ui-selectBox-focus' );
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
				$( '#mark-gml-download' )
					.click( function ( e ) {
						e.preventDefault();
						modules.linear.fn.downloadCurrentMark( context );
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
				$( '#delete-all-from-ip' )
					.click( function( e ) {
						e.preventDefault();
						modules.linear.fn.deleteAllFromIp( context );
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
									context.fn.showError( context.fn.getString( 'no-marks-error-msg' ), '#/linear/' );
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
								if( firstMark = lC.marks[lC.rightBuffer[0]] ) {
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
								context.fn.showError( context.fn.getString( 'no-marks-error-msg' ), '#/linear/' );
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
				if( lC.linear_root != "moderate" && ! $( '#mark-browsing-options' ).is( '.country-' + ( lC.country_code ? lC.country_code : 'all' ) ) ) {
					$.ajax( {
						'url': '/requests/init_viz_data',
						'data': options,
						dataType: 'JSON', 
						success: function( data ) {
							// set the class on the details to indicate country 
							$( '#mark-browsing-options' )
								.removeAttr( 'class' )
								.addClass( 'country-' + ( lC.country_code ? lC.country_code : 'all' ) );
							if( lC.country_code ) {
								$( '#first-mark-link' )
									.attr( 'href', '#/' + lC.linear_root + '/country/' + lC.country_code + '/' + data.country_first_mark );
								$( '#last-mark-link' )
									.attr( 'href', '#/' + lC.linear_root + '/country/' + lC.country_code + '/' + data.country_last_mark );
							} else {
								$( '#first-mark-link' )
									.click( function( e ) {
										e.preventDefault();
										if( lC.currentMark != null && lC.currentMark.reference == data.first_mark ) {
											modules.linear.fn.centerCurrentMark( context, function() {
												modules.linear.fn.showMarkInformation( context );
											} );
										} else {
											context.app.setLocation( '#/' + lC.linear_root + '/' + data.first_mark );
										}
									} );
								$( '#last-mark-link' )
									.click( function( e ) {
										e.preventDefault();
										if( lC.currentMark != null && lC.currentMark.reference == data.last_mark ) {
											modules.linear.fn.centerCurrentMark( context, function() {
												modules.linear.fn.showMarkInformation( context );
											} );
										} else {
											context.app.setLocation( '#/' + lC.linear_root + '/' + data.last_mark );
										}
									} );
							}
							// setup collapsibles
							$( '#mark-browsing' ).collapsibleMod( );
							// set our total marks
							$( '#total-mark-count' ).text( data.max_id );
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
									if( val != "label" ) {
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
				} 
				// show the loader
				if( !options.reference || ( options.reference && !(options.reference in lC.marks) ) ) {
					// This is for all mark loading requests that aren't a result of normal buffer reloading
					var extraInfo = context.fn.getString( 'default-loading-msg' );
					if( lC.show_thanks ) {
						lC.show_thanks = false
						extraInfo = context.fn.getString( 'submission-thanks-loading-msg' )
					}
					context.fn.showLoader( context.fn.getString( 'loading-marks-msg' ), 'overlay-light', extraInfo );
				} else {
					// if it's normal buffer reloading, show the loader on a delay
					context.fn.showLoader( 
						context.fn.getString( 'loading-marks-msg' ), 
						'overlay-light', 
						context.fn.getString( 'default-loading-msg' ),
						4000 );
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
				} )
				.error( function ( data ) {
					context.fn.showError( context.fn.getString( 'error-msg' ), '#/linear/' );
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
				// check again, if this is empty, return
				if( marks.length == 0 ) return;
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
					// if we already have this one, OR if the points data seems suspect, on to the next one
					if( marks[i].reference in lC.marks ||
						typeof( marks[i].points_obj_simplified ) === "undefined" ||
						marks[i].points_obj_simplified == null ||
						marks[i].points_obj_simplified == "" ) continue;
					var points_obj = JSON.parse( marks[i].points_obj_simplified );
					// do some validation to make sure this mark wont break the viz
					if( points_obj == null || !(points_obj instanceof Object) || !( 'strokes' in points_obj ) || 
						points_obj.strokes.length == 0 ||
						points_obj.strokes[0].length < 2 ) continue;
					var mark = new Mark.gmlMark( points_obj.strokes, marks[i].reference, marks[i].country_code, marks[i].date_drawn, points_obj.rtl, marks[i].id, marks[i].is_approved );
					if( marks[i].contributor ) {
						mark.contributor_name = marks[i].contributor;
						mark.extra_info = points_obj.extra_info;
						mark.contributor_url = points_obj.contributor_url;
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
							if ( data.marks.length < 18 ) {
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
				// offset our date to GMT
				d  = new Date( d.getTime() +  ( 3600000 * context.timezoneOffset ) );
				// get our (hopefully) translated month abbreviation
				var dateString = [];
				// desired format is - 7:45pm GMT Mar 23, 2011 
				dateString.push( d.getHours() + ":" + ( String(d.getMinutes()).length == 1 ? "0" + d.getMinutes() : d.getMinutes() ) );
				dateString.push( "GMT" );
				dateString.push( context.fn.getString( 'month-abbreviations', d.getMonth() ) + " " + d.getDate() + ", " + d.getFullYear() );
				// dateString.push( $( '#month-abreviations li:eq(' + d.getMonth() + ')' ).text() + " " + d.getDate() );
				if( mark.country_code) {
					context.fn.withCountryCodes( function ( countries ) { 
						if( mark.country_code in countries ) {
							$( '#mark-country' ).text( " / " + countries[mark.country_code] );
						} else {
							$( '#mark-country' ).text( "" );
						}
					} );
				} else {
					$( '#mark-country' ).text( "" );
				}
				
				// show the contributor info if we've got it
				if( mark.contributor_name ) {
					// set the name
					$( '#mark-contributor-name' ).text( mark.contributor_name );
					$( '#contributor-name' )
						.text( mark.contributor_name );
					// hide the flag
					$( '#mark-flag' ).hide();
					// show the extra info if we've got it
					if( 'extra_info' in mark && mark.extra_info != null && mark.extra_info != "" ) {
							$( '#contributor-quote' )
								.text( "“" + mark.extra_info + "”" );
					}
					// show the contributors url if we've got it, and it's valid
					if( 'contributor_url' in mark && context.fn.validate.url( mark.contributor_url ) ) {
						$( '#mark-contributor-url' )
							.text( mark.contributor_url.replace(/(ftp|http|https):\/\//, '').replace(/\/$/,'') )
							.attr( 'href', mark.contributor_url );
					} else {
						$( '#mark-contributor-url' )
							.text( '' )
							.attr( 'href', '' );
					}
					$( '#contributor-information' ).show();
				} else {
					$( '#mark-contributor-name, #contributor-quote, #contributor-name, #mark-contributor-url' ).text( "" );
					$( '#contributor-information' ).hide();
					$( '#mark-flag' ).show();
				}
				
				$( '#mark-timestamp' ).text( dateString.join( " " )  );
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
				if( lC.currentMark != null && lC.currentMark.reference in lC.flaggings ) {
					$( '#mark-flag').addClass( 'disabled' );
				} else {
					$( '#mark-flag').removeClass( 'disabled' );
				}
				// animate it in if it's hidden
				$( '#mark-information' ).fadeIn( 'fast' );
			},
			resetMarkInformation: function ( context ) {
				// reset all links
				$( '#mark-information' )
					.find( 'a' )
					.attr( 'href', '#' )
				// reset texts
					.end()
					.find( '#mark-id, #total-mark-count, #mark-timestamp, #mark-country' )
					
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
			downloadCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				if ( lC.currentMark != null && lC.currentMark.reference ) {
					window.open( '/gml/' + lC.currentMark.reference );
				}
			},
			flagCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				// if this user has already flagged this mark, return
				if( lC.currentMark != null && lC.currentMark.reference in lC.flaggings ) return;
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
						context.fn.showError( context.fn.getString( 'error-msg' ), '#/linear/' );
					}
				} );
				
			},
			deleteCurrentMark: function ( context ) {
				var lC = context.modules.linear;
				var targetMarkReference = lC.currentMark.reference;
				$.ajax( {
					url: '/requests/delete_mark',
					data: {
						'reference': targetMarkReference
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						//	Delete current mark from marks data
						// delete lC.marks[targetMarkReference];
						// then remove it from the screen
						modules.linear.fn.removeMarkFromScreen( context, targetMarkReference );
						// hide mark details and set the current mark to nada
						lC.currentMark = null;
						modules.linear.fn.hideMarkInformation( context );
					},
					error: function ( data ) {
						// TODO translate this msg
						context.fn.showError( context.fn.getString( 'error-msg' ), '#/linear/' );
					}
				} );
			},
			deleteAllFromIp: function ( context ) {
				var lC = context.modules.linear;
				var targetMarkIp = lC.currentMark.reference;
				$.ajax( {
					url: '/requests/delete_all_based_on_ip',
					data: {
						'ip': targetMarkIp
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						// Delete all and reload the page
						// Doing one by one could get expensive
						location.reload();
					},
					error: function ( data ) {
						// TODO translate this msg
						context.fn.showError( context.fn.getString( 'error-msg' ), '#/linear/' );
					}
				} );
			},
			approveCurrentMark: function ( context, shouldApprove ) {
				var lC = context.modules.linear;
				var targetMarkReference = lC.currentMark.reference;
				$.ajax( {
					url: '/requests/approve_mark',
					data: {
						'reference': targetMarkReference,
						'should_approve': shouldApprove
					},
					type: 'POST',
					dataType: 'JSON',
					success: function( data ) {
						//	Delete current mark from marks data
						// delete lC.marks[targetMarkReference];
						// then remove it from the screen
						modules.linear.fn.removeMarkFromScreen( context, targetMarkReference );
						// hide mark details and set the current mark to nada
						lC.currentMark = null;
						modules.linear.fn.hideMarkInformation( context );
						
					},
					error: function ( data ) {
						context.fn.showError( context.fn.getString( 'error-msg' ), '#/linear/' );
					}
				} );
			},
			removeMarkFromScreen: function( context, mark_ref ) {
				var lC = context.modules.linear;
				var deletedMarkReference = mark_ref,
					deletedMarkIndex = null;
				// remove the mark from the scene and reposition the rest
				for ( var i=0; i < lC.scene.objects.length; i++ ) {
					// start at the left and run through until you find the deleted mark
					if( !deletedMarkIndex && lC.scene.objects[i].reference != deletedMarkReference ) continue;
					// remove it -- this is run only on the deleted mark
					if( !deletedMarkIndex ) {
						deletedMarkIndex = i;
						lC.scene.objects.splice( i, 1 );
					} else {
						// reposition everything after it
						if ( i == 0 ) {
							lC.scene.objects[i].positionToStart( );
						} else {
							lC.scene.objects[i].positionRelativeTo( lC.scene.objects[i-1] );
						}
					}
				}
				lC.eventChange = true;
			},
			centerCurrentMark: function( context, callback ) {
				var lC = context.modules.linear;
				if( !lC.currentMark ) {
					// if we dont have a current mark, trigger an event change so render changes get shown anyway
					lC.eventChange = true;
					return false;
				} else {
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
		}
	};
	
	
}( jQuery ) );
