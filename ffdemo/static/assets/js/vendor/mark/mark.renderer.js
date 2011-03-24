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
