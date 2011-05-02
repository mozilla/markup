var Mark = ( function ( mark ) { 
	mark.gmlMark = function( strokes, reference, country_code, time, rtl, id, is_approved, ip_address ) {
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
        this.ip_address = ip_address;
		this.contributor_name = null;
		this.extra_info = null;
		this.contributor_url = null;
		
		// colors for this mark
		this.color = '0,0,0';
		
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
				if ( p.x < firstPoint.x ) firstPoint = p;
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
		};
		
		// If reverse is true, we position relative to the start of the mark
		// if it's false, or ommitted, we position relative to the end of the mark
		this.positionRelativeTo = function ( mark, reverse ) {
			var reverse = reverse ? !!reverse : false;
			var buffer = 50;
			if ( reverse ) {
				this.position.x = mark.position.x - buffer - this.bWidth;
				this.position.y = mark.position.y + mark.leftmostStrokeStart().y - this.rightmostStrokeEnd().y;
				// this is based on a static computation in mark.renderer
				// if you change it there, change it here
				this.position.z =  mark.position.z - ( this.maxTime / 50 );
			} else {
				this.position.x = mark.position.x + mark.bWidth + this.leftmostStrokeStart().x + buffer;
				this.position.y = mark.position.y + mark.rightmostStrokeEnd().y - this.leftmostStrokeStart().y;
				// this is based on a static computation in mark.renderer
				// if you change it there, change it here
				this.position.z =  mark.position.z + ( mark.maxTime / 50 );
			}
		};
		
		this.positionToStart = function () {
			this.position.x = 0;
			this.position.y = 0;
			this.position.z =  0;
		};
		
		
		this.init();
		
	};
	return mark; 
}( Mark || {} ) );
