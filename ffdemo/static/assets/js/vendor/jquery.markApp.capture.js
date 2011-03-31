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
						// drop the UI elements temporarily below the canvas
						$( '#markmaker-controls, #contributor-fields, #translator-fields, #markmaker-legal-line' )
							.css( 'zIndex', 0 );
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
					// bring the UI elements back up above the canvas
					modules.capture.fn.endStroke( context );
					$( '#markmaker-controls, #contributor-fields, #translator-fields, #markmaker-legal-line' )
						.css( 'zIndex', 200 );
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
							.end( )
						.show( )
						.collapsibleMod( )
						.hide( )
						.fadeIn( 'slow' );
				} else if ( lC.invite_code && lC.contributor_type == "c" ) {
					lC.$capture.addClass( 'contributor' );
					$( '#contributor-fields' )
						.show( )
						.collapsibleMod( )
						.hide( )
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
					// add the contributor url as the marks contributor_url
					lC.mark.contributor_url = $( '#contributor-url' ).val();
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