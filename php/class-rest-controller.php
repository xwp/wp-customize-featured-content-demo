<?php
/**
 * Class REST_Controller.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class REST_Controller
 *
 * @package Customize_Featured_Content_Demo
 */
class REST_Controller extends \WP_REST_Posts_Controller {

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Constructor.
	 *
	 * @throws \Exception If the post type registration fails to include the plugin instance.
	 *
	 * @param string $post_type Post type.
	 */
	public function __construct( $post_type ) {
		parent::__construct( $post_type );

		/*
		 * The following is needed because WP_REST_Controllers do not support
		 * constructor dependency injection, and so the reference to the plugin
		 * is sourced from the registered post type object.
		 */
		$post_type_obj = get_post_type_object( $post_type );
		if ( empty( $post_type_obj ) || ! isset( $post_type_obj->plugin ) || ! ( $post_type_obj->plugin instanceof Plugin ) ) {
			throw new \Exception( 'Missing plugin instance on custom post type object.' );
		}
		$this->plugin = $post_type_obj->plugin;
		$this->plugin->rest_controller = $this;
	}

	/**
	 * Registers the routes for the objects of the controller.
	 */
	public function register_routes() {

		register_rest_route( $this->namespace, '/' . $this->rest_base, array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_items' ),
				'permission_callback' => array( $this, 'get_items_permissions_check' ),
				'args'                => $this->get_collection_params(),
			),
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_item' ),
				'permission_callback' => array( $this, 'create_item_permissions_check' ),
				'args'                => $this->get_endpoint_args_for_item_schema( \WP_REST_Server::CREATABLE ),
			),
			'schema' => array( $this, 'get_public_item_schema' ),
		) );

		$get_item_args = array(
			'context'  => $this->get_context_param( array( 'default' => 'view' ) ),
		);
		register_rest_route( $this->namespace, '/' . $this->rest_base . '/(?P<id>[\d]+)', array(
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_item' ),
				'permission_callback' => array( $this, 'get_item_permissions_check' ),
				'args'                => $get_item_args,
			),
			array(
				'methods'             => \WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_item' ),
				'permission_callback' => array( $this, 'update_item_permissions_check' ),
				'args'                => $this->get_endpoint_args_for_item_schema( \WP_REST_Server::EDITABLE ),
			),
			array(
				'methods'             => \WP_REST_Server::DELETABLE,
				'callback'            => array( $this, 'delete_item' ),
				'permission_callback' => array( $this, 'delete_item_permissions_check' ),
				'args'                => array(
					'force' => array(
						'type'        => 'boolean',
						'default'     => false,
						'description' => __( 'Whether to bypass trash and force deletion.', 'default' ),
					),
				),
			),
			'schema' => array( $this, 'get_public_item_schema' ),
		) );
	}

	/**
	 * Computed item schema.
	 *
	 * @var array
	 */
	protected $_item_schema;

	/**
	 * Retrieves the item's schema, conforming to JSON Schema.
	 *
	 * @return array Item schema data.
	 */
	public function get_item_schema() {
		if ( ! isset( $this->_item_schema ) ) {
			$this->_item_schema = array(
				'$schema' => 'http://json-schema.org/schema#',
				'title' => Model::POST_TYPE,
				'type' => 'object',
				'properties' => array_map(
					array( $this, 'prepare_rest_item_field_schema' ),
					$this->plugin->model->get_item_schema_properties()
				),
			);
		}
		return $this->_item_schema;
	}

	/**
	 * Convert the model field schema into a REST field schema.
	 *
	 * @param array $model_field_schema Field schema from the model.
	 * @return array Field schema prepared for REST controller.
	 */
	protected function prepare_rest_item_field_schema( $model_field_schema ) {
		$rest_field_schema = $model_field_schema;

		$rest_field_schema['arg_options']['validate_callback'] = function ( $value, $request, $key ) use ( $model_field_schema ) {
			unset( $request );
			if ( isset( $model_field_schema['arg_options']['validate_callback'] ) ) {
				return call_user_func( $model_field_schema['arg_options']['validate_callback'], $value, $model_field_schema, $key );
			} else {
				return rest_validate_value_from_schema( $value, $model_field_schema, $key );
			}
		};

		$rest_field_schema['arg_options']['sanitize_callback'] = function ( $value, $request, $key ) use ( $model_field_schema ) {
			unset( $request, $key );
			if ( isset( $model_field_schema['arg_options']['sanitize_callback'] ) ) {
				return call_user_func( $model_field_schema['arg_options']['sanitize_callback'], $value, $model_field_schema );
			} else {
				return rest_sanitize_value_from_schema( $value, $model_field_schema );
			}
		};

		// Allow scalar value to be supplied as well as raw/rendered object.
		if ( isset( $rest_field_schema['arg_options']['rendering'] ) ) {
			$raw_field_schema = $rest_field_schema;

			$rest_field_schema = array(
				'type' => 'object', // Well, it also allows a string.
				'context' => array( 'view', 'edit', 'embed' ),
				'properties' => array(
					'raw' => array_merge(
						$rest_field_schema,
						array(
							'context' => array( 'view', 'edit', 'embed' ),
						)
					),
					'rendered' => array_merge(
						$rest_field_schema,
						array(
							'readonly' => true,
							'context' => array( 'edit' ),
						)
					),
				),
				'arg_options' => array(
					'validate_callback' => function ( $value, $request, $field_id ) use ( $raw_field_schema ) {
						if ( is_array( $value ) && isset( $value['raw'] ) ) {
							$value = $value['raw'];
						}
						return call_user_func( $raw_field_schema['arg_options']['validate_callback'], $value, $request, $field_id );
					},
					'sanitize_callback' => function ( $value, $request, $field_id ) use ( $raw_field_schema ) {
						if ( is_array( $value ) && isset( $value['raw'] ) ) {
							$value = $value['raw'];
						}
						return call_user_func( $raw_field_schema['arg_options']['sanitize_callback'], $value, $request, $field_id );
					},
				),
			);
		} // End if().
		return $rest_field_schema;
	}

	/**
	 * Prepares a single post output for response.
	 *
	 * @param \WP_Post         $post    Post object.
	 * @param \WP_REST_Request $request Request object.
	 * @return \WP_REST_Response Response object.
	 */
	public function prepare_item_for_response( $post, $request ) {
		$GLOBALS['post'] = $post;
		setup_postdata( $post ); // Needed for some filters that apply.

		$model_item_schema = $this->plugin->model->get_item_schema_properties();

		$item = array();
		$item_data = $this->plugin->model->get_item( $post );
		foreach ( $model_item_schema as $field_id => $field_schema ) {
			if ( isset( $field_schema['arg_options']['rendering'] ) ) {
				$property = array(
					'raw' => $item_data[ $field_id ],
					'rendered' => $item_data[ $field_id ],
				);
				if ( isset( $field_schema['arg_options']['rendering']['callback'] ) ) {
					$property['rendered'] = call_user_func(
						$field_schema['arg_options']['rendering']['callback'],
						$property['rendered'],
						$post->ID
					);
				}
			} else {
				$property = $item_data[ $field_id ];
			}
			$item[ $field_id ] = $property;
		}

		$context = ! empty( $request['context'] ) ? $request['context'] : 'view';
		$item = $this->filter_response_by_context( $item, $context );

		// Wrap the data in a response object.
		$response = rest_ensure_response( $item );

		$response->add_links( $this->prepare_links( $post ) );

		$related_post = $item['related'] ? get_post( $item['related'] ) : null;
		if ( $related_post ) {
			$post_type_obj = get_post_type_object( $related_post->post_type );
			$rest_base = $post_type_obj && ! empty( $post_type_obj->rest_base ) ? $post_type_obj->rest_base : $related_post->post_type;
			$response->add_links( array(
				'related' => array(
					array(
						'href' => rest_url( sprintf( 'wp/v2/%s/%d', $rest_base, $related_post->ID ) ),
						'embeddable' => true,
					),
				),
			) );
		}

		wp_reset_postdata();
		return $response;
	}

	/**
	 * Checks if a given request has access to read posts.
	 *
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return true|\WP_Error True if the request has read access, WP_Error object otherwise.
	 */
	public function get_items_permissions_check( $request ) {
		$validity = parent::get_items_permissions_check( $request );
		if ( is_wp_error( $validity ) ) {
			return $validity;
		}
		if ( count( $request['with_trashed'] ) && ! current_user_can( $this->plugin->model->object->cap->delete_posts ) ) {
			return new \WP_Error( 'forbidden_with_trashed_param', __( 'You are not allowed to access trashed items.', 'customize-featured-content-demo' ), array( 'status' => rest_authorization_required_code() ) );
		}
		return true;
	}

	/**
	 * Retrieves a collection of items.
	 *
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response|\WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function get_items( $request ) {
		$items = $this->plugin->model->get_items();
		$response_items = array();

		$item_ids = array_keys( $items );
		foreach ( $request['with_trashed'] as $item_id ) {
			$item_ids[] = $item_id;
		}
		foreach ( $item_ids as $id ) {
			$post = get_post( $id );
			if ( ! $this->check_read_permission( $post ) ) {
				continue;
			}
			$data = $this->prepare_item_for_response( $post, $request );
			$response_items[] = $this->prepare_response_for_collection( $data );
		}

		$response = rest_ensure_response( $response_items );
		return $response;
	}

	/**
	 * Retrieves the query params for the collections.
	 *
	 * Note that the normal collection parameters are eliminated because this
	 * plugin does not support injection of the customize-previewed state into
	 * WP_Queries. The Customize Posts plugin does support this, so if its
	 * infrastructure makes its way into core then it can be re-used. Also,
	 * since there are only intended to be a handful of featured items there
	 * is no need for parameters to be able to search or paginate.
	 *
	 * @return array Query parameters for the collection.
	 */
	public function get_collection_params() {
		return array(
			'context' => $this->get_context_param(),
			'with_trashed' => array(
				'description' => __( 'Item IDs for additional items amending the results. This is used by the customizer.', 'customize-featured-content-demo' ),
				'type' => 'array',
				'items' => array(
					'type' => 'integer',
				),
				'default' => array(),
			),
		);
	}

	/**
	 * Prepares a single item for create or update.
	 *
	 * @param \WP_REST_Request $request Request object.
	 * @return array Item.
	 */
	protected function prepare_item_for_database( $request ) {
		$item = array();
		$item_schema = $this->get_item_schema();
		foreach ( $request->get_params() as $field_id => $field_value ) {
			$has_raw = isset( $item_schema['properties'][ $field_id ]['raw'] );
			if ( $has_raw ) {
				if ( is_array( $field_value ) && isset( $field_value['raw'] ) ) {
					$field_value = $field_value['raw'];
				}
			}
			$item[ $field_id ] = $field_value;
		}
		return $item;
	}

	/**
	 * Creates a single item.
	 *
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response|\WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function create_item( $request ) {

		if ( ! empty( $request['id'] ) ) {
			return new \WP_Error( 'rest_post_exists', __( 'Cannot create existing post.', 'default' ), array( 'status' => 400 ) );
		}
		$item = $this->prepare_item_for_database( $request );
		$r = $this->plugin->model->insert_item( $item );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$post_id = $r;

		$request->set_param( 'context', 'edit' );

		$response = $this->prepare_item_for_response( get_post( $r ), $request );
		$response = rest_ensure_response( $response );

		$response->set_status( 201 );
		$response->header( 'Location', rest_url( sprintf( '%s/%s/%d', $this->namespace, $this->rest_base, $post_id ) ) );

		return $response;
	}

	/**
	 * Updates a single item.
	 *
	 * @param \WP_REST_Request $request Full details about the request.
	 * @return \WP_REST_Response|\WP_Error Response object on success, or WP_Error object on failure.
	 */
	public function update_item( $request ) {
		$id   = (int) $request['id'];
		$item = $this->plugin->model->get_item( $id );

		if ( empty( $item ) ) {
			return new \WP_Error( 'rest_post_invalid_id', __( 'Invalid post ID.', 'default' ), array( 'status' => 404 ) );
		}

		$updated_item = $this->prepare_item_for_database( $request );
		if ( isset( $updated_item['status'] ) && 'auto-draft' === $updated_item['status'] && $updated_item['status'] !== $item['status'] ) {
			return new \WP_Error( 'invalid_status', __( 'Unpermitted to set status to auto-draft once transitioned to another status.', 'customize-featured-content-demo' ), array( 'status' => 400 ) );
		}

		$r = $this->plugin->model->update_item( $id, $updated_item );
		if ( is_wp_error( $r ) ) {
			return $r;
		}
		$post_id = $r;

		$request->set_param( 'context', 'edit' );

		$response = $this->prepare_item_for_response( get_post( $post_id ), $request );

		return rest_ensure_response( $response );
	}
}
