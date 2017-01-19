/* global wp */
/* eslint consistent-this: [ "error", "setting" ] */

wp.customize.settingConstructor.featured_item_property = (function( api ) {
	'use strict';

	/**
	 * A setting for managing a featured item property.
	 *
	 * @class
	 * @augments wp.customize.Setting
	 * @augments wp.customize.Class
	 */
	return api.Setting.extend( {} );

})( wp.customize );
