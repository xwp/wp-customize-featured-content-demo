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
		 * Return whether the setting is related to the partial.
		 *
		 * @todo It is somewhat disingenuous to assume that calling this method will always be proceeded by refresh.
		 *
		 * @param {wp.customize.Value|string} setting  ID or object for setting.
		 * @param {object} newValue New value.
		 * @param {object} oldValue Old value.
		 * @return {boolean} Whether the setting is related to the partial.
		 */
		isRelatedSetting: function isRelatedSetting( setting, newValue, oldValue ) {
			var partial = this, isRelated, newValueComp, oldValueComp;
			isRelated = api.selectiveRefresh.Partial.prototype.isRelatedSetting.call( partial, setting, newValue, oldValue );
			if ( isRelated && newValue && oldValue ) {
				newValueComp = _.extend( {}, newValue, { position: null } );
				oldValueComp = _.extend( {}, oldValue, { position: null } );
				partial.positionChanged = newValue.position !== oldValue.position;
				partial.onlyPositionChanged = _.isEqual( newValueComp, oldValueComp ) && partial.positionChanged;
			}
			return isRelated;
		},

		/**
		 * Refresh partial.
		 *
		 * @inheritDoc
		 */
		refresh: function refresh() {
			var partial = this, setting;

			setting = api( _.first( partial.settings() ) );


			// Handle deletion.
			if ( false === setting.get() ) {
				_.each( partial.placements(), function( placement ) {
					placement.remove();
				} );
				return $.Deferred().resolve().promise();
			}

			// Re-sorts.
			if ( partial.positionChanged ) {
				_.each( partial.placements(), function( placement ) {
					var sortedItemContainers, itemsContainer;
					itemsContainer = placement.container.parent();
					placement.container.data( 'position', setting.get().position );

					sortedItemContainers = itemsContainer.children().get().sort( function( a, b ) {
						return parseInt( $( a ).data( 'position' ), 10 ) - parseInt( $( b ).data( 'position' ), 10 );
					} );

					_.each( sortedItemContainers, function( itemContainer ) {
						itemsContainer.append( itemContainer );
					} );
				} );
			}

			if ( partial.onlyPositionChanged ) {
				return $.Deferred().resolve().promise();
			}

			return api.selectiveRefresh.Partial.prototype.refresh.call( partial );
		}
	});

})( wp.customize, jQuery );
