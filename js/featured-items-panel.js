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

			panel.injectAdditionButton();
			panel.setupSectionSorting();
			api.bind( 'ready', function() { // Because api.state is not read until then.
				panel.loadItems();
				panel.handleChagesetPublish();
			} );

			// @todo Core should be doing this automatically. See <https://core.trac.wordpress.org/ticket/39663>.
			panel.active.bind( function( isActive ) {
				if ( ! isActive ) {
					panel.collapse();
				}
			} );
		},

		/**
		 * Load items.
		 *
		 * @todo Defer this until the panel is expanded? Lazy loaded when needed? But then partials in preview won't be initialized.
		 *
		 * @returns {void}
		 */
		loadItems: function loadItems() {
			var panel = this, reject, deferred = $.Deferred();
			reject = function( err ) {
				deferred.reject( err );
			};
			wp.api.init().fail( reject ).done( function() {
				var FeaturedItems, queryParams;
				FeaturedItems = wp.api.collections['Featured-items']; // @todo Add better mapping.
				if ( ! FeaturedItems ) {
					deferred.reject( 'Missing collection for featured-items.' );
					return;
				}

				panel.itemsCollection = new FeaturedItems();

				// Ensure customized state is applied in the response.
				queryParams = api.previewer.query();
				delete queryParams.customized; // No POST data would be queued for saving to changeset.
				queryParams._embed = true;

				panel.itemsCollection.fetch( { data: queryParams } ).fail( reject ).done( function() {
					panel.itemsCollection.each( function( item ) {
						panel.ensureSettings( item );
					} );
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
		injectAdditionButton: function injectAdditionButton() {
			var panel = this, container, button, additionFailure;

			container = $( wp.template( 'featured-items-customize-panel-addition-ui' )() );
			button = container.find( 'button' );
			additionFailure = container.find( '.addition-failure' );
			button.on( 'click', function() {
				var promise = panel.createItem();
				button.prop( 'disabled', true );
				button.addClass( 'progress' );
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
					button.prop( 'disabled', false );
					button.removeClass( 'progress' );
				} );
			} );

			panel.contentContainer.find( '.panel-meta:first' ).append( container );
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
		 * Create featured item for the customized state.
		 *
		 * @returns {jQuery.promise} Resolves with section object and the item model created.
		 */
		createItem: function createItem() {
			var panel = this, deferred = $.Deferred(), reject, FeaturedItem, item;

			reject = function() {
				deferred.reject();
			};

			FeaturedItem = wp.api.models['Featured-items'];
			item = new FeaturedItem( { status: 'auto-draft' } );
			item.save().fail( reject ).done( function() {
				var sectionId;
				item.set( { status: 'publish' } );

				// Bump all existing featured items up in position so the new item will be added to the top (first).
				// @todo This can now instead do: panel.itemsCollection.each( function( item ) { if ( item.id !== id ): item.customizeSettings.property.set( item.customizeSettings.property.get() + 1 ); } );
				api.each( function( setting ) {
					if ( setting.extended( api.settingConstructor.featured_item_property ) && 'position' === setting.property ) {
						setting.set( setting.get() + 1 );
					}
				} );

				panel.ensureSettings( item, { dirty: true } );
				panel.itemsCollection.add( item );

				// Resolve once the section exists. The section will be added via handleSettingAddition.
				sectionId = 'featured_item[' + String( item.id ) + ']';
				api.section( sectionId, function( section ) {
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
		 * @param {Backbone.Model} item    FeaturedItem model.
		 * @param {object}         [options] Options.
		 * @param {Boolean}        [options.dirty=false] Whether created settings will be marked as dirty.
		 * @returns {void}
		 */
		ensureSettings: function ensureSettings( item, options ) {
			var Setting, properties, args;

			args = _.extend( { dirty: false }, options );

			// Flatten the REST resource and remove the readonly attributes.
			properties = _.clone( item.attributes );
			delete properties._embedded;
			delete properties._links;
			delete properties.id;
			properties.title = properties.title.raw;
			properties.excerpt = properties.excerpt.raw;

			// @todo Is this even necessary to keep?
			if ( ! item.customizeSettings ) {
				item.customizeSettings = {};
			}

			Setting = Setting = api.settingConstructor.featured_item_property;
			_.each( properties, function( propertyValue, propertyName ) {
				var setting, settingId;
				settingId = 'featured_item[' + String( item.id ) + '][' + propertyName + ']';
				setting = api( settingId );
				if ( ! setting ) {

					// @todo Params here are not DRY with what is defined in Featured_Item_Property_Customize_Setting.
					setting = new Setting( settingId, propertyValue, {
						type: 'featured_item_property',
						transport: 'postMessage',
						previewer: api.previewer,
						dirty: args.dirty
					} );
					api.add( settingId, setting );
					if ( args.dirty ) {
						setting.preview(); // Make sure setting is sent to the preview.
					}
				}

				item.customizeSettings[ propertyName ] = setting;
				setting.wpApiModel = item;
			} );
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
		},

		/**
		 * Handle publishing (saving) of changeset.
		 *
		 * @returns {void}
		 */
		handleChagesetPublish: function handleChagesetPublish() {
			var panel = this;
			api.state( 'changesetStatus' ).bind( function( newStatus ) {
				if ( 'publish' !== newStatus ) {
					return;
				}

				api.section.each( function( section ) {
					if ( section.extended( api.sectionConstructor.featured_item ) && api.has( section.id + '[status]' ) && 'trash' === api( section.id + '[status]' ).get() ) {
						panel.removeSection( section );
					}
				} );
			} );
		},

		/**
		 * Remove section.
		 *
		 * @param {wp.customize.Section} section Section to remove.
		 * @returns {void}
		 */
		removeSection: function removeSection( section ) {
			section.collapse();
			section.container.remove();
			section.panel.set( '' );
			api.section.remove( section.id );
		}

	});

})( wp.customize, jQuery );
