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

		/**
		 * Ready.
		 *
		 * @returns {void}
		 */
		ready: function() {
			var panel = this, onceActive;
			api.Panel.prototype.ready.call( panel );

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
		 * Return whether this panel has any active sections.
		 *
		 * @inheritDoc
		 *
		 * Since new featured items can be created from from the empty panel,
		 * it should always be active.
		 *
		 * @return {boolean}
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

			panel.injectAdditionButton();
			panel.setupSectionSorting();

			// Purge trashed items when the changeset is published.
			api.bind( 'saved', function( data ) {
				if ( 'publish' === data.changeset_status ) {
					panel.purgeTrashedItems();
				}
			} );

			// @todo Show error when the collection request fails.
			panel.loading.set( true ); // Show spinner with addition button disabled.
			panel.loadItems().done( function() {
				panel.loading.set( false ); // Hide spinner and enable addition button.
			} );
		},

		/**
		 * Load items.
		 *
		 * @returns {void}
		 */
		loadItems: function loadItems() {
			var panel = this, reject, deferred = $.Deferred();
			reject = function( err ) {
				deferred.reject( err );
			};
			wp.api.init().fail( reject ).done( function() {
				var queryParams, modelName = 'Featured-items';
				if ( ! wp.api.collections[ modelName ] || ! wp.api.models[ modelName ] ) {
					deferred.reject( 'Missing collection for featured-items.' );
					return;
				}
				panel.FeaturedItem = wp.api.models[ modelName ];

				/**
				 * Get related post.
				 *
				 * @this {Backbone.Model}
				 * @return {Deferred.promise}
				 */
				panel.FeaturedItem.prototype.getRelatedPost = function getRelatedPost() {
					var item = this; // eslint-disable-line consistent-this
					return panel.buildModelGetter(
						item,
						item.get( 'related' ),
						'Post',
						'related',
						'title'
					);
				};

				panel.itemsCollection = new wp.api.collections[ modelName ]();
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
		 * @returns {jQuery}
		 */
		injectAdditionButton: function injectAdditionButton() {
			var panel = this, container, button, additionFailure;

			container = $( wp.template( 'featured-items-customize-panel-addition-ui' )() );
			button = container.find( 'button' );
			additionFailure = container.find( '.addition-failure' );
			button.on( 'click', function() {
				var promise = panel.createItem();
				panel.loading.set( true );
				additionFailure.slideUp();
				promise.fail( function() {
					additionFailure.stop().slideDown();
					wp.a11y.speak( additionFailure.text() );
				} );
				promise.done( function( createdItem ) {
					createdItem.section.expand();
					_.defer( function() {
						var firstControl = _.first( createdItem.section.controls() );
						if ( firstControl ) {
							firstControl.focus();
						}
					} );
				} );
				promise.always( function() {
					panel.loading.set( false );
				} );
			} );

			panel.contentContainer.find( '.panel-meta:first' ).append( container );

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
				panel.itemsCollection.each( function( item ) {
					var positionSetting = panel.getPropertySetting( item.id, 'position' );
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
			properties.excerpt = properties.excerpt.raw;

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

			panel.itemsCollection.each( function( item ) {
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
		},

		/**
		 * Build a helper function to retrieve related model.
		 *
		 * This is forked from wp-api.js
		 *
		 * @param  {Backbone.Model} parentModel      The parent model.
		 * @param  {int}            modelId          The model ID if the object to request
		 * @param  {string}         modelName        The model name to use when constructing the model.
		 * @param  {string}         embedSourcePoint Where to check the embedds object for _embed data.
		 * @param  {string}         embedCheckField  Which model field to check to see if the model has data.
		 * @return {Deferred.promise}        A promise which resolves to the constructed model.
		 */
		buildModelGetter: function buildModelGetter( parentModel, modelId, modelName, embedSourcePoint, embedCheckField ) {
			var getModel, embeddeds, attributes, deferred;

			deferred  = jQuery.Deferred();
			embeddeds = parentModel.get( '_embedded' ) || {};

			// Verify that we have a valid object id.
			if ( ! _.isNumber( modelId ) || 0 === modelId ) {
				deferred.reject();
				return deferred;
			}

			// If we have embedded object data, use that when constructing the getModel.
			if ( embeddeds[ embedSourcePoint ] ) {
				attributes = _.findWhere( embeddeds[ embedSourcePoint ], { id: modelId } );
			}

			// Otherwise use the modelId.
			if ( ! attributes ) {
				attributes = { id: modelId };
			}

			// Create the new getModel model.
			getModel = new wp.api.models[ modelName ]( attributes );

			if ( ! getModel.get( embedCheckField ) ) {
				getModel.fetch( {
					success: function( getModel ) {
						/* >>>>>>>>>>>> BEGIN PATCH TO CACHE EMBEDDED */
						var updatedEmbeddeds = _.clone( parentModel.get( '_embedded' ) || {} );
						if ( ! updatedEmbeddeds[ embedSourcePoint ] ) {
							updatedEmbeddeds[ embedSourcePoint ] = [];
						}
						updatedEmbeddeds[ embedSourcePoint ].push( getModel.attributes );
						parentModel.set( '_embedded', updatedEmbeddeds );
						/* <<<<<<<<<<<<< END PATCH TO CACHE EMBEDDED */

						deferred.resolve( getModel );
					},
					error: function( getModel, response ) {
						deferred.reject( response );
					}
				} );
			} else {

				// Resolve with the embedded model.
				deferred.resolve( getModel );
			}

			// Return a promise.
			return deferred.promise();
		}

	});

})( wp.customize, jQuery );
