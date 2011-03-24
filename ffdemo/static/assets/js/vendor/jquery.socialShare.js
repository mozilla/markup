/*
 * A generic plugin to assist with those pesky social media buttons.
 * 
 * Actually, you know what? This is more basic than that. It just opens up a new window with the dimensions you specify
 * and the URL you specify, with the GET params you specify.
 * 
 * That just happens to be the basic functionality you need to impliment a twitter or facebook share button. 
 * 
 * EXAMPLE:
 * $( '#twitter-share' ).socialShare( { 
 *   'share_url': 'http://twitter.com/share', 
 *   'share_params': { 'text': 'Wow. I love this website. Check. It. Out', 'url': 'http://thegreatestwebsiteever.com/' }
 *   } );
 *
 * USEFUL FACEBOOK INFO: 
 * - url: http://www.facebook.com/sharer.php
 * - required params: 
 *		- u: the url you want to share
 *		- t: the title of the link you want to share
 *
 * USEFUL TWITTER INFO: 
 * - url: http://twitter.com/share
 * - params:
 *		- url: the url you want to share
 *		- text: the message you want to tweet with this url
 *		- via: your twitter account, w/o the @, if you want attributed
 *		- related: a related account. Can also format it with a title like 'adammiller: People who dislike social media buttons'
 * 
*/
( function( $ ) {
	
	$.socialShare = {
		cfg: {
			'$link': null,
			'share_url': 'http://twitter.com/share',
			'share_title': 'Share on Twitter',
			'share_params': {},
			'popupWidth': 550,
			'popupHeight': 450
		},
		fn: {
			'init': function ( container, options ) {
				var $this = $( container );
				var context = $.extend( {}, $.socialShare.cfg, options );
				
				context.$link = $this;
				
				context.$link.bind( 'click', function( e ) {
					e.preventDefault();
					$.socialShare.fn.share( context );
				} );
				
				$this.data( 'socialShare-context', context );
			},
			'shareURL': function ( context ){
				var params = [];
				for( param in context.share_params ) {
					params.push( param + '=' + encodeURIComponent( context.share_params[param] ) );
				}
				return context.share_url + '?' + params.join( "&" );
			},
			'share': function ( context ) {
				// open the pop up
				window.open(
					$.socialShare.fn.shareURL( context ),
					context.share_title,
					'height=' + context.popupHeight + ',width=' + context.popupWidth
				);
			}
		}
	};
	
	$.fn.socialShare = function( options ) {
		return $( this ).each( function () {
			$.socialShare.fn.init( this, options );
		} );
	};
	
} )( jQuery );
