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

		$schema = $this->get_item_schema();
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
	 * Retrieves the item's schema, conforming to JSON Schema.
	 *
	 * @return array Item schema data.
	 */
	public function get_item_schema() {

		$properties = array(
			'id' => array(
				'description' => __( 'Unique identifier for the object.', 'default' ),
				'type' => 'integer',
				'context' => array( 'view', 'edit', 'embed' ),
				'readonly' => true,
			),
		);

		// @todo Why not just use arg_options to begin with in the Model?
		foreach ( $this->plugin->model->get_item_schema_properties() as $field_id => $field_schema ) {
			$arg_options = wp_array_slice_assoc( $field_schema, array( 'sanitize_callback', 'validate_callback' ) );
			unset( $field_schema['sanitize_callback'] );
			unset( $field_schema['validate_callback'] );
			unset( $field_schema['storage'] );
			$field_schema['arg_options'] = $arg_options;
			$properties[ $field_id ] = $field_schema;
		}

		$schema = array(
			'$schema' => 'http://json-schema.org/schema#',
			'title' => Model::POST_TYPE,
			'type' => 'object',
			'properties' => $properties,
		);

		return $schema;
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

		setup_postdata( $post );

		// Base fields for every post.
		$data = array_merge(
			array(
				'id' => $post->ID, // @todo Let id just be included in get_item by default?
			),
			$this->plugin->model->get_item( $post )
		);

		$context = ! empty( $request['context'] ) ? $request['context'] : 'view';
		$data = $this->filter_response_by_context( $data, $context );

		// Wrap the data in a response object.
		$response = rest_ensure_response( $data );

		$response->add_links( $this->prepare_links( $post ) );

		return $response;
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

		foreach ( array_keys( $items ) as $id ) {
			$data = $this->prepare_item_for_response( get_post( $id ), $request );
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
		foreach ( $request->get_params() as $field_id => $field_value ) {
			if ( is_array( $field_value ) && isset( $field_value['raw'] ) ) {
				$field_value = $field_value['raw'];
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
