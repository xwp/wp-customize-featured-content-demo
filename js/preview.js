/* global wp */

wp.customize.featuredContent.preview = (function( api ) {
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
		api.each( component.handleSettingAddition );
		api.bind( 'add', component.handleSettingAddition );

		api.preview.bind( 'featured-item-created', function( id ) {
		    component.ensurePartial( id ).refresh();
	    } );
	};

	/**
	 * Handle setting addition to create featured item partials as required.
	 *
	 * For already published featured items that already exist this won't be
	 * necessary since the featured item placement containers have attributes
	 * that will cause their partials to be created automatically. But for featured
	 * items that are trashed in the customized state or for featured items
	 * that get newly created, this ensures that their partials will be
	 * dynamically created. The featured item status setting is listened for
	 * specifically since it is the setting used to determine whether the
	 * partial needs a placement or not (publish vs trash).
	 *
	 * @param {wp.customize.Value} setting The setting.
	 */
	component.handleSettingAddition = function handleSettingAddition( setting ) {
		var matches = setting.id.match( /^featured_item\[(\d+)]\[status]$/ );
		if ( matches ) {
			component.ensurePartial( parseInt( matches[1], 10 ) );
		}
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
			api.selectiveRefresh.partial.add( partial.id, partial );
		}
		return partial;
	};

	return component;

})( wp.customize, jQuery, wp.customize.featuredContent );
