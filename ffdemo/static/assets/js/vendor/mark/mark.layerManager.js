var Mark = ( function ( mark ) { 
	mark.layerManager = function( container ) {
	
		this.container = container; 
		this.layerWrapper = null;
		this.layers = {};
	
		this.init = function () { 
			// attach a new div for our layers to reside in 
			this.layerWrapper = document.createElement( 'div' );
			this.layerWrapper.className = 'mark-layerManager';
			this.container.appendChild( this.layerWrapper );
		};
	
		// add a layer to our container
		this.addLayer = function( name ) {
			var layer = new mark.layer( this, name );
			this.layers[name] = layer;
			return layer;
		};
		
		// remove all layers from our container 
		this.removeAll = function () {
			for( var layer in this.layers ) {
				this.layers[layer].remove();
				delete this.layers[layer];
			}
		};
		
		// resize all layers to the passed width and height
		this.resizeAll = function( w, h ) {
			for( var layer in this.layers ) {
				if( this.layers[layer].autoResize )
					this.layers[layer].setSize( w, h );
			}
		};
		
		this.init();
	
	};
	
	return mark;
	
}( Mark || {} ) );