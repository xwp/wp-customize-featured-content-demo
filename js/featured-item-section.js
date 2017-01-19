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
			no_title: '{missing_text:untitled}',
			featured_image_id_label: '{missing_text:featured_image_id_label}',

			featured_image_button_labels: {
				change: '{missing_text:featured_image_button_labels.change}',
				'default': '{missing_text:featured_image_button_labels.default}',
				placeholder: '{missing_text:featured_image_button_labels.placeholder}',
				remove: '{missing_text:featured_image_button_labels.remove}',
				select: '{missing_text:featured_image_button_labels.select}',
				frame_button: '{missing_text:featured_image_button_labels.frame_button}',
				frame_title: '{missing_text:featured_image_button_labels.frame_title}'
			},

			related_post_id_label: '{missing_text:related_post_id_label}',
			related_post_id_placeholder: '{missing_text:related_post_id_placeholder}',
			title_text_label: '{missing_text:title}',
			description_text_label: '{missing_text:description}',
			position_label: '{missing_text:position}',
			customize_action: '{missing_text:customize_action}'
		},

		// Make it easy to change the ordering of controls with a centralized priority lookup.
		controlPriorities: {
			related_post_id: 10,
			featured_image_id: 15,
			title_text: 20,
			description_text: 30
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
			section.addFeaturedImageControl();
			section.addRelatedPostControl();
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
		 * Add object selector control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addRelatedPostControl: function addRelatedPostControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[related_post_id]'; // Both the the ID for the control and the setting.

			control = new api.controlConstructor.object_selector( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.related_post_id,
					label: section.l10n.related_post_id_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'select',
					post_query_vars: {
						post_type: [ 'post', 'page' ],
						post_status: 'publish'
					},
					show_add_buttons: false,
					select2_options: {
						multiple: false,
						allowClear: true,
						placeholder: section.l10n.related_post_id_placeholder
					}
				}
			} );

			api.control.add( control.id, control );

			return control;
		},

		/**
		 * Add title text control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addFeaturedImageControl: function addFeaturedImageControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[featured_image_id]';

			control = new api.MediaControl( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.featured_image_id,
					label: section.l10n.featured_image_id_label,
					button_labels: section.l10n.featured_image_button_labels,
					active: true,
					canUpload: true,
					content: '<li class="customize-control customize-control-media"></li>',
					description: '',
					mime_type: 'image',
					settings: {
						'default': customizeId
					},
					type: 'media'
				}
			} );

			// @todo The wp.customize.MediaControl should do this in core.
			control.initFrame = (function( originalInitFrame ) {

				/**
				 * Initialize the media frame and preselect.
				 *
				 * @return {void}
				 */
				return function initFrameAndSetInitialSelection() {
					originalInitFrame.call( this );
					control.frame.on( 'open', function() {
						var selection = control.frame.state().get( 'selection' );
						if ( control.params.attachment && control.params.attachment.id ) {

							// @todo This should also pre-check the images in the media library grid.
							selection.reset( [ control.params.attachment ] );
						} else {
							selection.reset( [] );
						}
					} );
				};
			})( control.initFrame );

			api.control.add( control.id, control );

			return control;
		},

		/**
		 * Add title text control.
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
		 * Add description text control.
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
