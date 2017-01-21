/* global wp, console */

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
	};

	/**
	 * Handle setting addition to create featured item partials as required.
	 *
	 * @param {wp.customize.Value} setting
	 */
	component.handleSettingAddition = function handleSettingAddition( setting ) {
		var matches = setting.id.match( /^featured_item\[(\d+)]\[status]$/ );
		if ( matches ) {
			component.ensurePartial( parseInt( matches[1], 10 ) );
		}
	};

	/**
	 * Ensure featured item partial.
	 *
	 * This is primarily used for when partials are newly created.
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
