/* global wp */

wp.customize.featuredContent.pane = (function( api ) {
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

		api.bind( 'ready', component.ready );
	};

	/**
	 * Ready.
	 *
	 * @returns {void}
	 */
	component.ready = function paneReady() {
		// @todo This isn't needed anymore.
	};

	return component;

})( wp.customize, jQuery, wp.customize.featuredContent );
