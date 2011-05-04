( function( $ ) {
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
	
	function isValidEmailAddress(emailAddress) {
		var pattern = new RegExp( /^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i );
		return pattern.test(emailAddress);
	};
	// validate email addresses on form submit
	$( '#newsletter-form' ).submit( function( e ) {
		$( '.field-with-errors' )
			.removeClass( 'field-with-errors' );
                if ($( '#id_optin' ).attr('checked') === false) {
			e.preventDefault();
                        /* checkbox, let's make the label have error style instaed */
			$( '#id_optin' ).parent().parent()
				.addClass( 'field-with-errors' );
			return false;
                } else {
		    if( isValidEmailAddress( $( '#id_email' ).val() )) {
		    	return true;
  		    } else {
			e.preventDefault();
			$( '#id_email' )
				.addClass( 'field-with-errors' );
			return false;
		   }
                }
	} );
	//Page load, check for errors
        if (window.MarkupOptinError) {
           $('#id_optin').addClass( 'field-with-errors' );
        }
        if (window.MarkupEmailError) {
           $('#id_email').addClass( 'field-with-errors' );
        }

	//	Try binding click event to locale here
	$("#current-locale").click(function ()
	{
		$( this ).parent().find("ul").toggle();
		$( this ).toggleClass("selected");
		return false;
	});
	
} );
} )( jQuery );