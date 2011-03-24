/*




OLD CODE NOT IN USE

Kept for reference purposes only













*/
( function( $ ) {
	var app = $.sammy( '#sammy', function() {
		
		// this.setLocationProxy( new Sammy.HashPushProxy( this ) );
		/* HTML5 History API support
		if( supports_history_api ) {
			this.setLocationProxy( new Sammy.PushLocationProxy( this ) );
		}
		var urls = {
			'home': '/',
			'new_mark': '/mark/new',
			'mark': '/mark/:id',
			'marks': '/linear'
		};
		
		function supports_history_api() {
			return !!(window.history && history.pushState);
		};
		
		function getURL( url_name ) {
			var url = urls[url_name];
			return supports_history_api ? url : '#' + url;
		};
		*/ 
		
		// ROUTES
		this.get( '#/', function( context ) {
			// landing page, intoductions
			this.partial( 'templates/home.template' );
					$( '#sammy' ).css( 'zIndex', 100 );
					$( '#markapp' ).css( 'zIndex', 1 );
		} );
		this.get( '#/mark/new', function( context ) {
			// making our mark
			// load the template
			this.partial( 'templates/markmaker.template' )
				.then( function() {
					// init the capture interface
					$.markApp.capture.fn.init();
					$( '#sammy' ).css( 'zIndex', '' );
				} );
			
		} );

		this.get( '#/mark/:id', function( context ) {
			// playback mode
			this.partial( 'templates/mark.template' )
				.then( function() {
					$( '#sammy' ).css( 'zIndex', '' );
					$( '#markapp' ).css( { 'zIndex': 100, 'cursor': '' } );
					$.markApp.playbackMode.fn.init( );
					$.markApp.playbackMode.fn.loadMark( context.params['id'] );
				} );
		} );
		
		this.get( '#/linear', function( context ) {
			// show all the signatures
			this.partial( 'templates/linear.template' )
				.then( function() {
					$( '#sammy' ).css( 'zIndex', '' );
					$( '#markapp' ).css( { 'zIndex': 100, 'cursor': '' } );
					$.markApp.linearMode.fn.init( );
					$.markApp.linearMode.fn.loadMarks( {
						'offset': 0,
						'max': 20,
						'success': function ( data ) {
							$.markApp.linearMode.fn.setupMarks( data.marks );
						}
					} );
				} );
		} );
		
		// event handlers 
		this.bind( 'run', function() {
			// initialize our display mode
			$.markApp.global.fn.init( $( '#markapp' ) );
		} );
		
		// helpers
		this.helpers( {
			showLoader: function( ) {
				return text.toString().toUpperCase();
			}
		} );
		
		// other stuff
		this.swap = function( content ) {
			this.$element().fadeOut( 'fast', function() {
				$( this ).html( content ).fadeIn( 'normal' );
				$( '#markapp' ).trigger( 'domupdate' );
			} );
			$( '#markapp' ).trigger( 'swap' );
			
		};
		
		this.use( 'Template' );
		
	} );
	
	$.markApp = {
		global: {
			cfg: {
				$container: null,
				frameCount: 0,
				width: 0,
				height: 0,
				minWidth: 300,
				minHeight: 300,
				countries: []
			},
			fn: {
				init: function( container ) {
					var cfg = $.markApp.global.cfg;
					cfg.$container = container;
					cfg.layerManager = new Mark.layerManager( container.get(0) ); 
					$( window )
						.delayedBind( 300, 'resize', $.markApp.global.fn.resize )
						.trigger( 'resize' );
					$.markApp.global.fn.loop();
				},
				hashChange: function( e ) {
					var url = window.location.hash.replace(/\#/, '');
					switch( url ) {
						case 'capture':
							$.markApp.capture.fn.init();
							break;
						case 'linear':
							$.markApp.linearMode.fn.init();
							break;
						default: 
							$.markApp.capture.fn.init();
					}
				},
				loop: function( e ) {
					// reset the delay
					setTimeout( function() { $.markApp.global.fn.loop( ); }, 42 );
					// incremenet the counter
					$.markApp.global.cfg.frameCount++;
					// dispatch the event
					$( window )
						.trigger( 'loop.markApp' );
				},
				withCountryCodes: function ( callback ) {
					if ( $.markApp.global.cfg.countries.length > 0 ) {
						callback.call( this, $.markApp.global.cfg.countries );
					} else {
						$.ajax( {
							'url': '/media/assets/js/vendor/country_codes.json',
							'dataType': 'JSON',
							'success': function ( data ) {
								$.markApp.global.cfg.countries = data;
								callback.call( this, data );
							},
							'error': function () {
								// handle error loading countries
							}
						} );
					}
				},
				showLoader: function( ) {
					
				},
				hideLoader: function( ) {
					$( '.overlay-wrapper' ).remove();
				},
				showError: function ( msg ) {
					
				},
				dismissError: function ( ) {
					
				},
				resize: function( e ) {
					var cfg = $.markApp.global.cfg;
					var availableWidth = $( window ).width();
					var availableHeight = $( window ).height() -  ( $( 'header' ).height() + $( '#callout-boxes' ).height() );
					if ( availableWidth < cfg.minWidth ) availableWidth = cfg.minWidth;
					if ( availableHeight < cfg.minHeight ) availableHeight = cfg.minHeight;
					cfg.$container.parent().width( availableWidth );
					cfg.$container.parent().height( availableHeight );
					cfg.width = availableWidth;
					cfg.height = availableHeight;
					// trigger the app resize event -- all modules should bind to this event
					cfg.$container.trigger( 'resize', [availableWidth, availableHeight] );
				}
			}
		},
		cache : {},
		capture: {
			cfg: {
				defaults: {
					layers: [],
					liveDrawingLayer: null,
					drawnLayer: null,
					captureLimit: 300,
					capturedPoints: 0,
					strokes: [],
					cleanedStrokes: [],
					mouseX: 0,
					mouseY: 0,
					lastX: null,
					lastY: null,
					mouseDown: false,
					captureTime: null,
					rtl: null,
					state: 'drawing',
					initialized: false,
					topOffset: 0,
					scene: null,
					currentStroke: null,
					mark: null,
					mouseIn: true
				}
			},
			fn: {
				init: function() {
					// restore the defaults
					$.extend( $.markApp.capture.cfg, $.markApp.capture.cfg.defaults );
					var cfg = $.markApp.capture.cfg;
					cfg.drawnLayer = $.markApp.global.cfg.layerManager.addLayer();
					cfg.liveDrawingLayer = $.markApp.global.cfg.layerManager.addLayer();
					cfg.capturedPoints = 0;
					cfg.rtl = null;
					cfg.mouseDown = false
					cfg.lastX = null;
					cfg.lastY = null;
					cfg.strokes = [];
					
					$( '#markapp' ).css( { 'zIndex': 100, 'cursor': 'none' } );
					
					$( window )
						.bind( 'loop.markApp.capture', $.markApp.capture.fn.loop );
						
					$.markApp.global.cfg.$container
						.bind( 'mousemove.markApp.capture', $.markApp.capture.fn.mouseMove )
						.bind( 'mousedown.markApp.capture', $.markApp.capture.fn.mouseDown )
						.bind( 'mouseup.markApp.capture', $.markApp.capture.fn.mouseUp )
						.bind( 'mouseout.markApp.capture', $.markApp.capture.fn.mouseOut )
						.bind( 'mouseover.markApp.capture', $.markApp.capture.fn.mouseOver )
						.bind( 'resize.markApp.capture', $.markApp.capture.fn.resize )
						.trigger( 'resize.markApp.capture', [$.markApp.global.cfg.width, $.markApp.global.cfg.height] )
						.bind( 'domupdate.markApp.capture', $.markApp.capture.fn.domready )
					// bind our de-initializer to the containers swap event
						.bind( 'swap.markApp.capture', $.markApp.capture.fn.deinit );
						
					cfg.initialized = true;
				},
				deinit: function() {
					var cfg = $.markApp.capture.cfg;
					if( !cfg.initialized ) return;
					// unbind all handlers
					$( window )
						.unbind( 'loop.markApp.capture' );
					$.markApp.global.cfg.$container
						.unbind( 'swap.markApp.capture' )
						.unbind( 'domupdate.markApp.capture' )
						.unbind( 'mousemove.markApp.capture' )
						.unbind( 'mousedown.markApp.capture' )
						.unbind( 'mouseup.markApp.capture' )
						.unbind( 'resize.markApp.capture' );
					// fade it out

					// remove our layers
					cfg.liveDrawingLayer.remove();
					cfg.drawnLayer.remove();
					cfg.initialized = false;
				},
				domready: function ( ) {
					// template dom is ready
					$( '#markmaker-reset a' )
						.addClass( 'disabled' )
						.bind( 'mousedown', $.markApp.capture.fn.reset );
					$( '#markmaker-submit a' )
						.addClass( 'disabled' )
						.bind( 'mousedown', $.markApp.capture.fn.submit );
					// load the country codes into the dialog
					$.markApp.global.fn.withCountryCodes( function ( countryCodes ) {
						var $select = $( '#markmaker-country' );
						for( var i = 0; i < countryCodes.length; i++ ) {
							var $option = $( '<option />' )
								.val( countryCodes[i].code )
								.text( countryCodes[i].name );
							$select.append( $option );
						}
					} );
					$( '#markmaker-location a' )
						.bind( 'mousedown', $.markApp.capture.fn.locationDialogToggle );
					$( '#markmaker-information' )
						.bind( 'mouseover', $.markApp.capture.fn.informationDialogToggle )
						.bind( 'mouseout', $.markApp.capture.fn.informationDialogToggle );
				},
				resize: function ( e, availableWidth, availableHeight ) {
					var cfg = $.markApp.capture.cfg;
					cfg.topOffset = $.markApp.global.cfg.$container.offset().top;
					cfg.liveDrawingLayer.setSize( availableWidth, availableHeight );
					cfg.drawnLayer.setSize( availableWidth, availableHeight );
					// redraw all marks
					if( cfg.mark && cfg.mark.strokes.length > 0 ) {
						for( var i = 0; i < cfg.mark.strokes.length; i++ ) {
							$.markApp.capture.fn.drawStroke( cfg.mark.strokes[i] );
						}
					}
				},
				mouseMove: function( e ) {
					$.markApp.capture.cfg.mouseX = e.layerX;
					$.markApp.capture.cfg.mouseY = e.layerY;
					if ( $.markApp.capture.cfg.mouseDown && $.markApp.capture.cfg.state == "drawing" )
						$.markApp.capture.fn.capturePoint();
				},
				mouseDown: function( e ) {
					e.preventDefault();
					var cfg = $.markApp.capture.cfg;
					cfg.mouseDown = true;
					if( cfg.state == "drawing" ) {
						// hit test the user for bound events
						$.markApp.capture.fn.hitTest( e.clientX, e.clientY );
						// start a new mark if we need to
						if( !cfg.mark ) $.markApp.capture.fn.startMark();
						// start a new stroke unless we already have a stroke open for some reason
						if( !cfg.currentStroke ) $.markApp.capture.fn.startStroke();
					}
				},
				mouseUp: function( e ) {
					var cfg = $.markApp.capture.cfg;
					if( !cfg.mouseDown ) return;
					cfg.mouseDown = false;
					if( cfg.state == "drawing" ) {
						$.markApp.capture.fn.endStroke();
					}
				},
				mouseOut: function ( e ) {
					var cfg = $.markApp.capture.cfg;
					// hide the cursor and guide
					cfg.mouseIn = false;
				},
				mouseOver: function ( e ) {
					var cfg = $.markApp.capture.cfg;
					// show the cursor and guide
					cfg.mouseIn = true;
				},
				locationDialogToggle: function ( e ) {
					e.preventDefault();
					var cfg = $.markApp.capture.cfg;
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
				informationDialogToggle: function ( e ) {
					e.preventDefault();
					var cfg = $.markApp.capture.cfg;
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
				startMark: function ( ) {
					var cfg = $.markApp.capture.cfg;
					// setup the mark
					cfg.captureTime = ( new Date() ).getTime();
					cfg.rtl = cfg.mouseX > $( window ).width() / 2;
					cfg.mark = new Mark.gmlMark( [], '', '', cfg.captureTime, cfg.rtl );
					// remove the disabled styling from the submit and reset buttons
					$( '#markmaker-submit a, #markmaker-reset a' ).removeClass( 'disabled' );
				},
				endMark: function ( ) {
					var cfg = $.markApp.capture.cfg;
					// close out the mark and prep for submission
					cfg.mark.setupVars();
				},
				startStroke: function ( ) {
					// start a new, empty stroke
					var cfg = $.markApp.capture.cfg;
					cfg.currentStroke = [];
				},
				endStroke: function ( ) {
					var cfg = $.markApp.capture.cfg;
					// close out this stroke
					cfg.strokes.push( cfg.currentStroke );
					// run the simplification algorithim
					var simpStroke = Mark.simplification.simplifyPath( cfg.currentStroke, 1 );
					// run the weighting algorithm 
					simpStroke = Mark.simplification.weightPath( simpStroke, [5,10,20,40] );
					cfg.mark.strokes.push( simpStroke );
					cfg.cleanedStrokes.push( simpStroke );
					// draw this stroke the to drawn layer
					$.markApp.capture.fn.drawStroke( simpStroke );
					// recalculate the captured point count
					cfg.capturedPoints -= cfg.currentStroke.length - simpStroke.length;
					// set the currentStroke to null 
					cfg.currentStroke = null;
				},
				capturePoint: function ( ) {
					var cfg = $.markApp.capture.cfg;
					if( cfg.capturedPoints > cfg.captureLimit ) {
						$.markApp.capture.fn.mouseUp();
						$.markApp.capture.fn.closeShop();
						return;
					}
					var time = ( new Date() ).getTime();
					// create a new point and add it to the current stroke
					var point = new Mark.gmlPoint( cfg.mouseX, cfg.mouseY, time - cfg.captureTime, 0 );
					if( cfg.currentStroke.length > 0 ) {
						var lastPoint = cfg.currentStroke[cfg.currentStroke.length - 1];
						point.speed = lastPoint.speedToPoint( point );
						point.setAngleFromPoint( lastPoint );
						point.smoothAgainst( lastPoint, 1/100 );
					} else {
						// if this isn't the first stroke, draw a connecting line
						if( cfg.strokes.length >= 1 ) {
							$.markApp.capture.fn.drawGuide( cfg.drawnLayer.context, cfg.lastX, cfg.lastY, point.x, point.y );
						}
					}
					cfg.currentStroke.push( point );
					cfg.lastX = point.x;
					cfg.lastY = point.y;
					
					// increment our total points counter
					cfg.capturedPoints++;
				},
				hitTest: function( x, y ) {
					var cfg = $.markApp.capture.cfg;
					if( cfg.rtl ) {
						if ( x < 50 ) {
							$.markApp.capture.fn.closeShop();
							return false;
						}
					} else {
						if ( x > $( window ).width() - 100 ) {
							$.markApp.capture.fn.closeShop();
							return false;
						}
					}
				},
				reset: function () {
					var cfg = $.markApp.capture.cfg;
					cfg.liveDrawingLayer.clean();
					cfg.drawnLayer.clean();
					cfg.capturedPoints = 0;
					cfg.rtl = null;
					cfg.mouseDown = false
					cfg.lastX = null;
					cfg.lastY = null;
					cfg.state = "drawing";
					cfg.strokes = [];
					cfg.currentStroke = null;
					cfg.mark = null;
					cfg.captureTime = null;
					$( '#markmaker-submit a, #markmaker-reset a' ).addClass( 'disabled' );
					$( '#markapp' ).css( { 'cursor': 'none' } );
					$( '#markmaker-instructions' ).fadeIn();
				},
				closeShop: function() {
					var cfg = $.markApp.capture.cfg;
					cfg.state = 'preview';
					// close the mark
					$.markApp.capture.fn.endMark();
					// clear the drawing layer
					cfg.liveDrawingLayer.clean();
					// if the user is out of points, draw the line to the opposite side of the screen
					var g = cfg.liveDrawingLayer.context,
						x = cfg.lastX,
						y = cfg.lastY;
					g.strokeStyle = 'rgba(0,0,0,0.2)';
					g.lineWidth = 1;
					g.beginPath();
					g.dashedLineTo( x, y, cfg.rtl ? 0 : cfg.liveDrawingLayer.canvas.width, y, [7, 5] );
					g.closePath();
					g.stroke();
					// set our cursor back to normal
					$( '#markapp' ).css( { 'cursor': 'default' } );
				},
				submit: function( e ) {
					if ( e ) e.preventDefault();
					var cfg = $.markApp.capture.cfg;
					if( cfg.state == "submitting" ) return;
					if( cfg.state != "preview" ) $.markApp.capture.fn.closeShop();
					// process our points, and send them off
					cfg.state = "submitting";
					$( '#markmaker-submit a' ).addClass( 'disabled' );
					var data = {};
					data.rtl = cfg.rtl;
					data.strokes = cfg.strokes;
					// data.locale = cfg.locale; // TODO - impliment location awareness
					var points_obj = JSON.stringify( data );
					var points_obj_simplified = JSON.stringify(cfg.mark);
					$.ajax({
						url: '/requests/save_mark',
						data: {
							'points_obj': points_obj,
							'points_obj_simplified': points_obj_simplified,
							'country_code': 'US' 
						},
						type: 'POST',
						dataType: 'JSON',
						success: function( data ) {
							// load our mark data into the cache referencing it's id
							$.markApp.cache[ data.mark_reference ] = JSON.parse(points_obj_simplified);
							// now redirect to our mark
							app.setLocation( '#/mark/'+ data.mark_reference );
						}
					} );
					return false;
				},
				loop: function () {
					var cfg = $.markApp.capture.cfg;
					switch( cfg.state ) {
						case "drawing":
							$.markApp.capture.fn.drawLoop();
							break;
						case "preview":
							// $.markApp.capture.fn.previewLoop();
							break;
					}
				},
				drawStroke: function ( stroke ) { 
					var cfg = $.markApp.capture.cfg;
					Mark.thickBrush( cfg.drawnLayer.context, [stroke] );
					cfg.drawnLayer.context.fillStyle = "rgba(255,255,255,0.3)";
					cfg.drawnLayer.context.strokeStyle = "rgba(255,255,255,0.3)";
					Mark.circleBrush( cfg.drawnLayer.context, [stroke] );
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
				drawLoop: function() {
					var cfg = $.markApp.capture.cfg;
					// Clean the drawing layer
					cfg.liveDrawingLayer.clean();
					if( cfg.currentStroke && cfg.currentStroke.length > 0 ) {
						// draw out what we've got in the stroke buffer
						Mark.thickBrush( cfg.liveDrawingLayer.context, [cfg.currentStroke] );
						cfg.liveDrawingLayer.context.fillStyle = "rgba(255,255,255,0.3)";
						cfg.liveDrawingLayer.context.strokeStyle = "rgba(255,255,255,0.3)";
						Mark.circleBrush( cfg.liveDrawingLayer.context, [cfg.currentStroke] );
					}
					if( ! cfg.mouseIn ) return;
					if( !cfg.mouseDown ) {
						// draw the guide
						var x, y;
						if( cfg.strokes.length == 0 ) {
							x = cfg.mouseX > $( window ).width() / 2 ? cfg.liveDrawingLayer.canvas.width : 0,
							y = cfg.mouseY;
						} else {
							x = cfg.lastX;
							y = cfg.lastY;
						}
						$.markApp.capture.fn.drawGuide( cfg.liveDrawingLayer.context, x, y, cfg.mouseX, cfg.mouseY );
					}
					$.markApp.capture.fn.drawCursor( cfg.liveDrawingLayer.context, cfg.mouseX, cfg.mouseY, ( cfg.captureLimit - cfg.capturedPoints ) / cfg.captureLimit  );
				},
				previewLoop: function () {
					var cfg = $.markApp.capture.cfg;
					cfg.guideLayer.clean();
					cfg.drawingLayer.clean();
					g = cfg.drawingLayer.context;
					g.strokeStyle = 'rgba(0,0,0,0.6)';
					g.miterLimit = 100;
					g.lineWidth = 1;
					g.lineCap = 'round';
					g.lineJoin = 'round';
					Mark.thickBrush( cfg.drawingLayer.context, cfg.mark.strokes, cfg.mark.x, cfg.mark.y );
					cfg.drawingLayer.context.fillStyle = "rgba(255,255,255,0.3)";
					cfg.drawingLayer.context.strokeStyle = "rgba(255,255,255,0.3)";
					Mark.circleBrush( cfg.drawingLayer.context, cfg.mark.strokes, cfg.mark.x, cfg.mark.y );
				}
			}
		},
		linearMode: {
			cfg: {
				defaults: {
					marks: [],
					leftBuffer: [],
					rightBuffer: [],
					displayedMarks: [],
					scene: null,
					cameraChange: {
						aX: 0,
						aY: 0,
						aZ: 0,
						vX: 0,
						vY: 0,
						vZ: 0
					},
					drawingLayer: null,
					labelLayer: null,
					frameCount: 0,
					maxTime: 0,
					mouseX: 0, 
					mouseY: 0,
					viewX: 0,
					initialized: false,
					detailLevel: 1,
					requestingMarks: false,
					moreLeft: true,
					moreRight: true
				}
			},
			fn: {
				init: function(  ) {
					$.extend( $.markApp.linearMode.cfg, $.markApp.linearMode.cfg.defaults );
					
					var cfg = $.markApp.linearMode.cfg;
					cfg.drawingLayer = $.markApp.global.cfg.layerManager.addLayer();
					cfg.labelLayer = $.markApp.global.cfg.layerManager.addLayer();
					cfg.scene = new Mark.scene();
					
					// TODO -- this could all be abstracted
					$( window )
						.bind( 'loop.markApp.linearMode', $.markApp.linearMode.fn.loop )
						.bind( 'keyup.markApp.linearMode', $.markApp.linearMode.fn.keyup )
						.bind( 'keypress.markApp.linearMode', $.markApp.linearMode.fn.keypress )
						.bind( 'keydown.markApp.linearMode', $.markApp.linearMode.fn.keydown );
					$.markApp.global.cfg.$container
						.bind( 'mousemove.markApp.linearMode', $.markApp.linearMode.fn.mouseMove )
						.bind( 'mousedown.markApp.linearMode', $.markApp.linearMode.fn.mouseDown )
						.bind( 'mouseup.markApp.linearMode', $.markApp.linearMode.fn.mouseUp )
						.bind( 'resize.markApp.linearMode', $.markApp.linearMode.fn.resize )
						.trigger( 'resize.markApp.linearMode', [$.markApp.global.cfg.width, $.markApp.global.cfg.height] )
					// bind our de-initializer to the containers swap event
						.bind( 'swap.markApp.linearMode', $.markApp.linearMode.fn.deinit );
					cfg.initialized = true;
				},
				deinit: function( ) {
					var cfg = $.markApp.linearMode.cfg;
					// unbind event handlers
					$( window )
						.unbind( 'loop.markApp.linearMode' )
						.unbind( 'keyup.markApp.linearMode' )
						.unbind( 'keydown.markApp.linearMode' );
					$.markApp.global.cfg.$container
						.unbind( 'swap.markApp.linearMode' )
						.unbind( 'mousemove.markApp.linearMode' )
						.unbind( 'mousedown.markApp.linearMode' )
						.unbind( 'mouseup.markApp.linearMode' )
						.unbind( 'resize.markApp.linearMode' );
					// remove our layers
					cfg.drawingLayer.remove();
					cfg.labelLayer.remove();
					// clear any instantiated variables
					cfg.initialized = false;
				},
				resize: function( e, availableWidth, availableHeight) {
					var cfg = $.markApp.linearMode.cfg;
					cfg.drawingLayer.setSize( availableWidth, availableHeight );
					cfg.labelLayer.setSize( availableWidth, availableHeight );
				},
				mouseMove: function ( e ) {
					var cfg = $.markApp.linearMode.cfg;
					cfg.mouseX = e.layerX;
					cfg.mouseY = e.layerY;
				},
				mouseUp: function( e ) {},
				mouseDown: function( e ) {},
				mouseOver: function( e ) {},
				mouseOut: function ( e ) {},
				keydown: function ( e ) {
					var cfg = $.markApp.linearMode.cfg;
					switch( e.keyCode ) {
						case 38:
							// arrow up
							e.preventDefault();
							cfg.cameraChange.aZ = -10;
							return false;
							break;
						case 40:
							// arrow down
							e.preventDefault();
							cfg.cameraChange.aZ = 10;
							return false;
							break;
						case 39:
							// arrow right -- pan the camera to the right
							e.preventDefault();
							cfg.cameraChange.aX = 10;
							return false;
							break;
						case 37:
							// arrow left -- pan the camera to the left
							e.preventDefault();
							cfg.cameraChange.aX = -10;
							return false;
							break;
					}
				},
				keyup: function( e ) {
					var cfg = $.markApp.linearMode.cfg;
					switch( e.keyCode ) {
						case 38:
						case 40:
							// arrow up
							e.preventDefault();
							cfg.cameraChange.aZ = 0;
							break;
						case 39:
						case 37:
							e.preventDefault();
							cfg.cameraChange.aX = 0;
							break;
					}
				},
				// prevent our bound keys from firing native events
				keypress: function( e ) {
					var cfg = $.markApp.linearMode.cfg;
					switch( e.keyCode ) {
						case 38:
						case 40:
						case 39:
						case 37:
							e.preventDefault();
							break;
					}
				},
				loadMarks: function( options ) {
					var callback = options.success;
					delete options.success;
					// TODO -- impliment country filtering
					$.ajax( {
						url: options.reference_mark ? '/requests/marks_by_reference' : '/requests/all_marks',
						data: options,
						dataType: 'JSON',
						success: callback
					} );
				},
				setupMarks: function( marks, buffer ) {
					var cfg = $.markApp.linearMode.cfg;
					var pMark = null;
					var reverse = buffer == cfg.leftBuffer ? true : false;
					
					if ( reverse ) {
						pMark = cfg.leftBuffer.length == 0 ? cfg.scene.objects[0] : cfg.leftBuffer[0];
						for( var i = marks.length - 1; i <= 0; i-- ) {
							points_obj = JSON.parse( marks[i].points_obj_simplified );
							var mark = new Mark.gmlMark( points_obj.strokes, marks[i].reference, marks[i].country_code, marks[i].date_drawn, points_obj.rtl );
							if ( pMark ) mark.positionRelativeTo( pMark, true );
							cfg.leftBuffer.unshift( mark );
							pMark = mark;
						}
					} else {
						pMark = cfg.rightBuffer.length == 0 ? 
							cfg.scene.objects[cfg.scene.objects.length - 1] : cfg.rightBuffer[cfg.rightBuffer.length - 1 ];
						for( var i =0; i< marks.length; i++ ) {
							points_obj = JSON.parse( marks[i].points_obj_simplified );
							var mark = new Mark.gmlMark( points_obj.strokes, marks[i].reference, marks[i].country_code, marks[i].date_drawn, points_obj.rtl );
							if ( pMark ) mark.positionRelativeTo( pMark, false );
							cfg.rightBuffer.push( mark );
							pMark = mark;
						}
					}
					
				},
				marksInView: function( width, height ) {
					var cfg = $.markApp.linearMode.cfg;
					var marks = [];
					for( var i = 0; i < cfg.marks.length; i++ ) {
						var mark = cfg.marks[i];
						if ( mark.x + mark.bWidth > 0 && mark.x < width && mark.y + mark.bHeight > 0 && mark.y < height )
							marks.push( mark );
					}
					return marks;
				},
				marksInRange: function( marks, xMin, xMax ) {
					var cfg = $.markApp.linearMode.cfg;
					var retMarks = [];
					for( var i = 0; i < marks.length; i++ ) {
						var mark = marks[i];
						if ( mark.x + mark.bWidth > xMin && mark.x < xMax )
							retMarks.push( mark );
					}
					return retMarks;
				},
				// moves marks from the buffers to the display
				// also will grab more marks if a buffer length sinks below a threshold
				updateBuffers: function( xMin, xMax ) {
					var cfg = $.markApp.linearMode.cfg;
					if( cfg.rightBuffer.length > 0 ) {
						// look for marks that need added from the right buffer
						var mark = cfg.rightBuffer[0];
						while( mark && mark.x < xMax ) {
							cfg.scene.objects.push( cfg.rightBuffer.shift() );
							mark = cfg.rightBuffer[0];
						}
					}
					if( cfg.leftBuffer.length > 0 ) {
						// look for marks that need added from the left buffer
						var mark = cfg.leftBuffer[cfg.leftBuffer.length - 1];
						while( mark && mark.x + mark.bWidth > xMin ) {
							cfg.scene.objects.unshift( cfg.leftBuffer.pop() );
							mark = cfg.leftBuffer[cfg.leftBuffer.length - 1];
						}
					}
					// if either of our buffers are running low, load more marks
					if ( cfg.leftBuffer.length < 5 && cfg.scene.objects.length > 0 && cfg.moreLeft && !cfg.requestingMarks ) {
						// load more into the left buffer
						cfg.requestingMarks = true;
						var lastMark = cfg.leftBuffer.length > 0 ? cfg.leftBuffer[0] : cfg.scene.objects[0];
						$.markApp.linearMode.fn.loadMarks( {
							'reference_mark': lastMark.reference,
							'include_forward': 0,
							'include_back': 20,
							'include_mark': false,
							'success': function ( data ) {
								if( data.success ) {
									// push the marks into the leftBuffer
									$.markApp.linearMode.fn.setupMarks( data.marks, cfg.leftBuffer );
									cfg.moreLeft = false;
								} else {
									if ( data.error == "No marks to be parsed" ) cfg.moreLeft = false;
								}
								cfg.requestingMarks = false;
							}
						} );
					} else if ( cfg.rightBuffer.length < 5 && cfg.scene.objects.length > 0 && cfg.moreRight && !cfg.requestingMarks ) {
						// load more into the right buffer
						cfg.requestingMarks = true;
						var lastMark = cfg.rightBuffer.length > 0 ? 
							cfg.rightBuffer[cfg.rightBuffer.length - 1] : cfg.scene.objects[cfg.scene.objects.length - 1];
						$.markApp.linearMode.fn.loadMarks( {
							'reference_mark': lastMark.reference,
							'include_back': 0,
							'include_forward': 20,
							'include_mark': false,
							'success': function ( data ) {
								if( data.success ) {
									// push the marks into the rightBuffer
									$.markApp.linearMode.fn.setupMarks( data.marks, cfg.rightBuffer );
									cfg.moreRight = false;
								} else {
									if ( data.error == "No marks to be parsed" ) cfg.moreRight = false;
								}
								cfg.requestingMarks = false;
							}
						} );
					}
				},
				// moves marks from the buffers to the display
				updateDisplayedMarks: function( xMin, xMax) {
					var cfg = $.markApp.linearMode.cfg;
					if( cfg.scene.objects.length == 0 ) return;
					// look for marks that need moved into the left buffer
					var mark = cfg.scene.objects[0];
					while( mark && mark.x + mark.bWidth < xMin ) {
						cfg.leftBuffer.push( cfg.scene.objects.shift() );
						mark = cfg.scene.objects[0];
					}
					// look for marks that need moved into the right buffer
					mark = cfg.scene.objects[cfg.scene.objects.length - 1];
					while( mark && mark.x > xMax ) {
						cfg.rightBuffer.unshift( cfg.scene.objects.pop() );
						mark = cfg.scene.objects[cfg.scene.objects - 1];
					}
				},
				hitTest: function( x, y ) {
					
				},
				loop: function () {
					var cfg = $.markApp.linearMode.cfg;
					// if( cfg.marks.length == 0 ) return;
					cfg.drawingLayer.clean();
					g = cfg.drawingLayer.context;
					g.strokeStyle = 'rgba(0,0,0,0.6)';
					g.miterLimit = 100;
					g.lineWidth = 1;
					g.lineCap = 'round';
					g.lineJoin = 'round';
					cfg.frameCount++;
					
					// check if the user is hovering over one of our items
					$.markApp.linearMode.fn.hitTest( cfg.mouseX, cfg.mouseY );
					// add marks from the buffer as needed
					$.markApp.linearMode.fn.updateBuffers( cfg.scene.camera.x - 100, cfg.scene.camera.x + 4000 );
					// update displayed marks
					$.markApp.linearMode.fn.updateDisplayedMarks( cfg.scene.camera.x - 100, cfg.scene.camera.x + 4000 );
					
					// update the position of the camera
					// TODO -- add friction, add camera limits, add velocity limits
					cfg.cameraChange.vX += cfg.cameraChange.aX;
					cfg.cameraChange.vZ += cfg.cameraChange.aZ;
					// apply friction
					cfg.cameraChange.vX *= .93;
					cfg.cameraChange.vZ *= .93;
					cfg.scene.camera.x += cfg.cameraChange.vX;
					cfg.scene.camera.z += cfg.cameraChange.vZ;
					var dY = 0;
					if ( cfg.scene.objects.length > 1 )
						dY = ( cfg.drawingLayer.canvas.height / 2 ) - ( ( cfg.scene.objects[1].bHeight / 2 ) + cfg.scene.objects[1].y ) + cfg.scene.camera.y;
					if ( dY != 0 && Math.abs(dY) >= 10) cfg.scene.camera.y += ( dY > 0 ? -10 : 10 );
					
					Mark.renderer.renderScene( cfg.scene, cfg.drawingLayer.context, { x: cfg.mouseX, y: cfg.mouseY } );
					
				}
			}
		},
		playbackMode: {
			cfg: {
				defaults: {
					rtl: false,
					mark: null,
					drawingLayer: null,
					frameCount: 0,
					initialized: false,
					detailLevel: 1
				}
			},
			fn: {
				init: function(  ) {
					$.extend( $.markApp.playbackMode.cfg, $.markApp.playbackMode.cfg.defaults );
					
					var cfg = $.markApp.playbackMode.cfg;
					cfg.drawingLayer = $.markApp.global.cfg.layerManager.addLayer();
					// TODO -- this could all be abstracted
					$( window )
						.bind( 'loop.markApp.playbackMode', $.markApp.playbackMode.fn.loop )
						.bind( 'keydown.markApp.playbackMode', $.markApp.playbackMode.fn.keydown );
					$.markApp.global.cfg.$container
						.bind( 'mousemove.markApp.playbackMode', $.markApp.playbackMode.fn.mouseMove )
						.bind( 'mousedown.markApp.playbackMode', $.markApp.playbackMode.fn.mouseDown )
						.bind( 'mouseup.markApp.playbackMode', $.markApp.playbackMode.fn.mouseUp )
						.bind( 'resize.markApp.playbackMode', $.markApp.playbackMode.fn.resize )
						.trigger( 'resize.markApp.playbackMode', [$.markApp.global.cfg.width, $.markApp.global.cfg.height] )
					// bind our de-initializer to the containers swap event
						.bind( 'swap.markApp.playbackMode', $.markApp.playbackMode.fn.deinit );
					cfg.initialized = true;
				},
				deinit: function( ) {
					var cfg = $.markApp.playbackMode.cfg;
					// unbind event handlers
					$( window )
						.unbind( 'loop.markApp.playbackMode' )
						.unbind( 'keydown.markApp.playbackMode' );
					$.markApp.global.cfg.$container
						.unbind( 'swap.markApp.playbackMode' )
						.unbind( 'mousemove.markApp.playbackMode' )
						.unbind( 'mousedown.markApp.playbackMode' )
						.unbind( 'mouseup.markApp.playbackMode' )
						.unbind( 'resize.markApp.playbackMode' );
					// remove our layers
					cfg.drawingLayer.remove();
					// clear any instantiated variables
					cfg.initialized = false;
				},
				resize: function( e, availableWidth, availableHeight) {
					var cfg = $.markApp.playbackMode.cfg;
					// FIXME --> currently this clears the canvases
					cfg.drawingLayer.setSize( availableWidth, availableHeight );
				},
				mouseMove: function ( e ) {
					
				},
				mouseUp: function( e ) {
					
				},
				mouseDown: function( e ) {
					
				},
				keydown: function ( e ) {
					var cfg = $.markApp.playbackMode.cfg;
					switch( e.keyCode ) {
						case 38:
							// arrow up
							e.preventDefault();
							cfg.detailLevel++;
							if ( cfg.detailLevel > 5 ) cfg.detailLevel = 5;
							break;
						case 40:
							// arrow down
							e.preventDefault();
							cfg.detailLevel--;
							if ( cfg.detailLevel < 1 ) cfg.detailLevel = 1;
							break;
					}
				},
				loadMark: function( id ) {
					if ( $.markApp.cache[id] ) {
						$.markApp.playbackMode.fn.setupMark( $.markApp.cache[id] );
					} else {
						$.ajax({
							url: '/requests/get_mark',
							data: { 'mark_id': id },
							dataType: 'JSON',
							success: function( data ) {
								// shit loaded
								$.markApp.playbackMode.fn.setupMark( data );
							}
						} );
					}
				},
				setupMark: function( mark ) {
					var cfg = $.markApp.playbackMode.cfg;
					cfg.mark = new Mark.gmlMark( mark.strokes, '', '', 0, mark.rtl );
					cfg.mark.x = mark.x;
					cfg.mark.y = mark.y;
					
				},
				strokesAtTime: function ( strokes, time, maxTime ) {
					if( maxTime  < time ) return strokes;
					var sat = [[]];
					var curIndex = [0, 0]
					var nextPoint = strokes[curIndex[0]][curIndex[1]];
					while( nextPoint.time < time ) {
						sat[sat.length - 1].push( nextPoint );
						curIndex[1]++;
						if( strokes[curIndex[0]].length == curIndex[1] ) {
							curIndex[0]++;
							curIndex[1] = 0;
							sat.push([]);
						}
						nextPoint = strokes[curIndex[0]][curIndex[1]];
					}
					return sat;
				},
				loop: function () {
					var cfg = $.markApp.playbackMode.cfg;
					if( !cfg.mark ) return;
					cfg.drawingLayer.clean();
					g = cfg.drawingLayer.context;
					g.strokeStyle = 'rgba(0,0,0,0.6)';
					g.miterLimit = 100;
					g.lineWidth = 1;
					g.lineCap = 'round';
					g.lineJoin = 'round';
					cfg.frameCount++;
					if( ( cfg.frameCount * 50 ) > cfg.mark.maxTime + 3000 ) {
						cfg.frameCount = 0;
					}
					var drawStrokes = $.markApp.playbackMode.fn.strokesAtTime(cfg.mark.strokes, cfg.frameCount * 50, cfg.mark.maxTime );
					Mark.thickBrush( cfg.drawingLayer.context, drawStrokes, cfg.mark.x, cfg.mark.y, cfg.detailLevel );
					cfg.drawingLayer.context.fillStyle = "rgba(255,255,255,0.3)";
					cfg.drawingLayer.context.strokeStyle = "rgba(255,255,255,0.3)";
					Mark.circleBrush( cfg.drawingLayer.context, drawStrokes, cfg.mark.x, cfg.mark.y, cfg.detailLevel );
				}
			}
		}
	}; // $.markApp
	
	$( document ).ready( function () {
		function browserSupportsRequiredFeatures() {
			// TODO -- add actual conditionals here looking for canvas support and anything else required
			return true;
		}
		if ( browserSupportsRequiredFeatures ) {
			// remove the placeholder content
			$( '#fallback' ).remove();
			// run the app
			app.run( '#/' );
		}

	} ); //document ready
} )( jQuery );