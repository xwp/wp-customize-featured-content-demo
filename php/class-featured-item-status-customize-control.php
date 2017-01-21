<?php
/**
 * Class Featured_Item_Status_Customize_Control.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Featured_Item_Status_Customize_Control
 *
 * @package Customize_Featured_Content_Demo
 */
class Featured_Item_Status_Customize_Control extends \WP_Customize_Control {

	/**
	 * Type of this control.
	 *
	 * @var string
	 */
	public $type = 'featured_item_status';

	/**
	 * Render the control's content. Empty since we're rendering with JS.
	 *
	 * @access private
	 */
	protected function render_content() {}

	/**
	 * Render the Underscore template for this control.
	 *
	 * @access protected
	 * @codeCoverageIgnore
	 */
	protected function content_template() {
		?>
		<div class="control-row">
			<span class="customize-control-title">{{ data.label }}</span>
			<button type="button" class="button-secondary toggle-trashed">
				<span class="trash"><?php esc_html_e( 'Trash', 'default' ); ?></span>
				<span class="untrash"><?php esc_html_e( 'Untrash', 'customize-featured-content-demo' ); ?></span>
			</button>
		</div>
		<div class="customize-control-notifications-container"></div>
		<?php
	}
}
