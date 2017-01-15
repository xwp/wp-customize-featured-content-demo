<?php
/**
 * Class Plugin.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class Plugin
 *
 * @package Customize_Featured_Content_Demo
 */
class Plugin {

	/**
	 * Plugin version.
	 *
	 * @var string
	 */
	public $version;

	/**
	 * Plugin constructor.
	 */
	public function __construct() {
		// Parse plugin version.
		if ( preg_match( '/Version:\s*(\S+)/', file_get_contents( dirname( __FILE__ ) . '/../customize-featured-content-demo.php' ), $matches ) ) {
			$this->version = $matches[1];
		}
	}

	/**
	 * Get Customize Object Selector Plugin.
	 *
	 * @global \CustomizeObjectSelector\Plugin $customize_object_selector_plugin
	 * @return \CustomizeObjectSelector\Plugin|null Plugin or null if not active.
	 */
	public function get_customize_object_selector_plugin() {
		global $customize_object_selector_plugin;
		if ( ! empty( $customize_object_selector_plugin ) && 'CustomizeObjectSelector\Plugin' === get_class( $customize_object_selector_plugin ) ) {
			return $customize_object_selector_plugin;
		} else {
			return null;
		}
	}

	/**
	 * Add hooks.
	 *
	 * @access public
	 */
	public function init() {
		if ( ! $this->get_customize_object_selector_plugin() ) {
			add_action( 'admin_notices', array( $this, 'print_admin_notice_missing_plugin_dependency' ) );
			return;
		}

		add_action( 'wp_default_scripts', array( $this, 'register_scripts' ), 20 );
		add_action( 'wp_default_styles', array( $this, 'register_styles' ), 20 );

		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_dependencies' ) );
		add_action( 'customize_controls_enqueue_scripts', array( $this, 'enqueue_customize_pane_dependencies' ) );

		add_action( 'customize_controls_print_footer_scripts', array( $this, 'render_customize_templates' ) );
	}

	/**
	 * Show admin notice when the JS Widgets plugin is not active.
	 */
	public function print_admin_notice_missing_plugin_dependency() {
		?>
		<div class="error">
			<p><?php esc_html_e( 'The Customize Featured Content plugin depends on the Customize Object Selector plugin to be installed and active.', 'customize-featured-content-demo' ) ?></p>
		</div>
		<?php
	}

	/**
	 * Register scripts.
	 *
	 * @access public
	 *
	 * @param \WP_Scripts $wp_scripts Scripts.
	 */
	public function register_scripts( \WP_Scripts $wp_scripts ) {
		$plugin_dir_url = plugin_dir_url( dirname( __FILE__ ) );

		$handle = 'customize-featured-content-demo-base';
		$src = $plugin_dir_url . 'js/base.js';
		$deps = array( 'customize-base' );
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		$handle = 'customize-featured-content-demo-pane';
		$src = $plugin_dir_url . 'js/pane.js';
		$deps = array(
			'customize-featured-content-demo-base',
			'customize-controls',
			'customize-object-selector-control',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		$handle = 'customize-featured-content-demo-preview';
		$src = $plugin_dir_url . 'js/preview.js';
		$deps = array(
			'customize-featured-content-demo-base',
			'customize-preview',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );
	}

	/**
	 * Register styles.
	 *
	 * @param \WP_Styles $wp_styles Styles.
	 */
	public function register_styles( \WP_Styles $wp_styles ) {
		$plugin_dir_url = plugin_dir_url( dirname( __FILE__ ) );

		$handle = 'customize-featured-content-demo-pane';
		$src = $plugin_dir_url . 'css/pane.css';
		$deps = array( 'customize-controls', 'customize-object-selector' );
		$wp_styles->add( $handle, $src, $deps, $this->version );

		$handle = 'customize-featured-content-demo-preview';
		$src = $plugin_dir_url . 'css/preview.css';
		$deps = array( 'customize-preview' );
		$wp_styles->add( $handle, $src, $deps, $this->version );

		$handle = 'customize-featured-content-demo-frontend';
		$src = $plugin_dir_url . 'css/frontend.css';
		$deps = array();
		$wp_styles->add( $handle, $src, $deps, $this->version );
	}

	/**
	 * Enqueue scripts and styles for the Customizer pane (controls).
	 *
	 * @access public
	 * @global \WP_Customize_Manager $wp_customize
	 */
	function enqueue_customize_pane_dependencies() {
		$handle = 'customize-featured-content-demo-pane';
		wp_enqueue_script( $handle );
		wp_add_inline_script( $handle, 'wp.customize.featuredContent.pane.initialize();' );

		wp_enqueue_style( $handle );
	}

	/**
	 * Enqueue scripts and styles on the frontend.
	 *
	 * @access public
	 */
	function enqueue_frontend_dependencies() {

		wp_enqueue_style( 'customize-featured-content-demo-frontend' );

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
}
