<?php
/**
 * Class Featured_Item_Field_Customize_Control.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Featured_Item_Field_Customize_Control
 *
 * @package Customize_Featured_Content_Demo
 */
class Featured_Item_Field_Customize_Control extends \WP_Customize_Control {

	/**
	 * Type of control, used by JS.
	 *
	 * @access public
	 * @var string
	 */
	public $type = 'featured_item_field';

	/**
	 * Kind of field type used in control.
	 *
	 * @var string
	 */
	public $field_type = 'text';

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
		<#
		var inputId = 'field' + String( Math.random() );
		#>
		<label class="customize-control-title" for="{{ inputId }}">{{ data.label }}</label>
		<div class="customize-control-notifications-container"></div>
		<# if ( data.description ) { #>
			<span class="description customize-control-description">{{{ data.description }}}</span>
		<# } #>
		<# if ( 'textarea' === data.field_type ) { #>
			<textarea
				class="widefat"
				rows="5"
				id="{{ inputId }}"
				<# _.each( data.input_attrs, function( value, key ) { #>
					{{{ key }}}="{{ value }}"
				<# } ) #>
				></textarea>
		<# } else { #>
			<input
				id="{{ inputId }}"
				type="{{ data.field_type }}"
				<# _.each( data.input_attrs, function( value, key ) { #>
					{{{ key }}}="{{ value }}"
				<# } ) #>
			/>
		<# } #>
		<?php
	}
}
