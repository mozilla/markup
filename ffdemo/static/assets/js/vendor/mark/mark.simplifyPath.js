var Mark = ( function ( mark ) { 
	mark.simplification = {
		// helper function
		Line: function( p1, p2 ) {
			this.p1 = p1;
			this.p2 = p2;
			this.distanceToPoint = function( point ) {
				// slope
				var m = ( this.p2.y - this.p1.y ) / ( this.p2.x - this.p1.x );
				// y offset
				var b = this.p1.y - ( m * this.p1.x );
				var d = [];
				// distance to the linear equation
				d.push( Math.abs( point.y - ( m * point.x ) - b ) / Math.sqrt( Math.pow( m, 2 ) + 1 ) )
				// distance to p1
				d.push( Math.sqrt( Math.pow( ( point.x - this.p1.x ), 2 ) + Math.pow( ( point.y - this.p1.y ), 2 ) ) )
				// distance to p2
				d.push( Math.sqrt( Math.pow( ( point.x - this.p2.x ), 2 ) + Math.pow( ( point.y - this.p2.y ), 2 ) ) );
				// return the smallest distance
				return d.sort( function( a, b ) {
					return ( a - b ) //causes an array to be sorted numerically and ascending
				} )[0];
			}
		},
		// main simplification algorithm
		douglasPeucker: function( points, tolerance ) {
			var returnPoints = [];
			if ( points.length <= 2 ) {
				return [points[0]];
			}
			// make line from start to end 
			var line = new mark.simplification.Line( points[0], points[points.length - 1] );
			// find the largest distance from intermediate poitns to this line
			var maxDistance = 0;
			var maxDistanceIndex = 0;
			for( var i = 1; i <= points.length - 2; i++ ) {
				var distance = line.distanceToPoint( points[ i ] );
				if( distance > maxDistance ) {
					maxDistance = distance;
					maxDistanceIndex = i;
				}
			}
			// check if the max distance is greater than our tollerance allows 
			if ( maxDistance >= tolerance ) {
				var p = points[maxDistanceIndex];
				line.distanceToPoint( p, true );
				// include this point in the output 
				returnPoints = returnPoints.concat( mark.simplification.douglasPeucker( points.slice( 0, maxDistanceIndex + 1 ), tolerance ) );
				// returnPoints.push( points[maxDistanceIndex] );
				returnPoints = returnPoints.concat( mark.simplification.douglasPeucker( points.slice( maxDistanceIndex, points.length ), tolerance ) );
			} else {
				// ditching this point
				var p = points[maxDistanceIndex];
				line.distanceToPoint( p, true );
				returnPoints = [points[0]];
			}
			return returnPoints;
		},
		// returns a simplified version of a stroke based on the passed tolerance
		simplifyPath: function( points, tolerance ) {
			var simpPoints = [];
			// always retain the first point
			simpPoints.push( points.shift() );
			simpPoints = simpPoints.concat( mark.simplification.douglasPeucker( points, tolerance ) );
			// and always retain the last two points
			simpPoints.push( points[points.length - 2] );
			simpPoints.push( points[points.length - 1] );
			return simpPoints;
		},
		// weights a stroke based on the passed tolerances 
		weightPath: function( points, tolerances ) {
			var maxSignificance = tolerances.length + 1;
			var tmpPoints = points;
			while( tolerance = tolerances.shift() ) {
				// limit the points array by the current tolerance
				tmpPoints = mark.simplification.douglasPeucker( tmpPoints, tolerance );
				// increment the significance of all points that pass the simplfification
				for( var i = 0; i < tmpPoints.length; i++ ) {
					tmpPoints[i].significance++;
				}
			}
			// maker sure the beginning and end of all strokes get the hightest significance
			points[0].significance = maxSignificance;
			points[points.length - 1].significance = maxSignificance;
			return points;
		}
	};
	
	return mark;
}( Mark || {} ) );