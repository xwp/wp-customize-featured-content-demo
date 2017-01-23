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
			featured_media_label: '{missing_text:featured_media_label}',
			featured_image_button_labels: {
				change: '{missing_text:featured_image_button_labels.change}',
				'default': '{missing_text:featured_image_button_labels.default}',
				placeholder: '{missing_text:featured_image_button_labels.placeholder}',
				remove: '{missing_text:featured_image_button_labels.remove}',
				select: '{missing_text:featured_image_button_labels.select}',
				frame_button: '{missing_text:featured_image_button_labels.frame_button}',
				frame_title: '{missing_text:featured_image_button_labels.frame_title}'
			},
			related_label: '{missing_text:related_label}',
			related_plugin_dependency: '{missing_text:related_plugin_dependency}',
			url_label: '{missing_text:url_label}',
			url_placeholder: '{missing_text:url_placeholder}',
			related_placeholder: '{missing_text:related_placeholder}',
			title_label: '{missing_text:title}',
			excerpt_label: '{missing_text:description}',
			position_label: '{missing_text:position}',
			status_label: '{missing_text:status}',
			customize_action: '{missing_text:customize_action}'
		},

		// Make it easy to change the ordering of controls with a centralized priority lookup.
		controlPriorities: (function() {
			var order, orderMapping = {};
			order = [
				'status',
				'related',
				'featured_media',
				'title',
				'excerpt',
				'url'
			];
			_.each( order, function( property, priority ) {
				orderMapping[ property ] = priority;
			} );
			return orderMapping;
		})(),

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
					settingIdBase: id,
					type: 'featured_item' // So that the list item will include the control-section-featured_item class.
				},
				args.params || {}
			);

			api.Section.prototype.initialize.call( section, id, args );

			// Sync active state with panel since sections are dynamic.
			api.panel( section.panel(), function( panel ) {
				section.active.link( panel.active );
			} );
		},

		/**
		 * Ready.
		 *
		 * @returns {void}
		 */
		ready: function() {
			var section = this;
			api.Section.prototype.ready.call( section );

			section.syncTitleWithUI();
			section.syncStatusWithUI();
			section.addFeaturedImageControl();
			section.addRelatedPostControl();
			section.syncPositionAsPriority();
			section.addTitleControl();
			section.addExcerptControl();
			section.addURLControl();
			section.addStatusControl();
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
		syncTitleWithUI: function syncTitleWithUI() {
			var section = this, panel, sectionContainer, sectionOuterTitleElement,
				sectionInnerTitleElement, customizeActionElement, fetchRelatedPostTitle;

			// Obtain the title and watch for changes.
			section.fallbackTitle = new api.Value( section.l10n.no_title );
			fetchRelatedPostTitle = function() {
				section.params.item.getRelatedPost().done( function( post ) {
					section.fallbackTitle.set( $.trim( post.get( 'title' ).rendered ) || section.l10n.no_title );
				} ).fail( function() {
					section.fallbackTitle.set( section.l10n.no_title );
				} );
			};
			fetchRelatedPostTitle();
			section.params.item.on( 'change:related', function() {
				fetchRelatedPostTitle();
			} );

			// Sync the title setting changes back to the Backbone model. TODO: Should this not be done for all by default in ensureSettings?
			panel = api.panel( section.panel.get() );
			api( panel.getPropertySettingId( section.params.item.id, 'related' ), function( relatedSetting ) {
				section.params.item.set( 'related', relatedSetting.get() );
				relatedSetting.bind( function( newRelated ) {
					section.params.item.set( 'related', newRelated );
				} );
			} );

			// Update the UI title.
			sectionContainer = section.container.closest( '.accordion-section' );
			sectionOuterTitleElement = sectionContainer.find( '.accordion-section-title:first' );
			sectionInnerTitleElement = sectionContainer.find( '.customize-section-title h3' ).first();
			customizeActionElement = sectionInnerTitleElement.find( '.customize-action' ).first();
			api( section.params.settingIdBase + '[title]', function( titleSetting ) {
				var setTitle = function() {
					var title = $.trim( titleSetting.get() ) || section.fallbackTitle.get();
					sectionOuterTitleElement.text( title );
					sectionInnerTitleElement.text( title );
					sectionInnerTitleElement.prepend( customizeActionElement );
				};
				titleSetting.bind( setTitle );
				setTitle();
				section.fallbackTitle.bind( setTitle );
			} );

		},

		/**
		 * Keep the status updated in the UI when the status updates in the setting.
		 *
		 * @returns {void}
		 */
		syncStatusWithUI: function syncTitleWithUI() {
			var section = this;
			api( section.params.settingIdBase + '[status]', function( statusSetting ) {
				var setStatus = function() {
					section.headContainer.toggleClass( 'trashed', 'trash' === statusSetting() );
				};
				statusSetting.bind( setStatus );
				setStatus();
			} );
		},

		/**
		 * Add object selector control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addRelatedPostControl: function addRelatedPostControl() {
			var section = this, control, customizeId, params;
			customizeId = section.params.settingIdBase + '[related]'; // Both the the ID for the control and the setting.

			params = {
				section: section.id,
				priority: section.controlPriorities.related,
				label: section.l10n.related_label,
				active: true,
				settings: {
					'default': customizeId
				}
			};
			if ( api.controlConstructor.object_selector ) {
				control = new api.controlConstructor.object_selector( customizeId, {
					params: _.extend( params, {
						post_query_vars: {
							post_type: [ 'post' ],
							post_status: 'publish'
						},
						show_add_buttons: false,
						select2_options: {
							multiple: false,
							allowClear: true,
							placeholder: section.l10n.related_placeholder
						}
					} )
				} );
			} else {

				// Add an ad hoc control for displaying an informational message.
				control = new api.Control( customizeId, {
					params: _.extend( params, {
						settings: {}, // Setting-less control.
						content: wp.template( 'message-customize-control' )( {
							label: params.label,
							message: section.l10n.related_plugin_dependency
						} )
					} )
				} );
			}

			api.control.add( control.id, control );

			return control;
		},

		/**
		 * Add featured image control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addFeaturedImageControl: function addFeaturedImageControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[featured_media]';

			control = new api.MediaControl( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.featured_media,
					label: section.l10n.featured_media_label,
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
		 * @todo Add input placeholder to correspond to related post?
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addTitleControl: function addTitleControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[title]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.dynamic( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.title,
					label: section.l10n.title_label,
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
		 * @todo Add input placeholder to correspond to related post?
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addExcerptControl: function addExcerptControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[excerpt]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.dynamic( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.excerpt,
					label: section.l10n.excerpt_label,
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
		},

		/**
		 * Add URL control.
		 *
		 * @todo Add input placeholder to correspond to related post?
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addURLControl: function addURLControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[url]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.dynamic( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.url,
					label: section.l10n.url_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'url',
					input_attrs: {
						'data-customize-setting-link': customizeId,
						placeholder: section.l10n.url_placeholder
					}
				}
			} );

			api.control.add( control.id, control );

			return control;
		},

		/**
		 * Add status control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addStatusControl: function addStatusControl() {
			var section = this, control, customizeId;
			customizeId = section.params.settingIdBase + '[status]';
			control = new api.controlConstructor.featured_item_status( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.status,
					label: section.l10n.status_label,
					active: true,
					settings: {
						'default': customizeId
					}
				}
			} );

			api.control.add( control.id, control );

			return control;
		}
	});

})( wp.customize, jQuery );
