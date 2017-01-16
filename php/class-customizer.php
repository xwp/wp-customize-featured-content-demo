<?php
/**
 * Class Customizer.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Customizer
 *
 * @package Customize_Featured_Content_Demo
 */
class Customizer {

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Customize manager instance.
	 *
	 * @var \WP_Customize_Manager
	 */
	public $manager;

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
		add_action( 'customize_register', array( $this, 'register' ) );
		add_filter( 'customize_dynamic_setting_args', array( $this, 'filter_customize_dynamic_setting_args' ), 10, 2 );
		add_filter( 'customize_dynamic_setting_class', array( $this, 'filter_customize_dynamic_setting_class' ), 10, 3 );
		add_action( 'customize_register', array( $this, 'add_partials' ), 100 );

		add_action( 'customize_controls_enqueue_scripts', array( $this, 'enqueue_pane_dependencies' ) );
		add_action( 'customize_controls_print_footer_scripts', array( $this, 'render_customize_templates' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_preview_dependencies' ) );
	}

	/**
	 * Enqueue scripts and styles for the Customizer pane (controls).
	 */
	function enqueue_pane_dependencies() {
		$handle = 'customize-featured-content-demo-pane';
		wp_enqueue_script( $handle );
		wp_add_inline_script( $handle, 'wp.customize.featuredContent.pane.initialize();' );
		wp_enqueue_style( $handle );
	}

	/**
	 * Enqueue scripts and styles for the Customizer preview.
	 */
	function enqueue_preview_dependencies() {
		if ( is_customize_preview() ) {
			$handle = 'customize-featured-content-demo-preview';
			wp_enqueue_script( $handle );
			wp_add_inline_script( $handle, 'wp.customize.featuredContent.preview.initialize();' );
			wp_enqueue_style( $handle );
		}
	}

	/**
	 * Print JS templates.
	 *
	 * @see WP_Customize_Widget::render_form_template_scripts()
	 */
	function render_customize_templates() {
		// @todo Might be needed.
	}

	/**
	 * Register.
	 *
	 * @param \WP_Customize_Manager $wp_customize Customize manager instance.
	 */
	public function register( \WP_Customize_Manager $wp_customize ) {
		$this->manager = $wp_customize;

		// @todo Should this register all of the settings or should they be fetched dynamically?
		$items = $this->plugin->model->get_items();
		foreach ( $items as $item ) {
			$setting = new Customize_Setting( $wp_customize, $item->ID, array(
				'plugin' => $this->plugin,
			) );
			$wp_customize->add_setting( $setting );
		}

		$wp_customize->add_panel( 'featured_items', array(
			'title' => __( 'Featured Items', 'customize-featured-content-demo' ),
		) );
		// Note that sections will by dynamically added via JS.
	}

	/**
	 * Add partials for featured items.
	 *
	 * Note that there is no need to register filters for dynamic partials because
	 * partials will be registered after all settings are registered, and
	 * the presence of a featured item setting will cause the featured item partial
	 * to be created.
	 *
	 * If the featured_item settings aren't registered on the PHP side with each
	 * request, and if the settings are added dynamically with JS via lazy-loading,
	 * the partials would need to be registered dynamically in JS instead
	 * in response to syncing of settings to the preview.
	 */
	function add_partials() {
		$partial_settings = array();

		foreach ( $this->manager->settings() as $setting ) {
			if ( $setting instanceof Customize_Setting ) {
				$partial_id = sprintf( sprintf( '%s[%d]', Customize_Partial::TYPE, $setting->post_id ) );
				$partial_settings[ $partial_id ][] = $setting;
			}
		}

		foreach ( $partial_settings as $partial_id => $settings ) {
			$partial_args = array(
				'plugin' => $this->plugin,
				'settings' => wp_list_pluck( $settings, 'id' ), // The JS can make this unnecessary by overriding isRelatedSetting.
			);
			$partial = new Customize_Partial( $this->manager->selective_refresh, $partial_id, $partial_args );
			$this->manager->selective_refresh->add_partial( $partial );
		}
	}

	/**
	 * Add recognition for dynamically-created featured item settings.
	 *
	 * @param false|array $setting_args The arguments to the WP_Customize_Setting constructor.
	 * @param string      $setting_id   ID for dynamic setting.
	 * @returns array|false Setting args or `false` if the `$setting_id` was not recognized.
	 */
	public function filter_customize_dynamic_setting_args( $setting_args, $setting_id ) {
		if ( preg_match( Customize_Setting::ID_PATTERN, $setting_id ) ) {
			if ( false == $setting_args ) {
				$setting_args = array();
			}
			$setting_args = array_merge(
				$setting_args,
				array(
					'type' => Customize_Setting::TYPE,
					'plugin' => $this->plugin,
				)
			);
		}
		return $setting_args;
	}

	/**
	 * Assign WP_Customize_Setting subclass to be used for the featured items.
	 *
	 * @param string $setting_class WP_Customize_Setting or a subclass.
	 * @param string $setting_id    ID for dynamic setting, usually coming from `$_POST['customized']`.
	 * @param array  $setting_args  WP_Customize_Setting or a subclass.
	 * @return string Class name.
	 */
	public function filter_customize_dynamic_setting_class( $setting_class, $setting_id, $setting_args ) {
		unset( $setting_id );
		if ( isset( $setting_args['type'] ) && Customize_Setting::TYPE === $setting_args['type'] ) {
			$setting_class = __NAMESPACE__ . '\\Featured_Item_Customize_Setting';
		}
		return $setting_class;
	}
}
