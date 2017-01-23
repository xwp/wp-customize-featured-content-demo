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
		 * @inheritDoc
		 *
		 * @param {string} id - Partial ID.
		 * @param {Object} options - Options.
		 */
		initialize: function initialize( id, options ) {
			var partial = this;
			api.selectiveRefresh.Partial.prototype.initialize.call( partial, id, options );

			// This is needed to enable shift-click-to-edit support; it should be the default in core.
			partial.params.selector = '[data-customize-partial-id="' + id + '"]';

			partial.params.containerInclusive = true;
			partial.params.fallbackRefresh = false;

			wp.api.init().done( function() {
				var propertyNames = _.keys( wp.api.models['Featured-items'].prototype.args );
				partial.params.settings = _.map( propertyNames, function( propertyName ) {
					return partial.id + '[' + propertyName + ']';
				} );
			} );
		},

		/**
		 * Ready
		 *
		 * @inheritDoc
		 */
		ready: function ready() {
			var partial = this;
			api.selectiveRefresh.Partial.prototype.ready.call( partial );

			/*
			 * Use JS for instant low-fidelity preview of changes to the title
			 * while waiting for high-fidelity rendering of title to come with
			 * the selective refresh response. Note that the core themes implement
			 * this same approach for previewing changes to the site title and tagline.
			 */
			api( partial.id + '[title]', function( titleSetting ) {
				titleSetting.bind( function( newTitle ) {

					/*
					 * Skip updating if the setting is not associated with the partial.
					 * This is particularly relevant when doing inline editing, since
					 * the title setting is temporarily removed from being associated
					 * with the partial while editing is being done.
					 */
					if ( -1 === _.indexOf( partial.params.settings, titleSetting.id ) ) {
						return;
					}

					_.each( partial.placements(), function( placement ) {
						placement.container.find( '.title' ).text( newTitle );
					} );
				} );
			} );

			/*
			 * Use pure JS to update partial instead of selective refresh server request.
			 * Since a partial is constrained to the item itself an update the the
			 * position setting wouldn't have any effect on the placement in the page.
			 * So any updates to the position setting are excluded from causing
			 * refresh requests in the isRelatedSetting subclassed method.
			 */
			api( partial.id + '[position]', function( positionSetting ) {
				positionSetting.bind( function() {
					partial.repositionPlacements();
				} );
			} );

			/*
			 * Instantly toggle the visibility of the placements on status change.
			 */
			api( partial.id + '[status]', function( statusSetting ) {
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
			api( partial.id + '[related]', function( relatedSetting ) {
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
		 * @inheritDoc
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
		},

		/**
		 * Create and show the edit shortcut for a given partial placement container.
		 *
		 * @inheritDoc
		 *
		 * @param {Placement} placement The placement container element.
		 * @returns {void}
		 */
		createEditShortcutForPlacement: function createEditShortcutForPlacement( placement ) {
			var partial = this, titleInlineEditing;
			api.selectiveRefresh.Partial.prototype.createEditShortcutForPlacement.call( partial, placement );

			titleInlineEditing = new api.featuredContent.PropertyInlineEditing( {
				placement: placement,
				property: 'title',
				selector: '.title'
			} );

			/*
			 * Note that when a refresh happens this object and its event handlers should be garbage-collected.
			 * Each time a refresh is done, the elements in the placement.container are replaced.
			 */
			titleInlineEditing.addEventHandlers();

			placement.container.find( 'img' ).on( 'click', function( event ) {
				if ( event.shiftKey ) {
					event.preventDefault();
					event.stopPropagation(); // Prevent partial's default showControl behavior.
					api.preview.send( 'focus-control-for-setting', partial.id + '[featured_media]' );
				}
			} );
			placement.container.find( '.excerpt' ).on( 'click', function( event ) {
				if ( event.shiftKey ) {
					event.preventDefault();
					event.stopPropagation(); // Prevent partial's default showControl behavior.
					api.preview.send( 'focus-control-for-setting', partial.id + '[excerpt]' );
				}
			} );
		}
	});

})( wp.customize, jQuery );
