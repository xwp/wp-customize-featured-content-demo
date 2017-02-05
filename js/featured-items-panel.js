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
		 * Items collection.
		 *
		 * @var {Backbone.Collection}
		 */
		itemsCollection: null,

		/**
		 * The constructor for a featured item model.
		 *
		 * @var {Function}
		 */
		FeaturedItem: null,

		// This is overridden by \WP_Scripts::add_inline_script() PHP in Plugin::register_scripts().
		l10n: {
			load_items_failure: '{missing_text:load_items_failure}',
			create_item_failure: '{missing_text:get_items_failure}'
		},

		/**
		 * Ready.
		 *
		 * @returns {void}
		 */
		ready: function() {
			var panel = this, onceActive;
			api.Panel.prototype.ready.call( panel );

			panel.notifications = new api.Values({ defaultConstructor: api.Notification });
			panel.loading = new api.Value();

			// Finish initialization once the panel is active/contextual.
			if ( panel.active.get() ) {
				panel.finishInitialization();
			} else {
				onceActive = function( isActive ) {
					if ( isActive ) {
						panel.active.unbind( onceActive );
						panel.finishInitialization();
					}
				};
				panel.active.bind( onceActive );
			}

			// @todo Core should be doing this automatically. See <https://core.trac.wordpress.org/ticket/39663>.
			panel.active.bind( function( isActive ) {
				if ( ! isActive ) {
					panel.collapse();
				}
			} );
		},

		/**
		 * Setup panel notifications.
		 *
		 * This is partially copied from the control.
		 *
		 * Note that this debounced/deferred rendering is needed for two reasons:
		 * 1) The 'remove' event is triggered just _before_ the notification is actually removed.
		 * 2) Improve performance when adding/removing multiple notifications at a time.
		 *
		 * @see wp.customize.Control.prototype.initialize()
		 * @returns {void}
		 */
		setupNotifications: function setupNotifications() {
			var panel = this, debouncedRenderNotifications;
			debouncedRenderNotifications = _.debounce( function renderNotifications() {
				panel.renderNotifications();
			} );
			panel.notifications.bind( 'add', function( notification ) {
				wp.a11y.speak( notification.message, 'assertive' );
				debouncedRenderNotifications();
			} );
			panel.notifications.bind( 'remove', debouncedRenderNotifications );
			panel.renderNotifications();
		},

		/**
		 * Render notifications.
		 *
		 * Re-use method from control.
		 */
		renderNotifications: api.Control.prototype.renderNotifications,

		/**
		 * Get the element inside of a control's container that contains the validation error message.
		 *
		 * This could technically re-use the method from the control, but most of the logic in the
		 * control's method is unnecessary.
		 *
		 * @see wp.customize.Control.getNotificationsContainerElement()
		 * @returns {jQuery} Notifications container.
		 */
		getNotificationsContainerElement: function getNotificationsContainerElement() {
			var panel = this;
			if ( ! panel.notificationsContainer ) {
				panel.notificationsContainer = panel.contentContainer.find( '.customize-control-notifications-container:first' );
			}
			return panel.notificationsContainer;
		},

		/**
		 * Return whether this panel has any active sections.
		 *
		 * @inheritDoc
		 *
		 * Since new featured items can be created from from the empty panel,
		 * it should always be active.
		 *
		 * @returns {boolean} Whether contextually-active.
		 */
		isContextuallyActive: function() {
			return true;
		},

		/**
		 * Finish initialization.
		 *
		 * This an example of lazy-loading settings, sections, and controls
		 * only when they are contextual to what is being previewed.
		 *
		 * @link https://core.trac.wordpress.org/ticket/28580
		 * @returns {void}
		 */
		finishInitialization: function finishInitialization() {
			var panel = this;

			panel.setupNotifications();
			panel.setupAdditionButton();
			panel.setupSectionSorting();

			// Purge trashed items when the changeset is published.
			api.bind( 'saved', function( data ) {
				if ( 'publish' === data.changeset_status ) {
					panel.purgeTrashedItems();
				}
			} );

			panel.loading.set( true ); // Show spinner with addition button disabled.
			panel.loadItems().always( function() {
				panel.loading.set( false ); // Hide spinner and enable addition button.
			} );
		},

		/**
		 * Load items.
		 *
		 * @returns {jQuery.promise} Promise resolving when items are fetched.
		 */
		loadItems: function loadItems() {
			var panel = this, reject, deferred = $.Deferred();
			reject = function( err ) {
				var notificationCode = 'load_items_failure', notification;
				notification = new api.Notification( notificationCode, {
					message: panel.l10n.load_items_failure,
					type: 'error'
				} );
				panel.notifications.add( notificationCode, notification );
				deferred.reject( err );
			};
			wp.api.init().fail( reject ).done( function() {
				var queryParams, FeaturedItemsCollection, FeaturedItem;
				FeaturedItemsCollection = wp.api.collections['Featured-items'] || wp.api.collections.FeaturedItems;
				FeaturedItem = wp.api.models['Featured-items'] || wp.api.models.FeaturedItems;
				if ( ! FeaturedItem || ! FeaturedItemsCollection ) {
					deferred.reject( 'Missing collection for featured-items.' );
					return;
				}
				panel.FeaturedItem = FeaturedItem;

				/**
				 * Get related post.
				 *
				 * @this {wp.api.WPApiBaseModel}
				 * @returns {Deferred.promise} Promise resolving with related post.
				 */
				panel.FeaturedItem.prototype.getRelatedPost = function getRelatedPost() {
					var item = this; // eslint-disable-line consistent-this
					return wp.api.utils._buildModelGetter( // See <js/wp-api-extensions.js>.
						item,
						item.get( 'related' ),
						'Post',
						'related',
						'title'
					);
				};

				panel.itemsCollection = new FeaturedItemsCollection();
				panel.itemsCollection.on( 'add', function( item ) {
					panel.ensureSettings( item );
					panel.ensureSection( item );
				} );

				// Ensure customized state is applied in the response.
				queryParams = api.previewer.query();
				delete queryParams.customized; // No POST data would be queued for saving to changeset.

				// Let the related posts and featured images be embedded to reduce subsequent calls.
				queryParams._embed = true;

				queryParams.context = 'edit';

				// Request trashed items that are referenced in the current changeset (as otherwise they would be excluded).
				queryParams.with_trashed = [];
				api.each( function( setting ) {
					if ( setting.extended( api.settingConstructor.featured_item_property ) && 'status' === setting.property && 'trash' === setting.get() ) {
						queryParams.with_trashed.push( setting.postId );
					}
				} );

				panel.itemsCollection.fetch( { data: queryParams } ).fail( reject ).done( function() {
					deferred.resolve();
				} );
			} );
			return deferred.promise();
		},

		/**
		 * Create a featured item section when a featured item setting is added.
		 *
		 * @returns {void}
		 */
		setupAdditionButton: function setupAdditionButton() {
			var panel = this, button, additionContainer;

			additionContainer = panel.contentContainer.find( '.featured-items-addition:first' );
			button = additionContainer.find( 'button' );
			button.on( 'click', function() {
				var promise, notificationCode;
				promise = panel.createItem();
				notificationCode = 'addition_failure';
				panel.loading.set( true );
				panel.notifications.remove( notificationCode );
				promise.fail( function() {
					var notification = new api.Notification( notificationCode, {
						message: panel.l10n.create_item_failure,
						type: 'error'
					} );
					panel.notifications.add( notificationCode, notification );
				} );
				promise.done( function( createdItem ) {
					createdItem.section.expand( {
						completeCallback: function() {

							// Focus on the related post control.
							api.control( createdItem.section.id + '[related]', function focusControl( control ) {
								var wait = 250; // This delay seems to be required by object selector control and Select2.
								_.delay( function() { // eslint-disable-line max-nested-callbacks
									control.focus();
								}, wait );
							} );
						}
					} );
				} );
				promise.always( function() {
					panel.loading.set( false );
				} );
			} );

			panel.loading.bind( function( isLoading ) {
				button.prop( 'disabled', isLoading );
				button.toggleClass( 'progress', isLoading );
			} );

			return button;
		},

		/**
		 * Create featured item for the customized state.
		 *
		 * @returns {jQuery.promise} Resolves with section object and the item model created.
		 */
		createItem: function createItem() {
			var panel = this, deferred = $.Deferred(), reject, item;

			reject = function() {
				deferred.reject();
			};

			item = new panel.FeaturedItem( { status: 'auto-draft' } );
			item.save().fail( reject ).done( function() {
				/*
				 * Override the status from auto-draft to publish, as the former
				 * is what has been saved to the DB and the latter will be the
				 * value that is the pending value represented in the changeset.
				 */
				item.set( { status: 'publish' } );

				// Bump all existing featured items up in position so the new item will be added to the top (first).
				panel.itemsCollection.each( function( otherItem ) {
					var positionSetting = panel.getPropertySetting( otherItem.id, 'position' );
					if ( positionSetting ) {
						positionSetting.set( positionSetting.get() + 1 );
					}
				} );

				// This will cause the settings and section to be created.
				panel.itemsCollection.add( item );

				// Announce the creation of the item to the preview so that a partial can be initially refreshed.
				api.previewer.send( 'featured-item-created', item.id );

				// Resolve once the section exists.
				api.section( panel.getSectionId( item.id ), function( section ) {
					deferred.resolve( {
						section: section,
						item: item
					} );
				} );
			} );

			return deferred.promise();
		},

		/**
		 * Ensure customize settings for a given item.
		 *
		 * @param {Backbone.Model} item FeaturedItem model.
		 * @returns {void}
		 */
		ensureSettings: function ensureSettings( item ) {
			var panel = this, Setting, properties;

			// Flatten the REST resource and remove the readonly attributes. TODO: This should be schema-driven.
			properties = _.clone( item.attributes );
			delete properties._embedded;
			delete properties._links;
			delete properties.id;
			properties.title = properties.title.raw;

			Setting = Setting = api.settingConstructor.featured_item_property;
			_.each( properties, function( propertyValue, propertyName ) {
				var setting, settingId;
				settingId = panel.getPropertySettingId( item.id, propertyName );
				setting = api( settingId );
				if ( ! setting ) {
					setting = new Setting( settingId, propertyValue, {
						transport: 'postMessage',
						previewer: api.previewer,
						dirty: item.hasChanged()
					} );
					api.add( settingId, setting );
				}

				// Send the setting to the preview to ensure it exists there.
				setting.previewer.send( 'setting', [ setting.id, setting() ] );
			} );
		},

		/**
		 * Compute ID for a featured item section.
		 *
		 * @param {int} itemId - Featured item ID.
		 * @returns {string} Section ID.
		 */
		getSectionId: function( itemId ) {
			if ( 'number' !== typeof itemId ) {
				throw new Error( 'Expected itemId as number' );
			}
			return 'featured_item[' + String( itemId ) + ']';
		},

		/**
		 * Compute ID for a featured item section.
		 *
		 * @todo Move to base namespace?
		 *
		 * @param {int} itemId - Featured item ID.
		 * @param {string} propertyName - Property name.
		 * @returns {string} Setting ID.
		 */
		getPropertySettingId: function( itemId, propertyName ) {
			if ( 'number' !== typeof itemId ) {
				throw new Error( 'Expected itemId as number' );
			}
			if ( 'string' !== typeof propertyName ) {
				throw new Error( 'Expected propertyName as string' );
			}
			return 'featured_item[' + String( itemId ) + '][' + propertyName + ']';
		},

		/**
		 * Get the setting property for a given featured item ID.
		 *
		 * @todo Move to base namespace?
		 *
		 * @param {int} itemId - Featured item ID.
		 * @param {string} propertyName - Property name.
		 * @returns {wp.customize.Setting|null} Setting or null if it doesn't exist.
		 */
		getPropertySetting: function getPropertySetting( itemId, propertyName ) {
			var panel = this;
			return api( panel.getPropertySettingId( itemId, propertyName ) ) || null;
		},

		/**
		 * Add a section for a featured item.
		 *
		 * @param {panel.FeaturedItem} item - Featured item.
		 * @returns {wp.customize.Section} Added section (or existing section if it already existed).
		 */
		ensureSection: function ensureSection( item ) {
			var panel = this, section, sectionId, Section;

			// Strip off property component from setting ID to obtain section ID.
			sectionId = panel.getSectionId( item.id );

			if ( api.section.has( sectionId ) ) {
				return api.section( sectionId );
			}

			Section = api.sectionConstructor.featured_item;
			section = new Section( sectionId, {
				params: {
					id: sectionId,
					panel: panel.id,
					active: true,
					item: item
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
		},

		/**
		 * Purge the trashed items.
		 *
		 * This is called when the changeset is published.
		 *
		 * @returns {void}
		 */
		purgeTrashedItems: function purgeTrashedItems() {
			var panel = this, removedItems = [];

			panel.itemsCollection.each( function( item ) { // eslint-disable-line complexity
				var section, statusSetting;
				statusSetting = panel.getPropertySetting( item.id, 'status' );
				if ( ! statusSetting || 'trash' !== statusSetting.get() ) {
					return;
				}

				// Remove the section (reverse of ensureSection).
				section = api.section( panel.getSectionId( item.id ) );
				if ( section ) {
					panel.removeSection( section );
				}

				// Purge the settings associated the section (reverse of ensureSettings).
				_.each( _.keys( item.attributes ), function( propertyName ) {
					api.remove( panel.getPropertySettingId( item.id, propertyName ) );
				} );

				removedItems.push( item );
			} );

			// Finally remove the reference to the item.
			panel.itemsCollection.remove( removedItems );
		},

		/**
		 * Remove section.
		 *
		 * @param {wp.customize.Section} section Section to remove.
		 * @returns {void}
		 */
		removeSection: function removeSection( section ) {

			// Collapse the section before removing its contents.
			section.collapse( {
				completeCallback: function() {

					// Remove all controls in the section.
					_.each( section.controls(), function( control ) {
						api.control.remove( control.id );
						control.container.remove(); // Core should do this automatically. See <https://core.trac.wordpress.org/ticket/31334>.
					} );

					// Remove the section.
					section.container.remove(); // Core should do this automatically. See <https://core.trac.wordpress.org/ticket/31334>.
					api.section.remove( section.id );
				}
			} );
		}
	});

})( wp.customize, jQuery );
