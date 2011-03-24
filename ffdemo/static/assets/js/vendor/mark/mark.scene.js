var Mark = ( function ( mark ) { 
	
	mark.scene = function ( ) {
	
		this.camera = new Mark.camera();
		this.objects = [];
		this.canvasContext = null;
		this.timers = {};
		
		this.init = function ( ) {
			
		};
		
		this.addObject = function ( object ) {
			this.objects.push( object );
		};
		
		this.removeObject = function ( index ) {
			this.objects.splice( index, 1 );
		};
		
		this.update = function ( ) {
			var now = ( new Date() ).getTime();
			for( mark in this.timers ) {
				if( this.timers[mark].end < now ) {
					delete this.timers[mark];
				} 
			}
		};
		
		this.init();
		
	};
	
	return mark;
	
}( Mark || {} ) );