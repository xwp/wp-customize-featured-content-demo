/* global wp */
/* eslint consistent-this: [ "error", "section" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.sectionConstructor.featured_item = (function( api, $ ) {
	'use strict';

	/**
	 * A section for managing a featured item.
	 *
	 * @class
	 * @augments wp.customize.Section
	 * @augments wp.customize.Class
	 */
	return api.Section.extend({

		// This is overridden by \WP_Scripts::add_inline_script() PHP in Plugin::register_scripts().
		l10n: {
			no_title: '{untitled}',
			title_text_label: '{title}',
			description_text_label: '{description}',
			position_label: '{position}',
			customize_action: '{customize_action}'
		},

		/**
		 * Initialize.
		 *
		 * @param {string} id Section ID.
		 * @param {object} options Options.
		 * @returns {void}
		 */
		initialize: function( id, options ) {
			var section = this, args, setting;

			args = options ? _.clone( options ) : {};
			args.params = args.params ? _.clone( args.params ) : {};
			setting = api( id );
			if ( ! setting || ! setting.extended( api.settingConstructor.featured_item ) ) {
				throw new Error( 'The featured_item setting must be created up front.' );
			}

			// Let the title of the section correspond to the title of the featured item.
			args.params.title = api( id ).get().title_text || section.l10n.no_title;
			args.params.customizeAction = section.l10n.customize_action;

			api.Section.prototype.initialize.call( section, id, args );

			// Let the section priority correspond to the position of the featured item.
			section.syncPositionAsPriority();
		},

		/**
		 * Let priority (position) of section be determined by position of the featured_item.
		 *
		 * @returns {void}
		 */
		syncPositionAsPriority: function syncPositionAsPriority() {
			var section = this, setting, setPriority;
			setting = api( section.id );
			setPriority = function( itemData ) {
				if ( false !== itemData ) {
					section.priority.set( itemData.position );
				}
			};
			setPriority( setting() );
			setting.bind( setPriority );
		},

		/**
		 * Ready.
		 *
		 * @returns {void}
		 */
		ready: function() {
			var section = this;
			api.Section.prototype.ready.call( section );

			section.setupTitleUpdating();
			section.addTitleControl();
			section.addExcerptControl();
		},

		/**
		 * Keep the title updated in the UI when the title updates in the setting.
		 *
		 * @returns {void}
		 */
		setupTitleUpdating: function() {
			var section = this, setting = api( section.id ), sectionContainer, sectionOuterTitleElement,
				sectionInnerTitleElement, customizeActionElement;

			sectionContainer = section.container.closest( '.accordion-section' );
			sectionOuterTitleElement = sectionContainer.find( '.accordion-section-title:first' );
			sectionInnerTitleElement = sectionContainer.find( '.customize-section-title h3' ).first();
			customizeActionElement = sectionInnerTitleElement.find( '.customize-action' ).first();
			setting.bind( function( newItemData, oldItemData ) {
				var title;
				if ( newItemData && ( ! oldItemData || newItemData.title_text !== oldItemData.title_text ) ) {
					title = newItemData.title_text || section.l10n.no_title;
					sectionOuterTitleElement.text( title );
					sectionInnerTitleElement.text( title );
					sectionInnerTitleElement.prepend( customizeActionElement );
				}
			} );
		},

		/**
		 * Add post title control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addTitleControl: function() {
			var section = this, control, setting = api( section.id );
			control = new api.controlConstructor.dynamic( section.id + '[title_text]', {
				params: {
					section: section.id,
					priority: 10,
					label: section.l10n.title_text_label,
					active: true,
					settings: {
						'default': setting.id
					},
					field_type: 'text',
					setting_property: 'title_text'
				}
			} );

			api.control.add( control.id, control );

			return control;
		},

		/**
		 * Add post excerpt control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addExcerptControl: function() {
			var section = this, control, setting = api( section.id );
			control = new api.controlConstructor.dynamic( section.id + '[description_text]', {
				params: {
					section: section.id,
					priority: 60,
					label: section.l10n.description_text_label,
					active: true,
					settings: {
						'default': setting.id
					},
					field_type: 'textarea',
					setting_property: 'description_text'
				}
			} );

			api.control.add( control.id, control );

			return control;
		}
	});

})( wp.customize, jQuery );
