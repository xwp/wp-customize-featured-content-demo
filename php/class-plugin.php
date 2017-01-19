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
	 * Model.
	 *
	 * @var Model
	 */
	public $model;

	/**
	 * View.
	 *
	 * @var View
	 */
	public $view;

	/**
	 * Customizer.
	 *
	 * @var Customizer
	 */
	public $customizer;

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

		$this->model = new Model( $this );
		$this->model->add_hooks();

		$this->view = new View( $this );

		$this->customizer = new Customizer( $this );
		$this->customizer->add_hooks();

		$priority = 20; // Due to \Customize_Posts_Plugin::register_scripts() running at priority 11.
		add_action( 'wp_default_scripts', array( $this, 'register_scripts' ), $priority );
		add_action( 'wp_default_styles', array( $this, 'register_styles' ), 20 );

		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_dependencies' ) );
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
	 * @see \Customize_Posts_Plugin::register_scripts()
	 *
	 * @param \WP_Scripts $wp_scripts Scripts.
	 */
	public function register_scripts( \WP_Scripts $wp_scripts ) {
		$plugin_dir_url = plugin_dir_url( dirname( __FILE__ ) );

		// Register dynamic control if not already registered (via Customize Posts).
		$handle = 'customize-dynamic-control';
		if ( ! $wp_scripts->query( $handle, 'registered' ) ) {
			$src = $plugin_dir_url . 'js/customize-dynamic-control.js';
			$deps = array( 'customize-base' );
			$wp_scripts->add( $handle, $src, $deps, $this->version );
		}

		// Base namespace.
		$handle = 'customize-featured-content-demo-base';
		$src = $plugin_dir_url . 'js/base.js';
		$deps = array( 'customize-base' );
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Setting.
		$handle = 'customize-featured-item-property-setting';
		$src = $plugin_dir_url . 'js/featured-item-property-setting.js';
		$deps = array(
			'customize-controls',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Section.
		$handle = 'customize-featured-item-section';
		$src = $plugin_dir_url . 'js/featured-item-section.js';
		$deps = array(
			'customize-featured-item-property-setting',
			'customize-dynamic-control',
			'customize-featured-content-demo-base',
			'customize-controls',
			'customize-object-selector-control',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );
		$wp_scripts->add_inline_script( $handle, sprintf(
			'_.extend( wp.customize.sectionConstructor.featured_item.prototype.l10n, %s );',
			wp_json_encode( array(
				'no_title' => __( '(Untitled)', 'customize-featured-content-demo' ),
				'related_post_id_label' => __( 'Related item', 'customize-featured-content-demo' ),
				'related_post_id_placeholder' => __( 'Search items', 'customize-featured-content-demo' ),
				'title_text_label' => __( 'Title', 'customize-featured-content-demo' ),
				'description_text_label' => __( 'Description', 'customize-featured-content-demo' ),
				'position_label' => __( 'Position', 'customize-featured-content-demo' ),
				'customize_action' => __( 'Customizing featured item:', 'customize-featured-content-demo' ),
			) )
		) );

		// Panel.
		$handle = 'customize-featured-items-panel';
		$src = $plugin_dir_url . 'js/featured-items-panel.js';
		$deps = array(
			'customize-controls',
			'customize-featured-item-property-setting',
			'customize-featured-item-section',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Pane (Controls).
		$handle = 'customize-featured-content-demo-pane';
		$src = $plugin_dir_url . 'js/pane.js';
		$deps = array(
			'customize-featured-items-panel',
			'customize-featured-item-section',
			'customize-featured-content-demo-base',
			'customize-controls',
			'jquery-ui-sortable',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Partial.
		$handle = 'customize-featured-item-partial';
		$src = $plugin_dir_url . 'js/featured-item-partial.js';
		$deps = array(
			'customize-selective-refresh',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Preview.
		$handle = 'customize-featured-content-demo-preview';
		$src = $plugin_dir_url . 'js/preview.js';
		$deps = array(
			'customize-featured-content-demo-base',
			'customize-featured-item-partial',
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
	 * Enqueue scripts and styles on the frontend.
	 *
	 * @access public
	 */
	function enqueue_frontend_dependencies() {
		wp_enqueue_style( 'customize-featured-content-demo-frontend' );
	}
}
