var Mark = ( function ( mark ) { 
	
	// Basic classes for use throughout Mark
	
	mark.vector = function ( x, y, z ) {
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}
	
	return mark;
	
}( Mark || {} ) );