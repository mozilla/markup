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
