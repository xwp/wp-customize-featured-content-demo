<?php
/**
 * Class Featured_Item_Property_Customize_Setting.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Featured_Item_Property_Customize_Setting
 *
 * @package Customize_Featured_Content_Demo
 */
class Featured_Item_Property_Customize_Setting extends \WP_Customize_Setting {

	const TYPE = 'featured_item_property';

	// Note how the id_base uses the type as its namespace.
	const ID_PATTERN = '/^featured_item\[(?P<post_id>\d+)\]\[(?P<property>\w+)\]$/Ds';

	/**
	 * Default args.
	 *
	 * @var array
	 */
	public static $default_args = array(
		'transport' => 'postMessage',
	);

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Post ID for the featured_item post.
	 *
	 * @var int
	 */
	public $post_id;

	/**
	 * Property for the featured_item.
	 *
	 * @var string
	 */
	public $property;

	/**
	 * Transport.
	 *
	 * @var string
	 */
	public $transport;

	/**
	 * Setting constructor.
	 *
	 * @throws \Exception If if invalid args provided.
	 *
	 * @param \WP_Customize_Manager $manager Customize manager.
	 * @param string|null           $id      Setting ID. If empty will be computed from $args.
	 * @param array                 $args    Setting arguments.
	 */
	public function __construct( $manager, $id, $args ) {
		if ( ! isset( $args['plugin'] ) || ! ( $args['plugin'] instanceof Plugin ) ) {
			throw new \Exception( 'Missing plugin arg.' );
		}
		$default_item = $args['plugin']->model->get_default_item();
		if ( empty( $args['post_id'] ) ) {
			throw new \Exception( 'Missing post_id arg' );
		}
		$args['post_id'] = intval( $args['post_id'] );
		if ( empty( $args['property'] ) ) {
			throw new \Exception( 'Missing property arg' );
		}
		$default_args = static::$default_args;
		if ( isset( $default_item[ $args['property'] ]['default'] ) ) {
			$default_args['default'] = $default_item[ $args['property'] ]['default'];
		}
		$args = array_merge( static::$default_args, $args );
		$args['type'] = static::TYPE;
		$setting_id = static::get_setting_id( $args['post_id'], $args['property'] );
		if ( empty( $id ) ) {
			$id = $setting_id;
		} elseif ( $setting_id !== $id ) {
			throw new \Exception( "Unexpected setting ID: $setting_id" );
		}
		parent::__construct( $manager, $id, $args );
	}

	/**
	 * Get setting ID.
	 *
	 * @param int    $post_id       Featured item post ID.
	 * @param string $property_name Featured item property name.
	 * @return string Setting ID.
	 */
	static public function get_setting_id( $post_id, $property_name ) {
		return sprintf( 'featured_item[%d][%s]', $post_id, $property_name );
	}

	/**
	 * Fetch the value of the setting.
	 *
	 * @return array The featured item.
	 */
	public function value() {
		$item = $this->plugin->model->get_item( $this->post_id );
		if ( isset( $item[ $this->property ] ) ) {
			$value = $item[ $this->property ];
		} else {
			$value = $this->default;
		}

		/** This filter is documented in wp-includes/class-wp-customize-setting.php */
		$value = apply_filters( "customize_value_{$this->id_data['base']}", $value, $this );

		return $value;
	}

	/**
	 * Add filters to supply the setting's value when accessed.
	 *
	 * @see Model::get_item()
	 *
	 * @return bool False when preview short-circuits due no change needing to be previewed.
	 */
	public function preview() {
		if ( $this->is_previewed ) {
			return false;
		}
		$this->is_previewed = true;
		add_filter( 'customize_featured_content_demo_item', array( $this, 'filter_previewed_item' ), 10, 2 );
		return true;
	}

	/**
	 * Filter the item when previewed.
	 *
	 * @todo The filtering could be more efficient.
	 *
	 * @param array $item Item properties.
	 * @param int   $id   Item ID.
	 * @return array|false Array of properties or false if being deleted.
	 */
	public function filter_previewed_item( $item, $id ) {
		if ( $this->post_id === $id ) {
			$property_value = $this->post_value();
			if ( null !== $property_value ) {
				$item[ $this->property ] = $property_value;
			}
		}
		return $item;
	}

	/**
	 * Validate an item's property value.
	 *
	 * @param mixed $value Item property value to validate.
	 * @return true|\WP_Error True if the input was validated, otherwise WP_Error.
	 */
	public function validate( $value ) {
		$validity = $this->plugin->model->validate_item_property( $this->property, $value );
		if ( is_wp_error( $validity ) ) {
			return $validity;
		}

		// Allow customize_validate_{$this->id} filters to apply.
		return parent::validate( $value );
	}

	/**
	 * Sanitize an item's property value.
	 *
	 * @param mixed $value The item property to sanitize.
	 * @return array|false|\WP_Error Sanitized value, or `null`/`WP_Error` if invalid.
	 */
	public function sanitize( $value ) {
		$value = $this->plugin->model->sanitize_item_property( $this->property, $value );
		if ( is_wp_error( $value ) ) {
			return $value;
		}

		// Allow customize_sanitize_{$this->id} filters to apply.
		$value = parent::sanitize( $value );

		return $value;
	}

	/**
	 * Save the value of the setting, using the related API.
	 *
	 * @param mixed $value The value to update.
	 * @return bool The result of saving the value.
	 */
	protected function update( $value ) {
		$item = $this->plugin->model->get_item( $this->post_id );
		if ( null === $item ) {
			return false;
		}
		$item[ $this->property ] = $value;
		$r = $this->plugin->model->update_item( $this->post_id, $item );
		return ! is_wp_error( $r );
	}

}
