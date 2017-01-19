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

			api( id + '[position]', function( positionSetting ) {
				positionSetting.bind( function() {
					partial.repositionPlacements();
				} );
			} );
		},

		/**
		 * Return whether the setting is related to the partial.
		 *
		 * @inheritDoc
		 *
		 * @param {wp.customize.Value|string} setting  ID or object for setting.
		 * @param {object} newValue New value.
		 * @param {object} oldValue Old value.
		 * @return {boolean} Whether the setting is related to the partial.
		 */
		isRelatedSetting: function isRelatedSetting( setting, newValue, oldValue ) {
			var partial = this, settingId;

			// Prevent selective refresh in response to position changes since we handle them in separately and purely in DOM.
			settingId = _.isString( setting ) ? setting : setting.id;
			if ( settingId === partial.id + '[position]' ) {
				return false;
			}

			return api.selectiveRefresh.Partial.prototype.isRelatedSetting.call( partial, setting, newValue, oldValue );
		},

		/**
		 * Reposition placements in response to position changes.
		 *
		 * @returns {void}
		 */
		repositionPlacements: function repositionPlacements() {
			var partial = this, positionSetting;
			positionSetting = api( partial.id + '[position]' );
			_.each( partial.placements(), function( placement ) {
				var sortedItemContainers, itemsContainer;
				itemsContainer = placement.container.parent();
				placement.container.data( 'position', positionSetting.get() );

				sortedItemContainers = itemsContainer.children().get().sort( function( a, b ) {
					var positionA, positionB;
					positionA = parseInt( $( a ).data( 'position' ), 10 );
					positionB = parseInt( $( b ).data( 'position' ), 10 );
					return positionA - positionB;
				} );

				_.each( sortedItemContainers, function( itemContainer ) {
					itemsContainer.append( itemContainer );
				} );
			} );
		}
	});

})( wp.customize, jQuery );
