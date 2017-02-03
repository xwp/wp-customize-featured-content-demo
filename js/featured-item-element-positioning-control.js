/* global wp */
/* eslint consistent-this: [ "error", "control" ], no-magic-numbers: [ "error", { "ignore": [-1,0,1] } ] */

wp.customize.controlConstructor.featured_item_element_positioning = (function( api, $ ) {
	'use strict';

	/**
	 * A control for managing the element positioning.
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
					type: 'featured_item_element_positioning'
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

			control.positionElements = {};
			_.each( [ 'left', 'top' ], function( dimension ) {
				var elementModel = new api.Element( control.container.find( 'input.' + dimension ) );
				elementModel.validate = function( value ) {
					return String( value ); // Prevent *integer* setting value from triggering change to *string* element value.
				};
				elementModel.set( control.settings[ dimension ].get() );
				elementModel.sync( control.settings[ dimension ] );
				elementModel.element.on( 'input', elementModel.refresh ); // Core should be adding input event support.
				control.positionElements[ dimension ] = elementModel;
			} );
		}
	});

})( wp.customize, jQuery );
