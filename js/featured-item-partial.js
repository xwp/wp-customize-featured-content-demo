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
		 * List of property names for computing the IDs for related featured_item_property settings.
		 *
		 * The array's contents are populated in PHP via `\Customize_Featured_Content_Demo\Customizer::enqueue_preview_dependencies()`.
		 *
		 * @var {string[]}
		 */
		settingProperties: [],

		/**
		 * Constructor.
		 *
		 * @param {string} id - Partial ID.
		 * @param {Object} options - Options.
		 */
		initialize: function( id, options ) {
			var partial = this;
			api.selectiveRefresh.Partial.prototype.initialize.call( partial, id, options );

			partial.params.containerInclusive = true;
			partial.params.fallbackRefresh = false;
			partial.params.settings = _.map( partial.settingProperties, function( propertyName ) {
				return partial.id + '[' + propertyName + ']';
			} );

			/*
			 * Use pure JS to update partial instead of selective refresh server request.
			 * Since a partial is constrained to the item itself an update the the
			 * position setting wouldn't have any effect on the placement in the page.
			 * So any updates to the position setting are excluded from causing
			 * refresh requests in the isRelatedSetting subclassed method.
			 */
			api( id + '[position]', function( positionSetting ) {
				positionSetting.bind( function() {
					partial.repositionPlacements();
				} );
			} );

			/*
			 * Instantly toggle the visibility of the placements on status change.
			 */
			api( id + '[status]', function( statusSetting ) {
				statusSetting.bind( function( newStatus ) {
					_.each( partial.placements(), function( placement ) {
						placement.container.toggle( 'publish' === newStatus );
					} );
				} );
			} );

			/*
			 * Add support for Customize Posts.
			 * Relate the partial to the post setting and featured image setting
			 * for the post that is designated the related post for this featured
			 * item. This ensures that the featured item partial will refresh
			 * when the related post is changed, including changes to its featured image.
			 */
			api( id + '[related]', function( relatedSetting ) {
				var updateRelatedPostSettings = function( newRelatedPostId, oldRelatedPostId ) {
					partial.params.settings = _.without(
						partial.params.settings,
						'post[post][' + String( oldRelatedPostId ) + ']',
						'postmeta[post][' + String( oldRelatedPostId ) + '][_thumbnail_id]'
					);
					partial.params.settings.push( 'post[post][' + String( newRelatedPostId ) + ']' );
					partial.params.settings.push( 'postmeta[post][' + String( newRelatedPostId ) + '][_thumbnail_id]' );
				};
				relatedSetting.bind( updateRelatedPostSettings );
				updateRelatedPostSettings( relatedSetting.get(), 0 );
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

			settingId = _.isString( setting ) ? setting : setting.id;

			// Prevent selective refresh in response to position changes since we handle them in separately and purely in DOM.
			if ( settingId === partial.id + '[position]' ) {
				return false;
			}

			/*
			 * Prevent selective refresh in response to changing status to trash.
			 * An item set to have a trash status will be hidden immediately via JS.
			 */
			if ( settingId === partial.id + '[status]' && 'trash' === newValue ) {
				return false;
			}

			// Handle special case for Customize Posts since settings are dynamically added.
			if ( null === oldValue ) {
				return false;
			}

			return api.selectiveRefresh.Partial.prototype.isRelatedSetting.call( partial, setting, newValue, oldValue );
		},

		/**
		 * Find all placements for this partial in the document.
		 *
		 * Inject missing placements if none found (due to having been previously trashed or having been just added).
		 *
		 * @return {Array.<wp.customize.selectiveRefresh.Placement>}
		 */
		placements: function placements() {
			var partial = this, placements, statusSetting;
			placements = api.selectiveRefresh.Partial.prototype.placements.call( partial );

			statusSetting = api( partial.id + '[status]' );
			if ( 0 === placements.length && statusSetting && 'trash' !== statusSetting.get() ) {
				placements = $( '.featured-content-items' ).map( function() {
					var featuredItemsContainer = $( this ), placementContainer;
					placementContainer = $( '<li></li>' );
					placementContainer.addClass( 'featured-content-item' );
					placementContainer.attr( 'data-customize-partial-id', partial.id );
					placementContainer.attr( 'data-customize-type', partial.type );
					featuredItemsContainer.prepend( placementContainer );
					return new api.selectiveRefresh.Placement( {
						partial: partial,
						container: placementContainer
					} );
				} ).get();
			}

			return placements;
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
