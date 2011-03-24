var Mark = ( function ( mark ) { 
	
	mark.layer = function( manager, name ) {
	
		this.canvas = null; 
		this.context = null;
		this.dirtyRectangles = [];
		this.layerName = name;
		this.manager = manager;
	
		this.clean = function() {
			if( this.dirtyRectangles.length == 0 ) {
				// if theres no dirtyRectangles, clear the whole thing (probably not the best default)
				this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
			} else {
				// loop through dirty rectangles, and run clearRect on each
				for( var i = 0; i< this.dirtyRectangles.length; i++ ) {
					var rect = this.dirtyRectangles[i];
					this.context.clearRect( i.x, i.y, i.w, i.h );
				}
			}
		};
	
		this.setSize = function( w, h ) {
			if( this.canvas.width != w ) this.canvas.width = w;
			if( this.canvas.height != h ) this.canvas.height = h;
		};
	
		this.init = function () {
			this.canvas = document.createElement( 'canvas' );
			this.context = this.canvas.getContext( '2d' );
			this.setSize( this.manager.container.scrollWidth, this.manager.container.scrollHeight );
			this.manager.layerWrapper.appendChild( this.canvas );
		};
	
		this.remove = function ()  {
			this.manager.layerWrapper.removeChild( this.canvas );
		};
	
		this.init();
	};
	
	return mark;
	
}( Mark || {} ) );