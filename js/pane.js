/* global wp, console */

wp.customize.featuredContent.pane = (function( api ) { // eslint-disable-line no-unused-vars
	'use strict';

	// @todo Add integrations methods.
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
		console.info( 'Pane ready.' );
	};

	return component;

})( wp.customize, jQuery, wp.customize.featuredContent );
