<?php
/**
 * Class Customize_Partial.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Customize_Partial
 *
 * @todo This may end up to be unnecessary.
 *
 * @package Customize_Featured_Content_Demo
 */
class Customize_Partial extends \WP_Customize_Partial {

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
	 * Partial constructor.
	 *
	 * @throws \Exception If the ID is invalid or if the plugin arg was absent.
	 *
	 * @param \WP_Customize_Selective_Refresh $component Selective refresh component.
	 * @param string                          $id        An specific ID of the setting.
	 * @param array                           $args      Partial arguments.
	 */
	public function __construct( $component, $id, $args ) {
		if ( ! preg_match( self::ID_PATTERN, $id, $matches ) ) {
			throw new \Exception( "Illegal widget setting ID: $id" );
		}
		if ( ! isset( $args['plugin'] ) || ! ( $args['plugin'] instanceof Plugin ) ) {
			throw new \Exception( 'Missing plugin arg.' );
		}
		$args['post_id'] = intval( $matches['post_id'] );
		$args['type'] = static::TYPE;
		parent::__construct( $component, $id, $args );
	}
}
