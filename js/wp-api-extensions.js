(function() {
	'use strict';

	/**
	 * Build a helper function to retrieve related model.
	 *
	 * This is forked from wp-api.js, which also does not expose buildModelGetter publicly.
	 * @link https://github.com/WordPress/wordpress-develop/blob/acd6d129b928663a5b4ce1616e25819ccf666f4e/src/wp-includes/js/wp-api.js#L288-L340
	 *
	 * @param  {Backbone.Model} parentModel      The parent model.
	 * @param  {int}            modelId          The model ID if the object to request
	 * @param  {string}         modelName        The model name to use when constructing the model.
	 * @param  {string}         embedSourcePoint Where to check the embedds object for _embed data.
	 * @param  {string}         embedCheckField  Which model field to check to see if the model has data.
	 * @return {Deferred.promise}        A promise which resolves to the constructed model.
	 */
	wp.api.utils._buildModelGetter = function buildModelGetter( parentModel, modelId, modelName, embedSourcePoint, embedCheckField ) { // eslint-disable-line max-params, complexity
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
				success: function( model ) {
					/* >>>>>>>>>>>> BEGIN PATCH TO CACHE EMBEDDED */
					var updatedEmbeddeds = _.clone( parentModel.get( '_embedded' ) || {} );
					if ( ! updatedEmbeddeds[ embedSourcePoint ] ) {
						updatedEmbeddeds[ embedSourcePoint ] = [];
					}
					updatedEmbeddeds[ embedSourcePoint ].push( model.attributes );
					parentModel.set( '_embedded', updatedEmbeddeds );
					/* <<<<<<<<<<<<< END PATCH TO CACHE EMBEDDED */

					deferred.resolve( model );
				},
				error: function( model, response ) {
					deferred.reject( response );
				}
			} );
		} else {

			// Resolve with the embedded model.
			deferred.resolve( getModel );
		}

		// Return a promise.
		return deferred.promise();
	};
})();
