<?php
/**
 * Class Featured_Item_Customize_Partial.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Featured_Item_Customize_Partial
 *
 * @package Customize_Featured_Content_Demo
 */
class Featured_Item_Customize_Partial extends \WP_Customize_Partial {

	const TYPE = 'featured_item';

	// Note how the id_base uses the type as its namespace.
	const ID_PATTERN = '/^featured_item\[(?P<post_id>\d+)\]$/Ds';

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Whether the container element is included in the partial, or if only the contents are rendered.
	 *
	 * @var bool
	 */
	public $container_inclusive = true;

	/**
	 * Post ID for the featured_item post.
	 *
	 * @var int
	 */
	public $post_id;

	/**
	 * Capability.
	 *
	 * @var string
	 */
	public $capability;

	/**
	 * Constructor.
	 *
	 * @inheritdoc
	 *
	 * @throws \Exception If an arg is missing or invalid.
	 *
	 * @param \WP_Customize_Selective_Refresh $component Customize Partial Refresh plugin instance.
	 * @param string                          $id        Control ID.
	 * @param array                           $args      {
	 *     Optional. Arguments to override class property defaults.
	 *
	 *     @type array|string $settings All settings IDs tied to the partial. If undefined, `$id` will be used.
	 * }
	 */
	public function __construct( \WP_Customize_Selective_Refresh $component, $id, $args = array() ) {
		if ( ! isset( $args['plugin'] ) || ! ( $args['plugin'] instanceof Plugin ) ) {
			throw new \Exception( 'Missing plugin arg.' );
		}
		if ( empty( $args['post_id'] ) ) {
			throw new \Exception( 'Missing post_id arg' );
		}
		$args['post_id'] = intval( $args['post_id'] );
		$args['type'] = static::TYPE;
		$args['settings'] = array(); // Empty because list of associated settings will be computed in JavaScript.
		$partial_id = static::get_partial_id( $args['post_id'] );
		if ( empty( $id ) ) {
			$id = $partial_id;
		} elseif ( $partial_id !== $id ) {
			throw new \Exception( "Unexpected setting ID: $partial_id" );
		}
		parent::__construct( $component, $id, $args );

		$this->capability = $this->plugin->model->object->cap->edit_posts;
	}

	/**
	 * Get partial ID.
	 *
	 * @param int $post_id Featured item post ID.
	 * @return string Partial ID.
	 */
	static public function get_partial_id( $post_id ) {
		return sprintf( 'featured_item[%d]', $post_id );
	}

	/**
	 * Render callback.
	 *
	 * @param \WP_Customize_Partial $partial Partial.
	 * @param array                 $context Context.
	 * @return void
	 */
	public function render_callback( \WP_Customize_Partial $partial, $context = array() ) {
		$this->plugin->view->render_item( $this->post_id );
	}
}
