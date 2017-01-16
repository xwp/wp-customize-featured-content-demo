<?php
/**
 * Class Customize_Setting.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Customize_Setting
 *
 * @package Customize_Featured_Content_Demo
 */
class Customize_Setting extends \WP_Customize_Setting {

	const TYPE = 'featured_item';

	// Note how the id_base uses the type as its namespace.
	const ID_PATTERN = '/^featured_item\[(?P<post_id>\d+)\]$/';

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
	 * Transport.
	 *
	 * @var string
	 */
	public $transport = 'postMessage';

	/**
	 * Setting constructor.
	 *
	 * @throws \Exception If the ID is invalid or if the plugin arg was absent.
	 *
	 * @param \WP_Customize_Manager $manager Customize manager.
	 * @param string|int            $id      Setting ID or featured_item post ID.
	 * @param array                 $args    Setting arguments.
	 */
	public function __construct( $manager, $id, $args ) {
		if ( is_numeric( $id ) ) {
			$id = static::get_setting_id( $id );
		}
		if ( ! preg_match( self::ID_PATTERN, $id, $matches ) ) {
			throw new \Exception( "Illegal widget setting ID: $id" );
		}
		if ( ! isset( $args['plugin'] ) || ! ( $args['plugin'] instanceof Plugin ) ) {
			throw new \Exception( 'Missing plugin arg.' );
		}
		$args['default'] = $args['plugin']->model->get_default_item();
		$args['post_id'] = intval( $matches['post_id'] );
		$args['type'] = static::TYPE;
		parent::__construct( $manager, $id, $args );
	}

	/**
	 * Get setting ID.
	 *
	 * @param int $post_id Featured item post ID.
	 * @return string Setting ID.
	 */
	static public function get_setting_id( $post_id ) {
		return sprintf( '%s[%d]', Customize_Setting::TYPE, $post_id );
	}

	/**
	 * Fetch the value of the setting.
	 *
	 * @return array The featured item.
	 */
	public function value() {
		$value = $this->plugin->model->get_item( $this->post_id );
		if ( null === $value ) {
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
	 * @param array $item Item properties.
	 * @param int   $id   Item ID.
	 * @return array|false Array of properties or false if being deleted.
	 */
	public function filter_previewed_item( $item, $id ) {
		if ( $this->post_id === $id ) {
			$item = $this->post_value( $item );
		}
		return $item;
	}

	/**
	 * Validate an item's properties.
	 *
	 * @param array|false $item Item properties to validate, or false if marked for deletion.
	 * @return true|\WP_Error True if the input was validated, otherwise WP_Error.
	 */
	public function validate( $item ) {

		// If not false then isn't deletion case.
		if ( false !== $item ) {
			$validity = $this->plugin->model->validate_item( $item );
			if ( is_wp_error( $validity ) ) {
				return $validity;
			}
		}

		// Allow customize_validate_{$this->id} filters to apply.
		return parent::validate( $item );
	}

	/**
	 * Sanitize an item's properties.
	 *
	 * @param array|false $item The items to sanitize, or false if the item is to be deleted.
	 * @return array|false|\WP_Error Sanitized value, or `null`/`WP_Error` if invalid.
	 */
	public function sanitize( $item ) {

		// If not false then isn't deletion case.
		if ( false !== $item ) {
			$item = $this->plugin->model->sanitize_item( $item );
			if ( is_wp_error( $item ) ) {
				return $item;
			}
		}

		// Allow customize_sanitize_{$this->id} filters to apply.
		$item = parent::sanitize( $item );

		return $item;
	}

	/**
	 * Save the value of the setting, using the related API.
	 *
	 * @param array|false $item The value to update.
	 * @return bool The result of saving the value.
	 */
	protected function update( $item ) {
		if ( false === $item ) {
			$r = $this->plugin->model->delete_item( $this->post_id );
		} else {
			$r = $this->plugin->model->update_item( $item );
		}
		return ! is_wp_error( $r );
	}

}
