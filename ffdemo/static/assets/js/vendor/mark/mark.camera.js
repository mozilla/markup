var Mark = ( function ( mark ) { 
	
	// This is currently very rudimentry
	// no projection math happening, just some offsets to consult when rendering marks
	
	mark.camera = function ( ) {
	
		this.position = new mark.vector( 0, 0 ,-1000 );
		
	};
	
	return mark;
	
}( Mark || {} ) );