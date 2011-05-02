$( document ).ready( function () {
	
	$( "#community" ).hover( function () {
		$( "#coming-soon-tip" ).toggle();
	} );
	
	// Query for countries if newsletter
	if ( $( "#newsletter-countries" ).length > 0 ) {
		$.ajax( {
			'url': '/media/assets/js/vendor/country_codes.json',
			'dataType': 'JSON',
			'success': function ( data ) {
				for( var i = 0; i < data.length; i++ ) {
					var $select = $( '#newsletter-countries' );
					var $option = $( '<option />' )
						.val( data[i].code )
						.text( data[i].name );
					$select.append( $option );
				}
			},
			'error': function () {
				// handle error loading countries
			}
		} );
	}
	
	//	Try binding click event to locale here
	$("#current-locale").click(function ()
	{
		$( this ).parent().find("ul").toggle();
		$( this ).toggleClass("selected");
		return false;
	});
	
} );

