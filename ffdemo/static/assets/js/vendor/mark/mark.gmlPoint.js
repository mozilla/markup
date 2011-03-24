var Mark = ( function ( mark ) { 
	mark.gmlPoint = function( x, y, time, speed, z ) {
		this.x = x; 
		this.y = y;
		this.z = typeof z == "integer" ? z : 0;
		this.time = time;
		this.speed = speed; 
		this.angle = 0; 
		this.significance = 1; // 1-5 value for how significant this point is -- useful for easign the complexity of lines that are far from the camera
		 
		// returns the distance between this and another point
		this.distanceToPoint = function( point ) {
			return Math.sqrt( Math.pow( (point.x - this.x ), 2 ) + Math.pow( (point.y - this.y ), 2 ) );
		};
		
		// returns a speed between this point and a point in the future
		this.speedToPoint = function( point ) {
			var dp = this.distanceToPoint( point );
			var dt = point.time - this.time;
			return dp / dt;
		};
		
		// ensures this point's speed is not changing substantially faster than it should
		// allowance is a per unit distance change
		this.smoothAgainst = function( point, allowance ) {
			var d = this.distanceToPoint( point );
			var a = allowance * d;
			if ( Math.abs( this.speed - point.speed ) > a ) {
				this.speed = this.speed > point.speed ? point.speed + a : point.speed - a;
			} 
		};
		
		// considers a prior point and sets this point's angle accordingly
		// ensures that the angle is a radian value between 0 and 2 * PI
		this.setAngleFromPoint = function ( point ) {
			this.angle = Math.atan2( point.y - this.y, point.x - this.x ) + ( Math.PI / 2 );
			this.angle = this.angle % ( 2 * Math.PI );
			if( this.angle < 0 ) this.angle = ( 2 * Math.PI ) + this.angle; 
		};
		
		// returns a basic copy of this point
		this.clone = function ()  {
			return { x: this.x, y: this.y, z: this.z, time: this.time, significance: this.significance, angle: this.angle, speed: this.speed };
		};
		
		// returns a copy of this point translated by x, y
		this.getTranslatedPoint = function ( x, y ) {
			var point = this.clone();
			point.x += x;
			point.y += y;
			return point;
		};
		
	};
	return mark; 
}( Mark || {} ) );
