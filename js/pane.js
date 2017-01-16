/* global wp, console */

wp.customize.featuredContent.pane = (function( api ) {
	'use strict';

	// @todo Add integrations methods.
	var component = {
		data: {}
	};

	/**
	 * Featured item setting.
	 *
	 * @constructor
	 */
	component.FeaturedItemSetting = api.Setting.extend( {} );

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

		api.settingConstructor.featured_item = component.FeaturedItemSetting;

		api.bind( 'ready', component.ready );
	};

	/**
	 * Ready.
	 *
	 * @returns {void}
	 */
	component.ready = function paneReady() {
		api.each( component.handleSettingAddition );
		api.bind( 'add', component.handleSettingAddition );
	};

	/**
	 * Create a featured item section when a featured item setting is added.
	 *
	 * @param {wp.customize.Setting} setting Setting.
	 * @returns {void}
	 */
	component.handleSettingAddition = function handleSettingAddition( setting ) {
		if ( setting.extended( component.FeaturedItemSetting ) ) {
			component.addSection( setting );
		}
	};

	/**
	 * Add a section for a featured item.
	 *
	 * @param {component.FeaturedItemSetting} setting - Featured item setting.
	 * @returns {wp.customize.Section} Added section (or existing section if it already existed).
	 */
	component.addSection = function addSection( setting ) {
		var section, sectionId, Section;
		sectionId = setting.id;

		if ( api.section.has( sectionId ) ) {
			return api.section( sectionId );
		}

		Section = api.sectionConstructor.featured_item;
		section = new Section( sectionId, {
			params: {
				id: sectionId,
				panel: 'featured_items',
				active: true
			}
		});
		api.section.add( sectionId, section );

		return section;
	};

	return component;

})( wp.customize, jQuery, wp.customize.featuredContent );
