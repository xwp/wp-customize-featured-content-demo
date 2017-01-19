/* global wp */
/* eslint consistent-this: [ "error", "panel" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.panelConstructor.featured_items = (function( api, $ ) {
	'use strict';

	/**
	 * A panel for managing featured items.
	 *
	 * @class
	 * @augments wp.customize.Panel
	 * @augments wp.customize.Class
	 */
	return api.Panel.extend({

		/**
		 * Ready.
		 *
		 * @returns {void}
		 */
		ready: function() {
			var panel = this;
			api.Panel.prototype.ready.call( panel );

			_.bindAll( panel, 'handleSettingAddition' );
			api.each( panel.handleSettingAddition );
			api.bind( 'add', panel.handleSettingAddition );

			panel.setupSectionSorting();
		},

		/**
		 * Create a featured item section when a featured item setting is added.
		 *
		 * @param {wp.customize.Setting} setting Setting.
		 * @returns {void}
		 */
		handleSettingAddition: function handleSettingAddition( setting ) {
			var panel = this;
			if ( setting.extended( api.settingConstructor.featured_item_property ) ) {
				panel.addSection( setting );
			}
		},

		/**
		 * Add a section for a featured item.
		 *
		 * @param {wp.customize.settingConstructor.featured_item_property} setting - Featured item setting.
		 * @returns {wp.customize.Section} Added section (or existing section if it already existed).
		 */
		addSection: function addSection( setting ) {
			var panel = this, section, sectionId, Section;

			// Strip off property component from setting ID to obtain section ID.
			sectionId = setting.id.replace( /\[\w+]$/, '' );

			if ( api.section.has( sectionId ) ) {
				return api.section( sectionId );
			}

			Section = api.sectionConstructor.featured_item;
			section = new Section( sectionId, {
				params: {
					id: sectionId,
					panel: panel.id,
					active: true
				}
			});
			api.section.add( sectionId, section );

			return section;
		},

		/**
		 * Set up sorting of sections by drag-and-drop.
		 *
		 * @returns {void}
		 */
		setupSectionSorting: function setupSectionSorting() {
			var panel = this;

			panel.contentContainer.sortable({
				items: '> .control-section',
				axis: 'y',
				tolerance: 'pointer',
				stop: function() {
					panel.contentContainer.find( '> .control-section' ).each( function( i ) {
						var li = $( this ), sectionId, setting;
						sectionId = li.attr( 'id' ).replace( /^accordion-section-/, '' );
						setting = api( sectionId + '[position]' );
						if ( setting ) {
							setting.set( i );
						}
					} );
				}
			});
		}

	});

})( wp.customize, jQuery );
