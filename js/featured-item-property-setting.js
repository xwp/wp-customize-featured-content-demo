/* global wp */
/* eslint consistent-this: [ "error", "setting" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1,2,3] } ] */

wp.customize.settingConstructor.featured_item_property = (function( api ) {
	'use strict';

	/**
	 * A setting for managing a featured item property.
	 *
	 * @class
	 * @augments wp.customize.Setting
	 * @augments wp.customize.Class
	 */
	return api.Setting.extend( {

		/**
		 * Initialize.
		 *
		 * @param {string} id      Section ID.
		 * @param {*}      value   Value.
		 * @param {object} params  Params.
		 * @returns {void}
		 */
		initialize: function initialize( id, value, params ) {
			var setting = this, idParts;
			api.Setting.prototype.initialize.call( setting, id, value, params );

			idParts = id.replace( /]/g, '' ).split( /\[/ );
			if ( 'featured_item' !== idParts[0] || 3 !== idParts.length ) {
				throw new Error( 'Unexpected id for featured_item_property setting.' );
			}
			setting.postId = parseInt( idParts[1], 10 );
			setting.property = idParts[2];
		},

		/**
		 * Validate/sanitize setting.
		 *
		 * @param {*} originalValue Value.
		 * @returns {*} Sanitized value or null if invalid.
		 */
		validate: function validate( originalValue ) {
			var setting = this, value;

			value = api.Setting.prototype.validate.call( setting, originalValue );

			// Force an integer empty value (0) instead of an empty string when the media control removes the selected image.
			if ( '' === value && 'featured_media' === setting.property ) {
				value = 0;
			}

			return value;
		}

	} );

})( wp.customize );
