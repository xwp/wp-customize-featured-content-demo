/* global wp */
/* eslint consistent-this: [ "error", "partial" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.selectiveRefresh.partialConstructor.featured_item = (function( api, $ ) {
	'use strict';

	/**
	 * A partial for managing a featured item.
	 *
	 * @class
	 * @augments wp.customize.Section
	 * @augments wp.customize.Class
	 */
	return api.selectiveRefresh.Partial.extend({

		/**
		 * Constructor.
		 *
		 * @param {string} id - Partial ID.
		 * @param {Object} options - Options.
		 */
		initialize: function( id, options ) {
			var partial = this;
			api.selectiveRefresh.Partial.prototype.initialize.call( partial, id, options );
		},

		/**
		 * Refresh partial.
		 *
		 * @todo Keep track of the previous value so we know whether or not to do a full refresh or just change the position?
		 *
		 * @inheritDoc
		 */
		refresh: function refresh() {
			var partial = this, setting;

			setting = api( _.first( partial.settings() ) );

			_.each( partial.placements(), function( placement ) {
				var sortedItemContainers, itemsContainer;

				// Handle deletion.
				if ( false === setting.get() ) {
					placement.remove();
					return;
				}

				itemsContainer = placement.container.parent();
				placement.container.data( 'position', setting.get().position );

				sortedItemContainers = itemsContainer.children().get().sort( function( a, b ) {
					return parseInt( $( a ).data( 'position' ), 10 ) - parseInt( $( b ).data( 'position' ), 10 );
				} );

				_.each( sortedItemContainers, function( itemContainer ) {
					itemsContainer.append( itemContainer );
				} );
			} );

			return api.selectiveRefresh.Partial.prototype.refresh.call( partial );
		}
	});

})( wp.customize, jQuery );
