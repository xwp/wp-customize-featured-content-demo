/* global wp */
/* eslint consistent-this: [ "error", "control" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.controlConstructor.featured_item_field = (function( api ) {
	'use strict';

	/**
	 * A control for managing the status.
	 *
	 * @class
	 * @augments wp.customize.Section
	 * @augments wp.customize.Class
	 */
	return api.Control.extend({

		defaults: _.extend(
			{},
			api.Control.prototype.defaults,
			{
				placeholder: ''
			}
		),

		/**
		 * Constructor.
		 *
		 * @param {string} id - Control ID.
		 * @param {Object} options - Options.
		 * @returns {void}
		 */
		initialize: function( id, options ) {
			var control = this;
			control.placeholder = new api.Value();
			api.Control.prototype.initialize.call( control, id, options );
		},

		/**
		 * @inheritdoc
		 */
		ready: function() {
			var control = this;
			api.Control.prototype.ready.call( control );

			// Allow methods to be passed around with context retained.
			_.bindAll( control, 'updatePlaceholder' );

			// Update input placeholder when the placeholder state changes.
			control.placeholder.bind( control.updatePlaceholder );
			control.placeholder.set( control.params.placeholder );
			control.updatePlaceholder();
		},

		/**
		 * Update the input placeholder.
		 *
		 * @returns {void}
		 */
		updatePlaceholder: function updatePlaceholder() {
			var control = this;
			control.elements[0].element.prop( 'placeholder', control.placeholder.get() );
		}
	});

})( wp.customize );
