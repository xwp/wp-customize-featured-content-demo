<?php
/**
 * Class Featured_Item_Element_Positioning_Customize_Control.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Featured_Item_Element_Positioning_Customize_Control
 *
 * @package Customize_Featured_Content_Demo
 */
class Featured_Item_Element_Positioning_Customize_Control extends \WP_Customize_Control {

	/**
	 * Type of this control.
	 *
	 * @var string
	 */
	public $type = 'featured_item_element_positioning';

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
		<# var elementIdBase = String( Math.random() ); #>
		<span class="customize-control-title">{{ data.label }}</span>
		<div class="customize-control-notifications-container"></div>
		<p class="number-fields">
			<span class="top-field">
				<label for="{{ elementIdBase }}_top"><?php esc_html_e( 'Top:', 'customize-featured-content-demo' ); ?></label>
				<input id="{{ elementIdBase }}_top" type="number" class="top" min="0">px
			</span>
			<span class="left-field"><!-- Woah, where did THAT come from!? ;-) -->
				<label for="{{ elementIdBase }}_left"><?php esc_html_e( 'Left:', 'customize-featured-content-demo' ); ?></label>
				<input id="{{ elementIdBase }}_left" type="number" class="left" min="0">px
			</span>
		</p>
		<?php
	}
}
