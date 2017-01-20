<?php
/**
 * Class Model.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Model
 *
 * @package Customize_Featured_Content_Demo
 */
class Model {

	const POST_TYPE = 'featured_item';

	const GET_ITEMS_CACHE_KEY = 'get_featured_content_items';

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Post type object.
	 *
	 * @var \WP_Post_Type
	 */
	public $object;

	/**
	 * Plugin constructor.
	 *
	 * @param Plugin $plugin Plugin instance.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Add hooks.
	 */
	public function add_hooks() {
		add_action( 'init', array( $this, 'register_post_type' ) );
	}

	/**
	 * Get item schema properties.
	 *
	 * @return array
	 */
	public function get_item_schema_properties() {

		// @todo Add a flag for whether or not the value should be exposed as raw/rendered in the REST API? Add a render_callback?
		// @todo Add get_links callback?
		return array(
			'id' => array(
				'description' => __( 'Unique identifier for the object.', 'default' ),
				'type' => 'integer',
				'context' => array( 'view', 'edit', 'embed' ),
				'readonly' => true,
				'storage' => array( 'post', 'ID' ),
				'default' => 0,
			),
			'related_post_id' => array( // @todo Remove the _id suffix.
				'type' => 'integer',
				'default' => 0,
				'minimum' => 0,
				'validate_callback' => array( $this, 'validate_post_id' ),
				'storage' => array( 'postmeta', 'related_post_id' ),
			),
			'status' => array(
				'type' => 'string',
				'default' => 'publish',
				'enum' => array( 'auto-draft', 'publish', 'trash' ),
				'storage' => array( 'post', 'post_status' ),
			),
			'url' => array(
				'type' => 'string',
				'format' => 'url',
				'default' => '',
				'validate_callback' => array( $this, 'validate_url' ),
				'storage' => array( 'postmeta', 'url' ),
			),
			'featured_media' => array(
				'type' => 'integer',
				'default' => 0,
				'minimum' => 0,
				'validate_callback' => array( $this, 'validate_post_id' ),
				'storage' => array( 'postmeta', '_thumbnail_id' ),
			),
			'position' => array(
				'type' => 'integer',
				'default' => 0,
				'minimum' => 0,
				'storage' => array( 'post', 'menu_order' ),
			),
			'title' => array(
				'type' => 'string',
				'default' => '',
				'sanitize_callback' => array( $this, 'sanitize_text' ),
				'storage' => array( 'post', 'post_title' ),
			),
			'title_color' => array(
				'type' => 'string',
				'default' => '',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'title_color' ),
			),
			'title_background' => array(
				'type' => 'string',
				'default' => '',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'title_background' ),
			),
			'title_font_size' => array(
				'type' => 'integer',
				'default' => 50,
				'minimum' => 8,
				'maximum' => 100,
				'storage' => array( 'postmeta', 'title_font_size' ),
			),
			'title_top' => array(
				'type' => 'integer',
				'default' => 0,
				'storage' => array( 'postmeta', 'title_top' ),
			),
			'title_left' => array(
				'type' => 'integer',
				'default' => 0,
				'storage' => array( 'postmeta', 'title_left' ),
			),
			'excerpt' => array(
				'type' => 'string',
				'default' => '',
				'sanitize_callback' => array( $this, 'sanitize_text' ),
				'storage' => array( 'post', 'post_excerpt' ),
			),
			'excerpt_color' => array(
				'type' => 'string',
				'default' => '',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'excerpt_color' ),
			),
			'excerpt_background' => array(
				'type' => 'string',
				'default' => '',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'excerpt_background' ),
			),
			'excerpt_font_size' => array(
				'type' => 'integer',
				'default' => 20,
				'minimum' => 8,
				'maximum' => 100,
				'storage' => array( 'postmeta', 'excerpt_font_size' ),
			),
			'excerpt_top' => array(
				'type' => 'integer',
				'default' => 0,
				'storage' => array( 'postmeta', 'excerpt_top' ),
			),
			'excerpt_left' => array(
				'type' => 'integer',
				'default' => 0,
				'storage' => array( 'postmeta', 'excerpt_left' ),
			),
		);
	}

	/**
	 * Validate and sanitize text.
	 *
	 * @param string $value  The title text value.
	 * @param array  $args   Schema array to use for validation.
	 * @return string|\WP_Error
	 */
	public function sanitize_text( $value, $args ) {
		$value = rest_sanitize_value_from_schema( $value, $args );

		if ( preg_match( '#</?\w*.?>#s', $value ) ) {
			return new \WP_Error( 'invalid_title_markup', __( 'Markup is not allowed.', 'customize-featured-content-demo' ) );
		}

		$value = sanitize_text_field( $value );
		return $value;
	}

	/**
	 * Validate color.
	 *
	 * @param mixed  $value    The value to validate.
	 * @param array  $args     Schema array to use for validation.
	 * @param string $property The parameter name, used in error messages.
	 * @return true|\WP_Error
	 */
	public function validate_color( $value, $args, $property ) {
		$validity = rest_validate_value_from_schema( $value, $args, $property );
		if ( is_wp_error( $validity ) ) {
			return $validity;
		}
		if ( ! empty( $value ) ) {
			$value = sanitize_hex_color( $value );
			if ( empty( $value ) ) {
				return new \WP_Error( 'invalid_hex_color', __( 'Invalid HEX color.', 'customize-featured-content-demo' ) );
			}
		}
		return true;
	}

	/**
	 * Validate URL.
	 *
	 * @param mixed  $value    The value to validate.
	 * @param array  $args     Schema array to use for validation.
	 * @param string $property The parameter name, used in error messages.
	 * @return true|\WP_Error
	 */
	public function validate_url( $value, $args, $property ) {
		$validity = rest_validate_value_from_schema( $value, $args, $property );
		if ( is_wp_error( $validity ) ) {
			return $validity;
		}
		if ( ! empty( $value ) ) {
			$value = esc_url_raw( $value, array( 'http', 'https', 'mailto' ) );
			if ( empty( $value ) ) {
				return new \WP_Error( 'invalid_url', __( 'Invalid URL.', 'customize-featured-content-demo' ) );
			}
		}
		return $value;
	}

	/**
	 * Validate color.
	 *
	 * @param mixed  $value    The value to validate.
	 * @param array  $args     Schema array to use for validation.
	 * @param string $property The parameter name.
	 * @return true|\WP_Error
	 */
	public function validate_post_id( $value, $args, $property ) {
		$validity = rest_validate_value_from_schema( $value, $args, $property );
		if ( is_wp_error( $validity ) ) {
			return $validity;
		}
		if ( empty( $value ) ) {
			return $value;
		}
		$post = get_post( $value );
		if ( ! $post ) {
			return new \WP_Error( 'invalid_post_id', __( 'Invalid post.', 'customize-featured-content-demo' ) );
		}
		if ( 'featured_media' === $property ) {
			if ( 'attachment' !== $post->post_type ) {
				return new \WP_Error( 'invalid_attachment_post', __( 'Invalid attachment.', 'customize-featured-content-demo' ) );
			} elseif ( ! preg_match( '#^image/#', get_post_mime_type( $post ) ) ) {
				return new \WP_Error( 'invalid_image_attachment', __( 'Invalid image attachment.', 'customize-featured-content-demo' ) );
			}
		}
		return true;
	}

	/**
	 * Register post type.
	 */
	public function register_post_type() {
		$this->object = register_post_type( static::POST_TYPE, array(
			'labels' => array(
				'name'          => __( 'Featured Items', 'customize-featured-content-demo' ),
				'singular_name' => __( 'Featured Item', 'customize-featured-content-demo' ),
			),
			'public' => false,
			'hierarchical' => false,
			'rewrite' => false,
			'query_var' => false,
			'delete_with_user' => false,
			'can_export' => true,
			'supports' => array( 'title', 'excerpt', 'thumbnail' ),
			'capability_type' => 'page', // Allow anyone who can manage pages to manage featured items.
			'show_in_rest' => true,
			'rest_base' => 'featured-items',
			'rest_controller_class' => __NAMESPACE__ . '\\REST_Controller',
			'plugin' => $this->plugin, // Hack since WP_REST_Controller doesn't facilitate constructor dependency injection.
		) );
	}

	/**
	 * Get default item.
	 *
	 * @return array Default item.
	 */
	public function get_default_item() {
		return wp_list_pluck( $this->get_item_schema_properties(), 'default' );
	}

	/**
	 * Get featured item.
	 *
	 * @param int|\WP_Post $id Item.
	 * @return array|false Item properties or false if the item does not exist (or was deleted).
	 */
	public function get_item( $id ) {
		if ( empty( $id ) ) {
			return false;
		}
		$post = get_post( $id );
		if ( ! $post || static::POST_TYPE !== $post->post_type ) {
			return false;
		}

		$item = array(
			'id' => $post->ID,
		);
		foreach ( $this->get_item_schema_properties() as $field_id => $field_schema ) {
			if ( 'post' === $field_schema['storage'][0] ) {
				$post_field = $field_schema['storage'][1];
				$value = $post->$post_field;
			} elseif ( 'postmeta' === $field_schema['storage'][0] ) {
				$meta_key = $field_schema['storage'][1];
				$value = get_post_meta( $post->ID, $meta_key, true );
				if ( 'integer' === $field_schema['type'] ) {
					$value = (int) $value;
				}
			}
			if ( empty( $value ) ) {
				$value = $field_schema['default'];
			}
			$item[ $field_id ] = $value;
		}

		/**
		 * Filters the data for a featured item.
		 *
		 * @param array $item Item properties.
		 * @param int   $id   Item ID.
		 */
		$item = apply_filters( 'customize_featured_content_demo_item', $item, $post->ID );
		return $item;
	}

	/**
	 * Validate item property.
	 *
	 * @param string $property_name  Property name.
	 * @param mixed  $property_value Property value.
	 * @return bool|\WP_Error True on success, `WP_Error` on failure.
	 */
	public function validate_item_property( $property_name, $property_value ) {
		$item_schema = $this->get_item_schema_properties();
		if ( ! isset( $item_schema[ $property_name ] ) ) {
			return new \WP_Error( 'unrecognized_property', __( 'Unrecognized property.', 'customize-featured-content-demo' ) );
		}
		$field_schema = $item_schema[ $property_name ];
		$validate_callback = 'rest_validate_value_from_schema';
		if ( isset( $field_schema['validate_callback'] ) ) {
			$validate_callback = $field_schema['validate_callback'];
		}
		$validity = call_user_func( $validate_callback, $property_value, $field_schema, $property_name );
		if ( is_wp_error( $validity ) ) {
			return $validity;
		}
		return true;
	}

	/**
	 * Sanitize item property.
	 *
	 * @param string $property_name  Property name.
	 * @param mixed  $property_value Property value.
	 * @return array|\WP_Error Sanitized items or `WP_Error` if invalid.
	 */
	public function sanitize_item_property( $property_name, $property_value ) {
		$item_schema = $this->get_item_schema_properties();
		if ( ! isset( $item_schema[ $property_name ] ) ) {
			return null;
		}
		$field_schema = $item_schema[ $property_name ];
		$sanitize_callback = 'rest_sanitize_value_from_schema';
		if ( isset( $field_schema['sanitize_callback'] ) ) {
			$sanitize_callback = $field_schema['sanitize_callback'];
		}
		return call_user_func( $sanitize_callback, $property_value, $field_schema, $property_name );
	}

	/**
	 * Insert item.
	 *
	 * @param array $properties Item properties, pre-validated and pre-sanitized.
	 * @return int|\WP_Error
	 */
	public function insert_item( array $properties ) {
		return $this->update_item( null, $properties );
	}

	/**
	 * Update featured item.
	 *
	 * @param int|\WP_Post|null $id         Item ID or null if creating.
	 * @param array             $properties Item properties, pre-validated and pre-sanitized.
	 * @return int|\WP_Error Item ID or `WP_Error` on failure.
	 */
	public function update_item( $id, array $properties = array() ) {
		$post = null;
		if ( $id ) {
			$post = get_post( $id );
			if ( ! $post || static::POST_TYPE !== $post->post_type ) {
				return new \WP_Error( 'invalid_post_id', __( 'Invalid post.', 'customize-featured-content-demo' ) );
			}
		}

		$post_array = array(
			'post_type' => Model::POST_TYPE,
			'meta_input' => array(),
		);

		foreach ( $this->get_item_schema_properties() as $field_id => $field_schema ) {
			if ( isset( $properties[ $field_id ] ) ) {
				$value = $properties[ $field_id ];
			} elseif ( empty( $post ) ) {
				$value = $field_schema['default'];
			} else {
				continue;
			}

			if ( 'post' === $field_schema['storage'][0] ) {
				$post_field = $field_schema['storage'][1];
				$post_array[ $post_field ] = $value;
			} elseif ( 'postmeta' === $field_schema['storage'][0] ) {
				$meta_key = $field_schema['storage'][1];
				$post_array['meta_input'][ $meta_key ] = $value;
			}
		}

		if ( empty( $post ) ) {
			$r = wp_insert_post( wp_slash( $post_array ), true );
		} else {
			$post_array['ID'] = $post->ID;
			$r = wp_update_post( wp_slash( $post_array ), true );
		}
		wp_cache_delete( static::GET_ITEMS_CACHE_KEY );
		return $r;
	}

	/**
	 * Delete featured item.
	 *
	 * @param int|\WP_Post $id Item ID.
	 * @return true|\WP_Error True if deleted or `WP_Error` on failure.
	 */
	public function delete_item( $id ) {
		if ( ! $id ) {
			return new \WP_Error( 'missing_id', __( 'Missing ID.', 'customize-featured-content-demo' ) );
		}
		$post = get_post( $id );
		if ( ! $post || static::POST_TYPE !== $post->post_type ) {
			return new \WP_Error( 'invalid_post_id', __( 'Invalid post ID.', 'customize-featured-content-demo' ) );
		}
		if ( ! wp_delete_post( $post->ID, true ) ) {
			return new \WP_Error( 'delete_failure', __( 'Failed to delete.', 'customize-featured-content-demo' ) );
		}
		wp_cache_delete( static::GET_ITEMS_CACHE_KEY );
		return true;
	}

	/**
	 * Get items.
	 *
	 * @return array Items keyed their ID.
	 */
	public function get_items() {

		// @todo Use of object cache is probably overkill here and it will hurt more than help if posts/postmeta are not cached.
		$post_ids = wp_cache_get( static::GET_ITEMS_CACHE_KEY );
		if ( ! is_array( $post_ids ) ) {
			$query = new \WP_Query( array(
				'post_type' => static::POST_TYPE,
				'posts_per_page' => -1,
				'post_status' => 'publish',
			) );

			// Note: fields=>ids is not used because we want to cache the full post objects.
			$post_ids = wp_list_pluck( $query->posts, 'ID' );

			wp_cache_set( static::GET_ITEMS_CACHE_KEY, $post_ids );
		}

		/**
		 * Filters the IDs for all of the current featured items.
		 *
		 * @param array $post_ids The IDs for the featured_item posts.
		 */
		$post_ids = apply_filters( 'customize_featured_content_demo_items', $post_ids );

		// Hydrate the post IDs with the items.
		$items = array();
		foreach ( $post_ids as $post_id ) {
			$items[ $post_id ] = $this->get_item( $post_id );
		}

		// Sort the items after the filters have applied.
		uasort( $items, function( $a, $b ) {
			return $a['position'] - $b['position'];
		} );

		return $items;
	}
}
