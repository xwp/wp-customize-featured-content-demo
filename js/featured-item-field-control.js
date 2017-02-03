/* global wp */
/* eslint consistent-this: [ "error", "control" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.controlConstructor.featured_item_field = (function( api, $ ) {
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
		 * @param {string} id - Control ID.
		 * @param {Object} options - Options.
		 */
		initialize: function( id, options ) {
			var control = this, args;

			args = options ? _.clone( options ) : {};
			args.params = _.extend(
				{
					type: 'featured_item_field',
					placeholder: ''
				},
				args.params
			);

			// @todo Core should do this automatically.
			if ( ! args.params.content ) {
				args.params.content = $( '<li></li>' );
				args.params.content.attr( 'id', 'customize-control-' + id.replace( /]/g, '' ).replace( /\[/g, '-' ) );
				args.params.content.attr( 'class', 'customize-control customize-control-' + args.params.type );
			}

			/*
			 * State to manage the input placeholder value.
			 * Note that currently this has to be set before initialize is called
			 * because if the setting already exists it will call ready immediately.
			 */
			control.placeholder = new api.Value( args.params.placeholder );

			api.Control.prototype.initialize.call( control, id, args );
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this;
			api.Control.prototype.ready.call( control );

			// Allow methods to be passed around with context retained.
			_.bindAll( control, 'updatePlaceholder' );

			control.inputElement = new api.Element( control.container.find( ':input:first' ) );
			control.inputElement.set( control.setting.get() );
			control.inputElement.sync( control.setting );

			// Update input placeholder when the placeholder state changes.
			control.placeholder.bind( control.updatePlaceholder );
			control.updatePlaceholder();
		},

		/**
		 * Update the input placeholder.
		 *
		 * @returns {void}
		 */
		updatePlaceholder: function updatePlaceholder() {
			var control = this;
			control.inputElement.element.prop( 'placeholder', control.placeholder.get() );
		}
	});

})( wp.customize, jQuery );
