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

		// Make it easy to change the ordering of controls with a centralized priority lookup.
		controlPriorities: {
			title_text: 10,
			description_text: 20
		},

		/**
		 * Initialize.
		 *
		 * @param {string} id      Section ID.
		 * @param {object} options Options.
		 * @returns {void}
		 */
		initialize: function( id, options ) {
			var section = this, args;

			args = options ? _.clone( options ) : {};
			args.params = _.extend(
				{
					title: section.l10n.no_title,
					customizeAction: section.l10n.customize_action,
					settingIdBase: id
				},
				args.params || {}
			);

			api.Section.prototype.initialize.call( section, id, args );
		},

		/**
		 * Ready.
		 *
		 * @returns {void}
		 */
		ready: function() {
			var section = this;
			api.Section.prototype.ready.call( section );

			section.syncTitle();
			section.syncPositionAsPriority();
			section.addTitleControl();
			section.addExcerptControl();
		},

		/**
		 * Let priority (position) of section be determined by position of the featured_item.
		 *
		 * @returns {void}
		 */
		syncPositionAsPriority: function syncPositionAsPriority() {
			var section = this;
			api( section.params.settingIdBase + '[position]', function( positionSetting ) {
				var setPriority = function( position ) {
					section.priority.set( position );
				};
				setPriority( positionSetting() );
				positionSetting.bind( setPriority );
			} );
		},

		/**
		 * Keep the title updated in the UI when the title updates in the setting.
		 *
		 * @returns {void}
		 */
		syncTitle: function syncTitle() {
			var section = this, sectionContainer, sectionOuterTitleElement,
				sectionInnerTitleElement, customizeActionElement;

			sectionContainer = section.container.closest( '.accordion-section' );
			sectionOuterTitleElement = sectionContainer.find( '.accordion-section-title:first' );
			sectionInnerTitleElement = sectionContainer.find( '.customize-section-title h3' ).first();
			customizeActionElement = sectionInnerTitleElement.find( '.customize-action' ).first();
			api( section.params.settingIdBase + '[title_text]', function( titleSetting ) {
				var setTitle = function( newTitle ) {
					var title = $.trim( newTitle ) || section.l10n.no_title;
					sectionOuterTitleElement.text( title );
					sectionInnerTitleElement.text( title );
					sectionInnerTitleElement.prepend( customizeActionElement );
				};
				titleSetting.bind( setTitle );
				setTitle( titleSetting() );
			} );
		},

		/**
		 * Add post title control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addTitleControl: function addTitleControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[title_text]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.dynamic( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.title_text,
					label: section.l10n.title_text_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'text',
					input_attrs: {
						'data-customize-setting-link': customizeId
					}
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
		addExcerptControl: function addExcerptControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[description_text]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.dynamic( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.description_text,
					label: section.l10n.description_text_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'textarea',
					input_attrs: {
						'data-customize-setting-link': customizeId
					}
				}
			} );

			api.control.add( control.id, control );

			return control;
		}
	});

})( wp.customize, jQuery );
