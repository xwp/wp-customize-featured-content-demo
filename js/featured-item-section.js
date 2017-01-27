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
			var section = this, onceExpanded, controlsNeeded;
			api.Section.prototype.ready.call( section );

			section.syncTitleWithUI();
			section.syncPositionAsPriority();
			section.syncStatusWithUI();

			controlsNeeded = $.Deferred();
			controlsNeeded.done( function() {
				section.addControls();
			} );

			/*
			 * Defer adding controls until the section is actually expanded.
			 * Since the controls for related post and featured image make
			 * ajax requests, this is necessary to prevent slamming the server
			 * with many requests at once for all of the featured items together.
			 */
			onceExpanded = function( isExpanded ) {
				if ( isExpanded ) {
					controlsNeeded.resolve();
					section.expanded.unbind( onceExpanded );
				}
			};
			if ( section.expanded() ) {
				onceExpanded();
			} else {
				section.expanded.bind( onceExpanded );
			}

			// Ensure that controls are embedded when one of them is autofocused.
			if ( api.settings.autofocus.control && 0 === api.settings.autofocus.control.indexOf( section.id ) ) {
				controlsNeeded.resolve();
			}

			// Provide an assist for focus-control-for-setting for lazy-loaded controls.
			api.previewer.bind( 'focus-control-for-setting', function focusControlForSetting( settingId ) {

				/*
				 * By convention, the ID for the section serves as the base for
				 * the ID for its controls and their settings, so if attempting
				 * to focus on the control for setting featured_item[1][title],
				 * then we just need to check if the setting ID starts with
				 * the ID for this section. If this section is for item 1, then
				 * this section would have the ID of featured_item[1], and this
				 * would entail that the controls need to be embedded and the
				 * control associated with that setting would need to be focused.
				 * By convention as well the ID for a control matches the ID for
				 * its related setting.
				 */
				if ( 0 === settingId.indexOf( section.id ) ) {
					controlsNeeded.resolve();

					// Once the control exists, focus on it. The control ID matches the setting ID.
					api.control( settingId, function( control ) {
						control.focus();
					} );
				}
			} );
		},

		/**
		 * Return whether this section has any active controls.
		 *
		 * @inheritDoc
		 *
		 * Since controls are dynamically added once the section is expanded,
		 * this must always return true.
		 *
		 * @return {boolean}
		 */
		isContextuallyActive: function() {
			return true;
		},

		/**
		 * Add controls.
		 *
		 * @returns {void}
		 */
		addControls: function addControls() {
			var section = this;
			section.addFeaturedImageControl();
			section.addRelatedPostControl();
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
			api( section.id + '[position]', function( positionSetting ) {
				section.priority.set( positionSetting.get() );
				section.priority.link( positionSetting );
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
				section.getRelatedPost().done( function( post ) {
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
			api( section.id + '[title]', function( titleSetting ) {
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
			api( section.id + '[status]', function( statusSetting ) {
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
		 * @todo Update object selector to allow featured images to be displayed in results and in the selection.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addRelatedPostControl: function addRelatedPostControl() {
			var section = this, control, customizeId, params;
			customizeId = section.id + '[related]'; // Both the the ID for the control and the setting.

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
			customizeId = section.id + '[featured_media]';

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

		relatedPostPromises: {},

		/**
		 * Get related post promise.
		 *
		 * This method exists to cache the promises so that multiple calls won't result in multiple API calls being made.
		 *
		 * @return {Deferred.promise} Post promise.
		 */
		getRelatedPost: function getRelatedPost() {
			var section = this, related = section.params.item.get( 'related' );
			if ( ! related ) {
				return $.Deferred().reject().promise();
			} else if ( section.relatedPostPromises[ related ] && 'rejected' !== section.relatedPostPromises[ related ].state() ) {
				return section.relatedPostPromises[ related ];
			} else {
				section.relatedPostPromises[ related ] = section.params.item.getRelatedPost();
				return section.relatedPostPromises[ related ];
			}
		},

		/**
		 * Add title text control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addTitleControl: function addTitleControl() {
			var section = this, control, customizeId, updateRelatedState;
			customizeId = section.id + '[title]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.featured_item_field( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.title,
					label: section.l10n.title_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'text'
				}
			} );
			api.control.add( control.id, control );

			/**
			 * Update the control in response to changes to the related post.
			 *
			 * @returns {void}
			 */
			updateRelatedState = function() {
				control.placeholder.set( '' ); // While waiting for related post to fetch.
				if ( section.params.item.get( 'related' ) ) {
					section.getRelatedPost().done( function( post ) {
						control.placeholder.set( post.get( 'title' ).rendered );
					} );
				}
			};
			section.params.item.on( 'change:related', updateRelatedState );
			updateRelatedState();

			/*
			 * Listen for changes to this setting sent from the preview.
			 * Normally settings are only synced from the controls into the preview
			 * and not the other way around. For inline editing, however, setting
			 * changes can be made in the preview and they then need to be synced
			 * back up to the controls pane. This is an implementation of #29288:
			 * Settings updated within the Customizer Preview are not synced up to main app Panel
			 * https://core.trac.wordpress.org/ticket/29288
			 *
			 * See corresponding code which sends the setting from the preview in:
			 * wp.customize.featuredContent.PropertyInlineEditing
			 */
			api.previewer.bind( 'setting', function syncTitleSettingFromPreview( args ) {
				if ( _.isArray( args ) && args[0] === customizeId && api.has( customizeId ) ) {
					api( customizeId ).set( args[1] );
				}
			} );

			return control;
		},

		/**
		 * Add excerpt text control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addExcerptControl: function addExcerptControl() {
			var section = this, control, customizeId, updateRelatedState;
			customizeId = section.id + '[excerpt]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.featured_item_field( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.excerpt,
					label: section.l10n.excerpt_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'textarea'
				}
			} );
			api.control.add( control.id, control );

			/**
			 * Update the control in response to changes to the related post.
			 *
			 * @returns {void}
			 */
			updateRelatedState = function() {
				control.placeholder.set( '' );
				if ( section.params.item.get( 'related' ) ) {
					section.getRelatedPost().done( function( post ) {
						control.placeholder.set( $( post.get( 'excerpt' ).rendered ).text() );
					} );
				}
			};
			section.params.item.on( 'change:related', updateRelatedState );
			updateRelatedState();

			return control;
		},

		/**
		 * Add URL control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addURLControl: function addURLControl() {
			var section = this, control, customizeId, updateRelatedState;
			customizeId = section.id + '[url]'; // Both the the ID for the control and the setting.
			control = new api.controlConstructor.featured_item_field( customizeId, {
				params: {
					section: section.id,
					priority: section.controlPriorities.url,
					label: section.l10n.url_label,
					active: true,
					settings: {
						'default': customizeId
					},
					field_type: 'url'
				}
			} );
			api.control.add( control.id, control );

			/**
			 * Update the control in response to changes to the related post.
			 *
			 * @returns {void}
			 */
			updateRelatedState = function() {
				control.placeholder.set( section.l10n.url_placeholder ); // While waiting for related post to fetch.
				if ( section.params.item.get( 'related' ) ) {
					section.getRelatedPost().done( function( post ) {
						control.placeholder.set( post.get( 'link' ) );
					} );
				}
			};
			section.params.item.on( 'change:related', updateRelatedState );
			updateRelatedState();

			return control;
		},

		/**
		 * Add status control.
		 *
		 * @returns {wp.customize.Control} Added control.
		 */
		addStatusControl: function addStatusControl() {
			var section = this, control, customizeId;
			customizeId = section.id + '[status]';
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
