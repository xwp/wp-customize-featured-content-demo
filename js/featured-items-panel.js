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

			if ( ! _.isObject( panel.params.default_item_property_setting_params ) ) {
				throw new Error( 'Missing default_item_property_setting_params params.' );
			}

			_.bindAll( panel, 'handleSettingAddition' );
			api.each( panel.handleSettingAddition );
			api.bind( 'add', panel.handleSettingAddition );

			panel.injectAdditionButton();
			panel.setupSectionSorting();
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
		 * Create auto-draft.
		 *
		 * @returns {jQuery.promise} Promise resolving with the post ID.
		 */
		insertAutoDraft: function insertAutoDraft() {
			var deferred = $.Deferred(), reject;

			reject = function() {
				deferred.reject();
			};

			wp.api.init().fail( reject ).done( function() {
				var FeaturedItem, item;
				if ( ! wp.api.models['Featured-items'] ) {
					reject();
				}
				FeaturedItem = wp.api.models['Featured-items']; // @todo Add better mapping.
				item = new FeaturedItem();
				item.save( { status: 'auto-draft' }, {
					success: function( savedItem ) {
						deferred.resolve( savedItem.id );
					},
					error: reject
				} );
			} );

			return deferred.promise();
		},

		/**
		 * Create featured item for the customized state.
		 *
		 * @returns {jQuery.promise} Resolves with section object and object containing the property settings.
		 */
		createItem: function createItem() {
			var panel = this, deferred = $.Deferred(), autoDraft;

			autoDraft = panel.insertAutoDraft();
			autoDraft.fail( function() {
				deferred.reject();
			} );
			autoDraft.done( function createSettings( id ) {
				var sectionId, propertySettings;

				// Bump all existing featured items up in position so the new item will be added to the top (first).
				api.each( function( setting ) {
					if ( setting.extended( api.settingConstructor.featured_item_property ) && 'position' === setting.property ) {
						setting.set( setting.get() + 1 );
					}
				} );

				// Ensure settings for the auto-draft item are created.
				propertySettings = panel.ensureItemPropertySettings( id );

				// Resolve once the section exists. The section will be added via handleSettingAddition.
				sectionId = 'featured_item[' + String( id ) + ']';
				api.section( sectionId, function( section ) {
					deferred.resolve( {
						section: section,
						propertySettings: propertySettings
					} );
				} );
			} );

			return deferred.promise();
		},

		/**
		 * Ensure item property settings.
		 *
		 * Create a new featured_item_property setting if one doesn't already exist.
		 *
		 * @param {string} id Featured item ID.
		 * @returns {object} Mapping field ID to the field property settings.
		 */
		ensureItemPropertySettings: function ensureItemPropertySettings( id ) {
			var panel = this, Setting, propertySettings = {};
			Setting = api.settingConstructor.featured_item_property;
			_.each( panel.params.default_item_property_setting_params, function( params, fieldId ) {
				var setting, settingId;
				settingId = 'featured_item[' + String( id ) + '][' + fieldId + ']';
				setting = api( settingId );
				if ( ! setting ) {
					setting = new Setting( settingId, null, _.extend( {},
						params,
						{ previewer: api.previewer }
					) );
					setting = api.add( settingId, setting );
					setting.set( params.value ); // Mark dirty.
				}
				propertySettings[ fieldId ] = setting;
			} );
			return propertySettings;
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
