/* global wp */

wp.customize.featuredContent.preview = (function( api, $ ) {
	'use strict';

	var component = {
		data: {}
	};

	/**
	 * Initialize component.
	 *
	 * @param {object} [data] Exports from PHP.
	 * @returns {void}
	 */
	component.initialize = function initializeComponent( data ) {
		if ( data ) {
			_.extend( component.data, data );
		}
		api.bind( 'preview-ready', component.ready );
	};

	/**
	 * Ready.
	 *
	 * @returns {void}
	 */
	component.ready = function previewReady() {
		api.preview.bind( 'featured-item-created', function( id ) {
			component.ensurePartial( id ).refresh();
		} );
		api.preview.bind( 'featured-item-untrashed', function( id ) {
			component.ensurePartial( id ).refresh();
		} );

		component.enableDraggableItemPositioning();
	};

	/**
	 * Ensure featured item partial exists.
	 *
	 * This is relevant for featured items that get created or which get untrashed.
	 *
	 * @param {int} itemId Item ID.
	 * @returns {wp.customize.selectiveRefresh.Partial} Ensured partial.
	 */
	component.ensurePartial = function ensurePartial( itemId ) {
		var partial, partialId;
		partialId = 'featured_item[' + String( itemId ) + ']';
		partial = api.selectiveRefresh.partial( partialId );
		if ( ! partial ) {
			partial = new api.selectiveRefresh.partialConstructor.featured_item( partialId, {} );
			api.selectiveRefresh.partial.add( partial );
		}
		return partial;
	};

	/**
	 * Allow featured items to be re-positioned by drag-and-drop inside the preview.
	 *
	 * @returns {void}
	 */
	component.enableDraggableItemPositioning = function enableDraggableItemPositioning() {
		$( '.featured-content-items' ).each( function() {
			var container = $( this );

			container.sortable({
				items: '> .featured-content-item[data-customize-partial-id]',
				axis: 'x',
				tolerance: 'pointer',
				stop: function() {
					container.find( '> .featured-content-item[data-customize-partial-id]' ).each( function( i ) {
						var partialId, positionSettingId;
						partialId = $( this ).data( 'customize-partial-id' );
						positionSettingId = partialId + '[position]';
						api.preview.send( 'setting', [ positionSettingId, i ] );
					} );
				}
			});
		} );
	};

	return component;

})( wp.customize, jQuery, wp.customize.featuredContent );
