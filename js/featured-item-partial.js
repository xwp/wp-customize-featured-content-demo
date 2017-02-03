/* global wp */
/* eslint consistent-this: [ "error", "partial" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ], complexity: [ "error", 4 ] */

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
			 * Use JS for instant preview of changes to the title color and positioning.
			 */
			api( partial.id + '[title_color]', function( titleColorSetting ) {
				titleColorSetting.bind( function( newTitleColor ) {
					_.each( partial.placements(), function( placement ) {
						placement.container.find( '.title' ).css( { color: newTitleColor } );
					} );
				} );
			} );
			api( partial.id + '[title_background]', function( titleBackgroundSetting ) {
				titleBackgroundSetting.bind( function( newTitleColor ) {
					_.each( partial.placements(), function( placement ) {
						placement.container.find( '.title' ).css( { backgroundColor: newTitleColor } );
					} );
				} );
			} );
			api( partial.id + '[title_left]', function( titleLeftSetting ) {
				titleLeftSetting.bind( function( newTitleLeft ) {
					_.each( partial.placements(), function( placement ) {
						placement.container.find( '.title' ).css( { left: newTitleLeft } );
					} );
				} );
			} );
			api( partial.id + '[title_top]', function( titleTopSetting ) {
				titleTopSetting.bind( function( newTitleTop ) {
					_.each( partial.placements(), function( placement ) {
						placement.container.find( '.title' ).css( { top: newTitleTop } );
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

			// Prevent selective refresh in response to color or position changes since we handle them in separately and purely in DOM.
			if ( settingId === partial.id + '[title_color]' || settingId === partial.id + '[title_background]' || settingId === partial.id + '[title_top]' || settingId === partial.id + '[title_left]' ) {
				return false;
			}

			/*
			 * Note that we cannot prevent selective refresh in response to changing
			 * status to trash because we need the change to trash to cancel out a
			 * previous pending partial request to change the status to publish.
			 * This would be a problem specifically when a user rapdily clicks
			 * the trash/untrash button.
			 */

			// Handle special case for Customize Posts since settings are dynamically added.
			if ( null === oldValue ) {
				return false;
			}

			return api.selectiveRefresh.Partial.prototype.isRelatedSetting.call( partial, setting, newValue, oldValue );
		},

		/**
		 * Request the new partial and render it into the placements.
		 *
		 * @return {jQuery.Promise} Refresh promise.
		 */
		refresh: function refresh() {
			var partial = this, statusSetting;

			// Ensure the partial has a placement container injected into the DOM handling items that are created and untrashed.
			statusSetting = api( partial.id + '[status]' );
			if ( 0 === partial.placements().length && statusSetting && 'trash' !== statusSetting.get() ) {
				$( '.featured-content-items' ).each( function() {

					// See \Customize_Featured_Content_Demo\View::render_item().
					$( this ).prepend( $( '<li></li>', {
						'class': 'featured-content-item',
						'data-customize-partial-id': partial.id,
						'data-customize-type': partial.type
					} ) );
				} );

				// Make sure the newly-added placement gets put into the right order.
				partial.repositionPlacements();
			}

			return api.selectiveRefresh.Partial.prototype.refresh.call( partial );
		},

		/**
		 * Reposition placements in response to position changes.
		 *
		 * @returns {void}
		 */
		repositionPlacements: function repositionPlacements() {
			var partial = this;
			_.each( partial.placements(), function( placement ) {
				var itemsContainer, itemContainers, oldPartialOrdering, newPartialOrdering;
				itemsContainer = placement.container.parent();

				itemContainers = itemsContainer.children( '.featured-content-item[data-customize-partial-id]' ).get();
				oldPartialOrdering = _.map( itemContainers, function( itemContainer ) {
					return $( itemContainer ).data( 'customize-partial-id' );
				} );

				itemContainers.sort( function( a, b ) {
					var positionSettingA, positionSettingB;
					positionSettingA = api( $( a ).data( 'customize-partial-id' ) + '[position]' );
					positionSettingB = api( $( b ).data( 'customize-partial-id' ) + '[position]' );
					if ( ! positionSettingA || ! positionSettingB ) {
						return 0;
					} else {
						return positionSettingA.get() - positionSettingB.get();
					}
				} );

				newPartialOrdering = _.map( itemContainers, function( itemContainer ) {
					return $( itemContainer ).data( 'customize-partial-id' );
				} );

				if ( ! _.isEqual( oldPartialOrdering, newPartialOrdering ) ) {
					_.each( itemContainers, function( itemContainer ) {
						itemsContainer.append( itemContainer );
					} );
				}
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
		}
	});

})( wp.customize, jQuery );
