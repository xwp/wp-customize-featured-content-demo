/* global JSON */
jQuery( function( $ ) {
	wp.api.init().done( function() {

		var FeaturedItems = wp.api.collections['Featured-items'];
		var FeaturedItem = wp.api.models['Featured-items'];

		/**
		 * Get related post.
		 *
		 * @this {wp.api.WPApiBaseModel}
		 * @return {Deferred.promise}
		 */
		FeaturedItem.prototype.getRelatedPost = function getRelatedPost() {
			return wp.api.utils._buildModelGetter(
				this,
				this.get( 'related' ),
				'Post',
				'related',
				'title'
			);
		};

		$( '.featured-content-items' ).each( function() {
			var itemsData, items, promises = [], itemDependencyData = {};

			itemsData = JSON.parse( $( this ).find( '> script' ).text() );
			items = new FeaturedItems( itemsData );
			items.each( function( item ) {
				var relatedPostPromise = $.Deferred(), featuredMediaPromise = $.Deferred();
				itemDependencyData[ item.id ] = {
					featuredMedia: null,
					relatedPost: null
				};
				promises.push( featuredMediaPromise );
				promises.push( relatedPostPromise );

				// Get the featured media of the item itself.
				if ( item.get( 'featured_media' ) ) {
					item.getFeaturedMedia().always( function( featuredMedia ) {
						itemDependencyData[ item.id ].featuredMedia = featuredMedia || null;
						featuredMediaPromise.resolve();
					} );
				}

				if ( item.get( 'related' ) ) {
					item.getRelatedPost().always( function( post ) {

						// Get the featured media of the related post, if the item doesn't have featured media itself.
						if ( post && ! item.get( 'featured_media' ) ) {
							post.getFeaturedMedia().always( function( featuredMedia ) {
								itemDependencyData[ item.id ].featuredMedia = featuredMedia || null;
								featuredMediaPromise.resolve();
							} );
						}

						itemDependencyData[ item.id ].relatedPost = post || null;
						relatedPostPromise.resolve();
					} );
				} else {
					relatedPostPromise.resolve();
				}
			} );

			$.when.apply( $, promises ).done( function() {
				var renderedItems = {};
				items.each( function( item ) {
					var renderedItem = {
						title: item.get( 'title' ).rendered,
						image: itemDependencyData[ item.id ].featuredMedia,
						url: item.get( 'url' )
					};
					if ( itemDependencyData[ item.id ].relatedPost ) {
						if ( ! renderedItem.title ) {
							renderedItem.title = itemDependencyData[ item.id ].relatedPost.get( 'title' ).rendered;
						}
						if ( ! renderedItem.url ) {
							renderedItem.url = itemDependencyData[ item.id ].relatedPost.get( 'link' );
						}
					}
					renderedItems[ item.id ] = renderedItem;
				} );

				console.info( renderedItems ); // @todo Now this can be fed directly into a template for rendering.
			} );
		} );

	} );
} );