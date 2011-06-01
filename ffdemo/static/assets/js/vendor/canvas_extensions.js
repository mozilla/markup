if( typeof CanvasRenderingContext2D !== "undefined"  ) {
	CanvasRenderingContext2D.prototype.dashedLineTo = function( fromX, fromY, toX, toY, pattern ) {
		// Our growth rate for our line can be one of the following:
		//	 (+,+), (+,-), (-,+), (-,-)
		// Because of this, our algorithm needs to understand if the x-coord and
		// y-coord should be getting smaller or larger and properly cap the values
		// based on (x,y).
		var lt = function ( a, b ) { return a <= b; };
		var gt = function ( a, b ) { return a >= b; };
		var capmin = function ( a, b ) { return Math.min( a, b ); };
		var capmax = function ( a, b ) { return Math.max( a, b ); };

		// if ( typeof(pattern) != "Array" ) pattern = [pattern];
		var checkX = { thereYet: gt, cap: capmin };
		var checkY = { thereYet: gt, cap: capmin };

		if ( fromY - toY > 0 ) {
			checkY.thereYet = lt;
			checkY.cap = capmax;
		}
		if ( fromX - toX > 0 ) {
			checkX.thereYet = lt;
			checkX.cap = capmax;
		}

		this.moveTo( fromX, fromY );
		var offsetX = fromX;
		var offsetY = fromY;
		var idx = 0, dash = true;
		while ( !( checkX.thereYet( offsetX, toX ) && checkY.thereYet( offsetY, toY ) ) ) {
			var ang = Math.atan2( toY - fromY, toX - fromX );
			var len = pattern[idx];

			offsetX = checkX.cap( toX, offsetX + (Math.cos( ang ) * len ) );
			offsetY = checkY.cap( toY, offsetY + (Math.sin( ang ) * len ) );

			if ( dash ) this.lineTo( offsetX, offsetY );
			else this.moveTo( offsetX, offsetY );

			idx = ( idx + 1 ) % pattern.length;
			dash = !dash;
		}
	};
	CanvasRenderingContext2D.prototype.dottedArc = function( x, y, radius, startAngle, endAngle, anticlockwise ) {
		var g = Math.PI / radius / 2, sa = startAngle, ea = startAngle + g;
		while( ea < endAngle ) {
			this.beginPath();
			this.arc( x, y, radius, sa, ea, anticlockwise );
			this.stroke();
			sa = ea + g;
			ea = sa + g;
		}
	};
}