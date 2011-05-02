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
						if( $( '#learn-more-target' ).position() ) {
							$( '#learn-more-link' )
								.css( {
									'top': $( '#learn-more-target' ).position().top - 5,
									'left': Math.ceil( $( '#learn-more-target' ).position().left ) + 4
								} );
						}
						modules.intro.fn.drawX( context );
						
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
				if( typeof marks === "undefined" || marks.length == 0 ) return;
				// set our layer's visiblity to 0
				$( lC.layerManager.layers['viz'].canvas ).css( 'opacity', 0 );
				// sort the marks randomly
				marks.sort( function( a, b ) { return ( Math.round( Math.random() ) - 0.5 ); } );
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
				if( ! lC.initialized ) return false;
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
				// if( ! lC.initialized ) return false;
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
				if( ! lC.initialized ) return false;
				// fade up the big X
				$( '#the-big-x' ).css( { 'opacity': 0, 'display': 'block' } );
				modules.intro.fn.drawX( context );
				$( '#the-big-x' )
					.animate( { 'opacity': 1 }, 'slow' );
				// start drawing the translated mark after 2 seconds delay
				if( lC.curLocaleMark ) {
					var now = ( new Date() ).getTime() + 2000;
					lC.textScene.timers[lC.curLocaleMark.reference] = { 'start': now, 'end': now + lC.curLocaleMark.maxTime, 'speed': 2 };
				} else {
					lC.animationComplete = true;
				}
			},
			// fallback function that doesn't bother with anything but the DOM elements
			simpleIntro: function ( context ) {
				var lC = context.modules.intro;
				if( ! lC.initialized ) return false;
				$( '#markmaker' )
				.width( 0 )
				.show()
				.animate( { 'width': context.width }, 'slow', function () {
					$( '#intro-main-copy' ).fadeIn( 'slow' );
					$( '#the-big-x' ).css( { 'opacity': 0, 'display': 'block' } );
					modules.intro.fn.drawX( context );
					$( '#the-big-x' )
						.animate( { 'opacity': 1 }, 'slow' );
					$( '#click-anywhere' ).delay( 200 ).fadeIn( 'slow' );
					$( '#browse-marks' ).delay( 100 ).fadeIn( 'slow' );
					lC.animationComplete = true;
				} );
			},
			drawX: function( context ) {
				var xHeight = context.height + ( context.height / 5 );
				var xWidth = xHeight * 1.545;
				$( '#the-big-x' )
					.css( {
						'left': ( context.width / 2 ) - xWidth + ( ( xHeight - 400 ) ) 
					} );
				var x = $( '#the-big-x' ).get( 0 );
				x.width = xWidth;
				x.height = xHeight;
				canvg( 'the-big-x', '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMinYMin meet" width="100%" height="100%" viewBox="0 0 1224 792" enable-background="new 0 0 1224 792" xml:space="preserve"> \
				<g id="Layer_1" display="none"> \
					<path display="inline" fill-rule="evenodd" clip-rule="evenodd" d="M816-97c87.916-2.688,37.294,85.749,13,117                       \
						c-30.264,38.931-96.577,79.788-116,103s-27.335,32.668-41,49c-26.93,35.01-57.494,67.122-84,103                                    \
						c-16.653,22.542-34.166,44.127-50,68c-3.897,5.876-17.228,19.424-14,25c11.202,35.223,38.947,68.553,59,97                          \
						c58.998,83.695,129.565,155.93,224,204c26.559,13.52,62.671,26.923,93,34c15.449,3.605,38.232-2.668,50,5                           \
						c21.894,14.268,14.497,65.961,2,85c-33.953,51.726-136.456,26.34-183,4c-85.947-41.252-169.389-100.814-226-172                     \
						c-23.331-29.997-46.669-60.003-70-90c-8.666-13.332-17.334-26.668-26-40c-0.333,0-0.667,0-1,0c-18.332,39.996-36.668,80.004-55,120  \
						c-21.665,62.994-43.335,126.006-65,189c-12.244,31.37-21.457,80.739-55,90c0-1.666,0-3.334,0-5c11.7-32.594,3.705-84.403-2-118      \
						c-5.036-29.658,7.337-78.166,13-104c15.908-72.573,32.813-143.122,58-207c8.666-20.665,17.334-41.335,26-62                         \
						c6-11.666,12-23.334,18-35c-3.667-9.666-7.333-19.334-11-29c-7.333-27.331-14.667-54.669-22-82                                     \
						c-16.045-62.063-23.672-125.848-42-185c-9.999-32.664-20.001-65.336-30-98c-8.999-20.998-18.001-42.002-27-63                       \
						c76.779,39.103,141.216,144.713,177,226c11.999,31.997,24.001,64.003,36,96c0.667-0.333,1.333-0.667,2-1                            \
						c10.472-36.963,46.599-63.172,68-91c45.154-58.712,91.206-113.961,149-160c19.042-15.169,33.894-35.797,55-49                       \
						C759.742-85.975,794.035-83.943,816-97z"/>                                                                                       \
				</g> \
				<g id="Layer_2"> \                                                                                                                  \
					<path fill-rule="evenodd" clip-rule="evenodd" d="M405,475c64.012,118.065,139.136,215.681,253,284                                  \
						c27.768,16.66,57.316,30.021,93,42c11.072,3.717,22.793,9.136,33,11c15.808,2.887,31.178-1.219,45,4                                \
						c21.542,8.133,21.188,50.264,12,74c-26.283,67.896-140.593,38.474-192,14c-141.305-67.271-239.556-176.736-319-300                  \
						c-31.881,61.434-60.74,130.734-85,203c-11.82,35.209-23.604,73.089-36,108c-11.828,33.311-22.438,72.428-55,88                      \
						c5.99-41.384-1.896-86.741-2-128c-0.095-37.508,8.334-77.391,16-114c22.08-105.453,55.84-206.441,99-289                            \
						c-50.08-146.25-67.506-325.168-132-457c56.225,32.41,95.12,83.81,129,138c34.193,54.692,63.43,116.188,83,184                       \
						c6.874-6.477,46.569-63.042,63-83c44.561-54.126,83.771-106.884,138-154c12.407-10.78,57.147-49.181,71.33-57.065                   \
						C637.768,32.686,673.176,15.46,697,13c20.811-2.149,50.657,5.325,53,25c1.636,13.746-15.679,56.016-22,67                           \
						c-19.771,34.351-53.602,61.791-86,88c-31.717,25.657-60.83,54.083-87,86C500.166,345.875,449.848,406.562,405,475z"/>               \
				</g> \
				</svg>' );
			}
		}
	};
}( jQuery ) );