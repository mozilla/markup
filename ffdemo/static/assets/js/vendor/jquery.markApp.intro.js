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