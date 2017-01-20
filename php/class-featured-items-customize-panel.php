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
	 * @param Plugin                $plugin  Plugin instance.
	 * @param \WP_Customize_Manager $manager Customizer bootstrap instance.
	 * @param string                $id      An specific ID for the panel.
	 * @param array                 $args    Panel arguments.
	 */
	public function __construct( Plugin $plugin, \WP_Customize_Manager $manager, $id, array $args = array() ) {
		$this->plugin = $plugin;
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
	 * Gather the parameters passed to client JavaScript via JSON.
	 *
	 * Note that this could alternatively be done via:
	 *
	 * <code>
	 * wp_add_inline_script( 'customize-featured-items-panel', sprintf(
	 *    '_.extend( wp.customize.panelConstructor.featured_items.prototype.defaultItemProperties, %s );',
	 *    wp_json_encode( $this->plugin->model->get_default_item() )
	 * ) );
	 * </code>
	 *
	 * @return array The array to be exported to the client as JSON.
	 */
	public function json() {
		$exported = parent::json();
		$exported['default_item_property_setting_params'] = $this->plugin->customizer->get_default_item_property_setting_params();
		return $exported;
	}
}
