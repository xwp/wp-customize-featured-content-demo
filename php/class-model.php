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

	const SLUG = 'featured_item';

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
		return array(
			'related_post_id' => array(
				'type' => 'int',
				'default' => 0,
				'minimum' => 0,
				'validate_callback' => array( $this, 'validate_post_id' ),
				'storage' => array( 'postmeta', 'related_post_id' ),
			),
			'url' => array(
				'type' => 'string',
				'format' => 'url',
				'default' => '',
				'validate_callback' => array( $this, 'validate_url' ),
				'storage' => array( 'postmeta', 'url' ),
			),
			'featured_image_id' => array(
				'type' => 'int',
				'default' => 0,
				'minimum' => 0,
				'validate_callback' => array( $this, 'validate_post_id' ),
				'storage' => array( 'postmeta', '_thumbnail_id' ),
			),
			'position' => array(
				'type' => 'int',
				'default' => 0,
				'minimum' => 0,
				'storage' => array( 'post', 'menu_order' ),
			),
			'title_text' => array(
				'type' => 'string',
				'storage' => array( 'post', 'post_title' ),
			),
			'title_color' => array(
				'type' => 'string',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'title_color' ),
			),
			'title_background' => array(
				'type' => 'string',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'title_background' ),
			),
			'title_font_size' => array(
				'type' => 'int',
				'default' => 0,
				'minimum' => 8,
				'maximum' => 100,
				'storage' => array( 'postmeta', 'title_font_size' ),
			),
			'title_top' => array(
				'type' => 'int',
				'storage' => array( 'postmeta', 'title_top' ),
			),
			'title_left' => array(
				'type' => 'int',
				'storage' => array( 'postmeta', 'title_left' ),
			),
			'description_text' => array(
				'type' => 'string',
				'storage' => array( 'post', 'post_excerpt' ),
			),
			'description_color' => array(
				'type' => 'string',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'description_color' ),
			),
			'description_background' => array(
				'type' => 'string',
				'validate_callback' => array( $this, 'validate_color' ),
				'storage' => array( 'postmeta', 'description_background' ),
			),
			'description_font_size' => array(
				'type' => 'int',
				'default' => 0,
				'minimum' => 8,
				'maximum' => 100,
				'storage' => array( 'postmeta', 'description_font_size' ),
			),
			'description_top' => array(
				'type' => 'int',
				'storage' => array( 'postmeta', 'description_top' ),
			),
			'description_left' => array(
				'type' => 'int',
				'storage' => array( 'postmeta', 'description_left' ),
			),
		);
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
				return new \WP_Error( 'invalid_hex_color' );
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
				return new \WP_Error( 'invalid_url' );
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
			return new \WP_Error( 'invalid_post_id' );
		}
		if ( 'featured_image_id' === $property ) {
			if ( 'attachment' !== $post->post_type ) {
				return new \WP_Error( 'invalid_attachment_post' );
			} elseif ( preg_match( '#^image/#', get_post_mime_type( $post ) ) ) {
				return new \WP_Error( 'invalid_image_attachment' );
			}
		}
		return true;
	}

	/**
	 * Register post type.
	 */
	public function register_post_type() {
		$this->object = register_post_type( static::SLUG, array(
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
			'supports' => array( 'title', 'excerpt' ),
			'capability_type' => 'page',
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
	 * @return array|null Item properties or null if the item does not exist.
	 */
	public function get_item( $id ) {
		$post = get_post( $id );
		if ( ! $post || static::SLUG !== $post->post_type ) {
			return null;
		}

		$item = array();
		foreach ( $this->get_item_schema_properties() as $field_id => $field_schema ) {
			if ( 'post' === $field_schema['storage'][0] ) {
				$post_field = $field_schema['storage'][1];
				$value = $post->$post_field;
			} elseif ( 'postmeta' === $field_schema['storage'][0] ) {
				$meta_key = $field_schema['storage'][1];
				$value = get_post_meta( $post->ID, $meta_key, true );
				if ( 'int' === $field_schema['type'] ) {
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
	 * Validate item.
	 *
	 * @param array $properties Item properties.
	 * @return bool|\WP_Error True on success, `WP_Error` on failure.
	 */
	public function validate_item( $properties ) {
		$item_schema = $this->get_item_schema_properties();
		$unrecognized_properties = array_diff( array_keys( $properties ), array_keys( $item_schema ) );
		if ( 0 !== count( $unrecognized_properties ) ) {
			return new \WP_Error( 'unrecognized_properties' );
		}
		foreach ( $properties as $id => $value ) {
			$field_schema = $item_schema[ $id ];
			$validate_callback = 'rest_validate_value_from_schema';
			if ( isset( $field_schema['validate_callback'] ) ) {
				$validate_callback = $field_schema['validate_callback'];
			}
			$validity = call_user_func( $validate_callback, $value, $field_schema, $id );
			if ( is_wp_error( $validity ) ) {
				return $validity;
			}
		}
		return true;
	}

	/**
	 * Sanitize item.
	 *
	 * @param array $properties Item properties.
	 * @return array|\WP_Error Sanitized items or `WP_Error` if invalid.
	 */
	public function sanitize_item( $properties ) {
		$item_schema = $this->get_item_schema_properties();
		foreach ( $properties as $id => &$value ) {
			if ( ! isset( $item_schema[ $id ] ) ) {
				continue;
			}
			$field_schema = $item_schema[ $id ];
			$sanitize_callback = 'rest_sanitize_value_from_schema';
			if ( isset( $field_schema['sanitize_callback'] ) ) {
				$sanitize_callback = $field_schema['sanitize_callback'];
			}
			$value = call_user_func( $sanitize_callback, $value, $field_schema, $id );
			if ( is_wp_error( $value ) ) {
				return $value;
			}
		}
		return $properties;
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
			if ( ! $post || static::SLUG !== $post->post_type ) {
				return new \WP_Error( 'invalid_post_id' );
			}
		}

		$post_array = array(
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
			return new \WP_Error( 'missing_id' );
		}
		$post = get_post( $id );
		if ( ! $post || static::SLUG !== $post->post_type ) {
			return new \WP_Error( 'invalid_post_id' );
		}
		if ( ! wp_delete_post( $post->ID, true ) ) {
			return new \WP_Error( 'delete_failure' );
		}
		wp_cache_delete( static::GET_ITEMS_CACHE_KEY );
		return true;
	}

	/**
	 * Get items.
	 *
	 * @return array Items.
	 */
	public function get_items() {

		$post_ids = wp_cache_get( static::GET_ITEMS_CACHE_KEY );
		if ( ! is_array( $post_ids ) ) {
			$query = new \WP_Query( array(
				'post_type' => static::SLUG,
				'posts_per_page' => -1,
			) );

			// Note: fields=>ids is not used because we want to cache the full post objects.
			$post_ids = wp_list_pluck( $query->posts, 'id' );

			wp_cache_set( static::GET_ITEMS_CACHE_KEY, $post_ids );
		}

		/**
		 * Filters the IDs for all of the current featured items.
		 *
		 * This is primarily used by
		 *
		 * @param array $post_ids The IDs for the featured_item posts.
		 */
		$post_ids = apply_filters( 'customize_featured_content_demo_items', $post_ids );

		// Hydrate the post IDs with the items.
		$items = array_map( array( $this, 'get_item' ), $post_ids );

		// Sort the items after the filters have applied.
		usort( $items, function( $a, $b ) {
			return $a['position'] - $b['position'];
		} );

		return $items;
	}
}
