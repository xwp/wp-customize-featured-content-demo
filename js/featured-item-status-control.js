/* global wp */
/* eslint consistent-this: [ "error", "control" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.controlConstructor.featured_item_status = (function( api, $ ) {
	'use strict';

	/**
	 * A control for managing the status.
	 *
	 * @class
	 * @augments wp.customize.Section
	 * @augments wp.customize.Class
	 */
	return api.Control.extend({

		/**
		 * Constructor.
		 *
		 * @param {string} id - Partial ID.
		 * @param {Object} options - Options.
		 */
		initialize: function( id, options ) {
			var control = this, args;

			args = options ? _.clone( options ) : {};
			args.params = _.extend(
				{
					type: 'featured_item_status'
				},
				args.params
			);

			// @todo Core should do this automatically.
			if ( ! args.params.content ) {
				args.params.content = $( '<li></li>' );
				args.params.content.attr( 'id', 'customize-control-' + id.replace( /]/g, '' ).replace( /\[/g, '-' ) );
				args.params.content.attr( 'class', 'customize-control customize-control-' + args.params.type );
			}

			api.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this;
			api.Control.prototype.ready.call( control );

			control.toggleTrashedButton = control.container.find( '.toggle-trashed:first' );
			control.updateButton();
			control.setting.bind( function() {
				control.updateButton();
			} );
			control.toggleTrashedButton.on( 'click', function() {
				control.setting.set( 'publish' === control.setting.get() ? 'trash' : 'publish' );
			} );
		},

		/**
		 * Update trash/untrash toggle button.
		 */
		updateButton: function updateButton() {
			var control = this, isTrashed;
			isTrashed = 'trash' === control.setting.get();
			control.toggleTrashedButton.find( '.trash' ).toggle( ! isTrashed );
			control.toggleTrashedButton.find( '.untrash' ).toggle( isTrashed );
		}
	});

})( wp.customize, jQuery );
