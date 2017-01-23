<?php
/**
 * Class Featured_Items_Customize_Panel.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Featured_Items_Customize_Panel
 *
 * @package Customize_Featured_Content_Demo
 */
class Featured_Items_Customize_Panel extends \WP_Customize_Panel {

	/**
	 * Type of this panel.
	 *
	 * @var string
	 */
	public $type = 'featured_items';

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Constructor.
	 *
	 * @throws \Exception If missing valid args.
	 *
	 * @param \WP_Customize_Manager $manager Customizer bootstrap instance.
	 * @param string                $id      An specific ID for the panel.
	 * @param array                 $args    Panel arguments.
	 */
	public function __construct( \WP_Customize_Manager $manager, $id, array $args = array() ) {
		if ( empty( $args['plugin'] ) || ! ( $args['plugin'] instanceof Plugin ) ) {
			throw new \Exception( 'Missing plugin arg.' );
		}
		parent::__construct( $manager, $id, $args );
	}

	/**
	 * Render the panel's JS templates.
	 */
	public function print_template() {
		parent::print_template();

		?>
		<script id="tmpl-featured-items-customize-panel-addition-ui" type="text/template">
			<div class="featured-items-addition">
				<p class="notice notice-error addition-failure" hidden>
					<?php esc_html_e( 'Failed to create new item.', 'customize-featured-content-demo' ); ?>
				</p>

				<button type="button" class="button-secondary"><?php esc_html_e( 'Add Featured Item', 'customize-featured-content-demo' ); ?></button>
				<span class="spinner"></span>
			</div>
		</script>
		<?php
	}

	/**
	 * Default callback used when invoking WP_Customize_Panel::active().
	 *
	 * @see View::render_items()
	 * @return bool Whether the items were rendered.
	 */
	public function active_callback() {
		return $this->plugin->view->render_items_count > 0;
	}
}
