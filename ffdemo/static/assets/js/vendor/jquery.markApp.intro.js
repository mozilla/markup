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
			},
			loop: function ( context, e ) {
				var lC = context.modules.intro;
				if( ! lC.animationComplete ) {
					// update the position of the camera and draw the viz preview
					TWEEN.update();
					lC.layerManager.layers['viz'].clean();
					Mark.renderer.renderScene( lC.vizScene, { width: context.width, height: context.height } );
					if( lC.curLocaleMark ) {
						lC.layerManager.layers['mainMark'].clean();
						var scale = 500 / lC.curLocaleMark.bWidth;
						Mark.renderer.renderMark( 
							lC.layerManager.layers['mainMark'].context, 
							lC.curLocaleMark, 
							{ offset: {x: (context.width / 2) - 115, y: context.height - 240 }, 
								scale: {x: scale, y: scale, thickness: scale},
								color: '255,84,0',
								timer: lC.textScene.timers[lC.curLocaleMark.reference] } );
						// check if the animation is completed
						if( lC.curLocaleMark.reference in lC.textScene.timers ) {
							var now = ( new Date() ).getTime();
							if( lC.textScene.timers[lC.curLocaleMark.reference].end < now ) {
								lC.animationComplete = true;
								delete lC.textScene.timers[lC.curLocaleMark.reference];
							}
						}
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
				 * If any part of this fails, we revert to a simple intro where our intro content is faded in.
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
						var rAnchor = ( w / 2 ) + Math.min( 500, ( w / 2 - 20 )  );
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
						// set big x position according to our aspect ratio and how much off screen space is needed
						xHeight = h + ( h / 5 );
						xWidth = xHeight * 1.545;
						$( '#the-big-x' )
							.css( {
								'top': -( h / 5 ),
								'bottom': -( h / 5 ),
								'left': ( w / 2 ) - xWidth + ( ( xHeight - 500 ) ) 
							} );
					} )
					.trigger( 'resize.markApp', [context.width, context.height] )
					.width( 0 )
					.height( context.height );
			},
			loadMarks: function( context ) {
				context.fn.showLoader( context.fn.getString( 'loading-intro-msg' ), 'overlay-light' );
				return $.ajax( {
						url: '/requests/get_translated_marks',
						dataType: 'JSON'
					} )
					.success( function ( data ) {
						modules.intro.fn.setupMarks( context, data.marks );
						context.fn.hideLoader();
					} )
					.error( function ( data ) {
						context.fn.hideLoader();
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
				// add the cursor tooltip, after a delay
				setTimeout( function() {
					context.$cursorTooltip = $( '#cursor-tooltip' )
						.find( 'p' )
							.text( context.fn.getString( 'cursor-tooltip-intro-msg' ) )
							.end()
						// move it off screen, in case it fades in before a mousemoveevent has fired
						.css( { 'top': -400 } )
						.fadeIn( 'fast' );
				}, 3000 );
				
			},
			startMarkAnimations: function ( context ) {
				var lC = context.modules.intro;
				// fade up the big X
				$( '#the-big-x' )
					.fadeIn( 'slow' );
				// start drawing the translated mark after 2 seconds delay
				if( lC.curLocaleMark ) {
					var now = ( new Date() ).getTime() + 2000;
					lC.textScene.timers[lC.curLocaleMark.reference] = { 'start': now, 'end': now + lC.curLocaleMark.maxTime, 'speed': 2 };
				}
			},
			// fallback function that doesn't bother with anything but the DOM elements
			simpleIntro: function ( context ) {
				var lC = context.modules.intro;
				$( '#markmaker' )
				.width( 0 )
				.show()
				.animate( { 'width': context.width }, 'slow', function () {
					$( '#intro-main-copy' ).fadeIn( 'slow' );
					$( '#the-big-x' ).fadeIn( 'slow' );
					$( '#click-anywhere' ).delay( 200 ).fadeIn( 'slow' );
					$( '#browse-marks' ).delay( 100 ).fadeIn( 'slow' );
					lC.animationComplete = true;
				} );
			}
		}
	};
}( jQuery ) );