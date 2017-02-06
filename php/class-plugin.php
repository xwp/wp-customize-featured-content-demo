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
	 * REST Controller.
	 *
	 * @var REST_Controller
	 */
	public $rest_controller;

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
	 * Add hooks.
	 *
	 * @access public
	 */
	public function init() {
		$this->model = new Model( $this );
		$this->model->add_hooks();

		$this->view = new View( $this );
		$this->view->add_hooks();

		$this->customizer = new Customizer( $this );
		$this->customizer->add_hooks();

		$priority = 20; // Due to \Customize_Posts_Plugin::register_scripts() running at priority 11.
		add_action( 'wp_default_scripts', array( $this, 'register_scripts' ), $priority );
		add_action( 'wp_default_styles', array( $this, 'register_styles' ), 20 );

		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_dependencies' ) );
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

		// Extensions to wp-api.
		$handle = 'customize-featured-items-wp-api-extensions';
		$src = $plugin_dir_url . 'js/wp-api-extensions.js';
		$deps = array( 'wp-api' );
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Status control.
		$handle = 'featured-item-status-control';
		$src = $plugin_dir_url . 'js/featured-item-status-control.js';
		$deps = array( 'customize-controls' );
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Field control.
		$handle = 'featured-item-field-control';
		$src = $plugin_dir_url . 'js/featured-item-field-control.js';
		$deps = array( 'customize-controls' );
		$wp_scripts->add( $handle, $src, $deps, $this->version );

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
			'customize-featured-content-demo-base',
			'customize-controls',
			'featured-item-status-control',
			'featured-item-field-control',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );
		$wp_scripts->add_inline_script( $handle, sprintf(
			'_.extend( wp.customize.sectionConstructor.featured_item.prototype.l10n, %s );',
			wp_json_encode( array(
				'no_title' => __( '(Untitled)', 'customize-featured-content-demo' ),
				'featured_media_label' => __( 'Featured Image', 'customize-featured-content-demo' ),
				'featured_image_button_labels' => array(
					'select'       => __( 'Select Image', 'customize-featured-content-demo' ),
					'change'       => __( 'Change Image', 'customize-featured-content-demo' ),
					'remove'       => __( 'Remove', 'customize-featured-content-demo' ),
					'default'      => __( 'Default', 'customize-featured-content-demo' ),
					'placeholder'  => __( 'No image selected', 'customize-featured-content-demo' ),
					'frame_title'  => __( 'Select Image', 'customize-featured-content-demo' ),
					'frame_button' => __( 'Choose Image', 'customize-featured-content-demo' ),
				),
				'url_label' => __( 'URL', 'customize-featured-content-demo' ),
				'url_placeholder' => __( 'https://...', 'customize-featured-content-demo' ),
				'related_label' => __( 'Related item (Optional)', 'customize-featured-content-demo' ),
				'related_plugin_dependency' => __( 'The <a href="https://wordpress.org/plugins/customize-object-selector/" target="_blank">Customize Object Selector</a> plugin must be installed and activated to select a related post.', 'customize-featured-content-demo' ),
				'related_placeholder' => __( 'Search items', 'customize-featured-content-demo' ),
				'title_label' => __( 'Title', 'customize-featured-content-demo' ),
				'position_label' => __( 'Position', 'customize-featured-content-demo' ),
				'status_label' => __( 'Status', 'customize-featured-content-demo' ),
				'customize_action' => __( 'Customizing featured item:', 'customize-featured-content-demo' ),
			) )
		) );

		// Panel.
		$handle = 'customize-featured-items-panel';
		$src = $plugin_dir_url . 'js/featured-items-panel.js';
		$deps = array(
			'wp-a11y',
			'wp-api',
			'customize-featured-items-wp-api-extensions',
			'customize-controls',
			'customize-featured-item-property-setting',
			'customize-featured-item-section',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );
		$wp_scripts->add_inline_script( $handle, sprintf(
			'_.extend( wp.customize.panelConstructor.featured_items.prototype.l10n, %s );',
			wp_json_encode( array(
				'load_items_failure' => __( 'Failed to load featured items.', 'customize-featured-content-demo' ),
				'create_item_failure' => __( 'Failed to create featured item draft.', 'customize-featured-content-demo' ),
			) )
		) );

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

		// Inline editing.
		$handle = 'customize-featured-item-property-inline-editing';
		$src = $plugin_dir_url . 'js/featured-image-property-inline-editing.js';
		$deps = array(
			'customize-featured-content-demo-base', // For namespace.
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Partial.
		$handle = 'customize-featured-item-partial';
		$src = $plugin_dir_url . 'js/featured-item-partial.js';
		$deps = array(
			'wp-api',
			'customize-featured-items-wp-api-extensions',
			'customize-selective-refresh',
			'customize-featured-item-property-inline-editing',
		);
		$wp_scripts->add( $handle, $src, $deps, $this->version );

		// Preview.
		$handle = 'customize-featured-content-demo-preview';
		$src = $plugin_dir_url . 'js/preview.js';
		$deps = array(
			'customize-preview',
			'customize-featured-content-demo-base',
			'customize-featured-item-partial',
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
		$deps = array( 'customize-controls' );
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
