( function( $ ) {
	
	$.markTest = {
		global: {
			cfg: {
				$container: null,
				frameCount: 0
			},
			fn: {
				init: function( container ) {
					var cfg = $.markTest.global.cfg;
					cfg.$container = container;
					cfg.layerManager = new mark.layerManager( container.get(0) );
					$.markTest.global.fn.resize();
					$.markTest.global.fn.loop();
				},
				loop: function( e ) {
					// reset the delay
					setTimeout( function() { $.markTest.global.fn.loop( ); }, 60 / 1000 );
					// incremenet the counter
					$.markTest.global.cfg.frameCount++;
					// dispatch the event
					$( window )
						.trigger( 'loop.markTest' );
				},
				resize: function( e ) {
					var cfg = $.markTest.global.cfg;
					cfg.$container.parent().width( $( window ).width() );
					cfg.$container.parent().height( $( window ).height() - $( 'header' ).height() );
					// trigger the app resize event -- all modules should bind to this event
					cfg.$container.trigger( 'resize' );
				}
			}
		},
		capture: {
			cfg: {
				layers: [],
				guideLayer: null,
				drawingLayer: null,
				captureLimit: 300,
				capturedPoints: 0,
				strokes: [],
				mouseX: 0,
				mouseY: 0,
				lastX: null,
				lastY: null,
				mouseDown: false,
				captureTime: null,
				rtl: null,
				state: 'drawing',
				initialized: false
			},
			fn: {
				init: function() {
					var cfg = $.markTest.capture.cfg;
					cfg.guideLayer = $.markTest.global.cfg.layerManager.addLayer();
					cfg.drawingLayer = $.markTest.global.cfg.layerManager.addLayer();
					cfg.guideLayer.setSize( $( '#content' ).width(), $( '#content' ).height() );
					cfg.drawingLayer.setSize( $( '#content' ).width(), $( '#content' ).height() );
					$.markTest.capture.fn.reset();

					$.markTest.global.cfg.$container
						.bind( 'mousemove.markTest.capture', $.markTest.capture.fn.mouseMove )
						.bind( 'mousedown.markTest.capture', $.markTest.capture.fn.mouseDown )
						.bind( 'mouseup.markTest.capture', $.markTest.capture.fn.mouseUp );
					cfg.initialized = true;
				},
				mouseMove: function( e ) {
					var cfg = $.markTest.capture.cfg;
					cfg.mouseX = e.clientX;
					cfg.mouseY = e.clientY - $.markTest.global.cfg.$container.offset().top;
					if ( cfg.mouseDown )
						$.markTest.capture.fn.capturePoint();
				},
				capturePoint: function( ) {
					var cfg = $.markTest.capture.cfg;
					if( cfg.capturedPoints > cfg.captureLimit ) return;
					var time = ( new Date() ).getTime();
					if( !cfg.captureTime ) cfg.captureTime = time;
					if( !cfg.rlt ) cfg.rtl = cfg.mouseX > $( window ).width() / 2;
					
					// create a new point and add it to the current stroke
					var point = new mark.gmlPoint( cfg.mouseX, cfg.mouseY, time - cfg.captureTime );
					cfg.strokes[cfg.strokes.length - 1].push( point );
					cfg.lastX = point.x;
					cfg.lastY = point.y;
					
					// increment our total points counter
					cfg.capturedPoints++;
				},
				mouseDown: function( e ) {
					e.preventDefault();
					var cfg = $.markTest.capture.cfg;
					$.markTest.capture.fn.reset();
					cfg.mouseDown = true;
					$( window )
						.bind( 'loop.markTest.capture', $.markTest.capture.fn.loop );
					// start a new stroke
					cfg.strokes.push( [] );
				},
				mouseUp: function( e ) {
					var cfg = $.markTest.capture.cfg;
					cfg.mouseDown = false;
					$( window )
						.unbind( 'loop.markTest.capture' );
					$.markTest.capture.fn.test();
				},
				hitTest: function( x, y ) {
					var cfg = $.markTest.capture.cfg;
					if( cfg.rtl ) {
						if ( x < 50 ) {
							$.markTest.capture.fn.closeShop();
							return false;
						}
					} else {
						if ( x > $( window ).width() - 100 ) {
							$.markTest.capture.fn.closeShop();
							return false;
						}
					}
				},
				reset: function () {
					var cfg = $.markTest.capture.cfg;
					cfg.guideLayer.clean();
					cfg.drawingLayer.clean();
					cfg.capturedPoints = 0;
					cfg.rtl = null;
					cfg.mouseDown = false
					cfg.lastX = null;
					cfg.lastY = null;
					cfg.state = "drawing";
					cfg.strokes = [];
					$( '#markmaker-instructions' ).fadeIn();
				},
				test: function() {
					var cfg = $.markTest.capture.cfg;
					var pointsPrior = cfg.strokes[0].length;
					// run simplify
					cfg.strokes[0] = mark.simplifyPath( cfg.strokes[0], 5 );
					// redraw
					cfg.drawingLayer.context.strokeStyle = 'rgba(255,0,255,0.9)';
					cfg.drawingLayer.context.fillStyle = 'rgba(255,0,255,0.2)';
					$.markTest.capture.fn.drawBasic( cfg.drawingLayer.context );
					$.markTest.capture.fn.drawCircles( cfg.drawingLayer.context );
					console.log( "Results: ", pointsPrior, " to ", cfg.strokes[0].length );
				},
				loop: function () {
					var cfg = $.markTest.capture.cfg;
					switch( cfg.state ) {
						case "drawing":
							$.markTest.capture.fn.drawLoop();
							break;
						case "preview":
							$.markTest.capture.fn.previewLoop();
							break;
					}
				},
				drawBasic: function ( g ) {
					var cfg = $.markTest.capture.cfg;
					for( var i = 0; i < cfg.strokes.length; i++ ) {
						if( cfg.strokes[i].length == 0 ) continue;
						var p1 = cfg.strokes[i][0];
						g.beginPath();
						g.moveTo( p1.x, p1.y );
						for( var j=1; j < cfg.strokes[i].length; j++ ) {
							var p = cfg.strokes[i][j];
							g.lineTo( p.x, p.y );
						}
						g.stroke();
					}
				},
				drawBrush: function ( g ) {
					var reduce = .2;
					var angle = 1.57079633;
					var cfg = $.markTest.capture.cfg;
					for( var i = 0; i < cfg.strokes.length; i++ ) {
						if( cfg.strokes[i].length == 0 ) continue;
						if( i > 0 ) {
							// connect to the last stroke
							g.strokeStyle = 'rgba(0,0,0,0.1)';
							g.lineWidth = 1;
							g.beginPath();
							var lastX = cfg.strokes[i-1][cfg.strokes[i-1].length - 1].x,
								lastY = cfg.strokes[i-1][cfg.strokes[i-1].length - 1].y,
								firstX = cfg.strokes[i][0].x,
								firstY = cfg.strokes[i][0].y;
							g.dashedLineTo( lastX, lastY, firstX, firstY, [6,4] );
							g.closePath();
							g.stroke();
						}
						g.lineWidth = 1;
						g.strokeStyle = '#000000';
						g.fillStyle = '#000000';
						var prevPX = 0,
							prevPY = 0,
							prevX = cfg.strokes[i][0].x,
							prevY = cfg.strokes[i][0].y ;
						for( var j=1; j < cfg.strokes[i].length; j++ ) {
							var p = cfg.strokes[i][j];
							var dx = ( p.x - prevX ) * reduce;
							var dy = ( p.y - prevY ) * reduce;
							var px = Math.cos(angle) * dx - Math.sin(angle) * dy;
							var py = Math.sin(angle) * dx + Math.cos(angle) * dy;
							g.beginPath();
							g.moveTo( prevX - prevPX - .5, prevY - prevPY - .5 );
							g.lineTo( prevX + prevPX - .5, prevY + prevPY - .5 );
							g.lineTo( p.x + px - .5, p.y + py - .5 );
							g.lineTo( p.x - px - .5, p.y - py - .5 );
							g.lineTo( prevX - prevPX - .5, prevY - prevPY - .5 );
							g.fill();
							g.stroke();
							prevPX = px;
							prevPY = py;
							prevX = p.x;
							prevY = p.y;
						}
					}
					
				},
				drawCircles: function ( g ) {
					var cfg = $.markTest.capture.cfg;
					for( var i = 0; i < cfg.strokes.length; i++ ) {
						if( cfg.strokes[i].length == 0 ) continue;
						var p1 = cfg.strokes[i][0];
						g.beginPath();
						for( var j=0; j < cfg.strokes[i].length; j++ ) {
							var p = cfg.strokes[i][j];
							g.beginPath();
							g.arc(p.x, p.y, 3, 0, Math.PI*2, true);
							g.closePath();
							g.fill();
							g.stroke();
							g.lineTo( p.x, p.y );
						}
					}
				},
				drawLoop: function() {
					var cfg = $.markTest.capture.cfg;
					cfg.guideLayer.clean();
					cfg.drawingLayer.clean();
					cfg.drawingLayer.context.strokeStyle = 'rgba(0,0,0,0.9)';
					cfg.drawingLayer.context.fillStyle = 'rgba(0,0,0,0.2)';
					$.markTest.capture.fn.drawBasic( cfg.drawingLayer.context );
					$.markTest.capture.fn.drawCircles( cfg.drawingLayer.context );
					// $.markTest.capture.fn.drawBrush( cfg.drawingLayer.context );
					
				},
				previewLoop: function () {
					var cfg = $.markTest.capture.cfg;
					cfg.guideLayer.clean();
					cfg.drawingLayer.clean();
					g = cfg.drawingLayer.context;
					g.strokeStyle = 'rgba(0,0,0,0.6)';
					g.miterLimit = 100;
					g.lineWidth = 1;
					g.lineCap = 'round';
					g.lineJoin = 'round';
					$.markTest.capture.fn.drawBrush( cfg.drawingLayer.context );
				}
			}
		}
	}; // $.markTest
	
	$( document ).ready( function () {
		$.markTest.global.fn.init( $( '#mark-test' ) );
		$.markTest.capture.fn.init();
	} ); //document ready
} )( jQuery );