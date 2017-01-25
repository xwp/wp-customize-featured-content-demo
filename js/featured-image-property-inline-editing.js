/* global wp */
/* eslint consistent-this: [ "error", "component" ] */
wp.customize.featuredContent.PropertyInlineEditing = (function( api, $ ) {
	'use strict';

	/**
	 * @class
	 */
	return api.Class.extend( {

		/**
		 * Initialize.
		 *
		 * @constructor
		 * @param {object} args
		 * @param {wp.customize.selectiveRefresh.Placement} args.placement - Placement.
		 * @param {string}                                  args.selector  - Selector for the container being edited.
		 * @param {string}                                  args.property  - Name of setting property.
		 * @returns {void}
		 */
		initialize: function initialize( args ) {
			var component = this;
			component.placement = args.placement;
			component.container = component.placement.container.find( args.selector );
			component.property = args.property;
			component.editing = new api.Value( false );
		},

		/**
		 * Add event listeners.
		 *
		 * @returns {void}
		 */
		addEventHandlers: function addEventHandlers() {
			var component = this;

			component.container.on( 'click', function handleClick( event ) {
				if ( component.editing.get() ) {
					event.preventDefault();
					event.stopPropagation(); // Currently needed for click.prevent event handler. TODO: Core should check if event.isDefaultPrevented().
				} else if ( event.shiftKey ) {
					component.start();
					event.preventDefault();
					event.stopPropagation(); // Prevent focusing on control.
				}
			} );

			component.container.on( 'blur', function handleBlur() {
				if ( component.editing.get() ) {
					component.finish();
				}
			} );

			component.container.on( 'keydown', function handleKeydown( event ) {
				var enterKey = 13, escKey = 27;
				if ( component.editing.get() && ( enterKey === event.keyCode || escKey === event.keyCode ) ) {
					component.finish();
				}
			} );

			component.container.on( 'input', function handleInput() {
				var value;
				if ( ! component.editing.get() ) {
					return;
				}
				value = component.container.text();

				component.getSetting().set( value );
				component.dirty = true;

				/*
				 * Send the setting value to the parent window so that it will
				 * be saved into the changeset and be able to be published.
				 * Normally settings are only synced from the controls into the preview
				 * and not the other way around. For inline editing, however, setting
				 * changes can be made in the preview and they then need to be synced
				 * back up to the controls pane. This is an implementation of #29288:
				 * Settings updated within the Customizer Preview are not synced up to main app Panel
				 * https://core.trac.wordpress.org/ticket/29288
				 *
				 * See corresponding code that receives the setting in:
				 * wp.customize.sectionConstructor.featured_item.prototype.addTitleControl
				 */
				api.preview.send( 'setting', [ component.getSetting().id, value ] );
			} );
		},

		/**
		 * Start inline editing.
		 *
		 * @returns {void}
		 */
		start: function start() {
			var component = this, setting = component.getSetting();
			if ( ! setting || component.editing.get() ) {
				return;
			}
			component.editing.set( true );
			component.container.prop( 'contentEditable', 'true' );
			component.previousRendered = component.container.html();
			component.container.text( setting.get() || $.trim( component.container.text() ) );
			component.container.focus();

			// Suspend selective refresh updates to title while inline editing.
			component.placement.partial.params.settings = _.without(
				component.placement.partial.params.settings,
				setting.id
			);
		},

		/**
		 * Get the setting for the property.
		 *
		 * @return {wp.customize.Value|null}
		 */
		getSetting: function getSetting() {
			var component = this;
			return api( component.placement.partial.id + '[' + component.property + ']' ) || null;
		},

		/**
		 * Finish inline editing.
		 *
		 * @returns {void}
		 */
		finish: function finish() {
			var component = this, setting;
			if ( ! component.editing.get() ) {
				return;
			}
			component.editing.set( false );
			setting = component.getSetting();
			component.container.prop( 'contentEditable', 'false' );

			if ( component.dirty ) {
				component.placement.partial.refresh();
				component.dirty = false;
			} else {
				component.container.html( component.previousRendered );
			}

			// Restore selective refresh once completed.
			component.placement.partial.params.settings.push( setting.id );
		}
	} );
})( wp.customize, jQuery );
