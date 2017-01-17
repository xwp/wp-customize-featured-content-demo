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

			// @todo Overkill?
			section.contentsEmbedded = $.Deferred();

			api.Section.prototype.initialize.call( section, id, args );

			// Let the section priority correspond to the position of the featured item.
			section.syncPositionAsPriority();
		},

		/**
		 * Allow an active section to be contextually active even when it lacks controls.
		 *
		 * @todo Overkill?
		 * This allows us to dynamically create controls once the section is expanded.
		 *
		 * @returns {boolean} Active.
		 */
		isContextuallyActive: function() {
			var section = this;
			return section.active();
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
		 * @todo Deferred-embedding overkill?
		 * @returns {void}
		 */
		ready: function() {
			var section = this, shouldExpandNow = section.expanded();

			section.setupTitleUpdating();

			section.contentsEmbedded.done( function() {
				section.embedSectionContents();
			} );

			api.Section.prototype.ready.call( section );

			if ( api.settings.autofocus.section === section.id ) {
				shouldExpandNow = true;
			}
			if ( api.settings.autofocus.control && 0 === api.settings.autofocus.control.indexOf( section.id ) ) {
				shouldExpandNow = true;
			}

			// Embed now if it is already expanded or if the section or a control
			function handleExpand( expanded ) {
				if ( expanded ) {
					section.contentsEmbedded.resolve();
					section.expanded.unbind( handleExpand );
				}
			}
			if ( shouldExpandNow ) {
				section.contentsEmbedded.resolve();
			} else {
				section.expanded.bind( handleExpand );
			}

			api.Section.prototype.ready.call( section );
		},

		/**
		 * Embed the section contents.
		 *
		 * @todo Overkill?
		 * This is called once the section is expanded, when section.contentsEmbedded is resolved.
		 *
		 * @return {void}
		 */
		embedSectionContents: function embedSectionContents() {
			var section = this;
			section.setupControls();
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
		 * Set up the post field controls.
		 *
		 * @returns {void}
		 */
		setupControls: function() {
			var section = this;
			section.addTitleControl();
			section.addPositionControl();
			section.addExcerptControl();
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
		},

		/**
		 * Add order control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addPositionControl: function addPositionControl() {
			var section = this, control, setting = api( section.id );
			control = new api.controlConstructor.dynamic( section.id + '[position]', {
				params: {
					section: section.id,
					priority: 80,
					label: section.l10n.position_label,
					active: true,
					settings: {
						'default': setting.id
					},
					field_type: 'number',
					setting_property: 'position',
					input_attrs: {
						min: 0
					}
				}
			} );

			api.control.add( control.id, control );

			return control;
		}
	});

})( wp.customize, jQuery );
