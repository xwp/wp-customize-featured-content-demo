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
		$priority = 30; // Due to \WP_Customize_Posts::register_constructs() at priority 20.
		add_action( 'customize_register', array( $this, 'register' ), $priority );
		add_filter( 'customize_dynamic_setting_args', array( $this, 'filter_customize_dynamic_setting_args' ), 10, 2 );
		add_filter( 'customize_dynamic_setting_class', array( $this, 'filter_customize_dynamic_setting_class' ), 10, 3 );
		add_filter( 'customize_dynamic_partial_args', array( $this, 'filter_customize_dynamic_partial_args' ), 10, 2 );
		add_filter( 'customize_dynamic_partial_class', array( $this, 'filter_customize_dynamic_partial_class' ), 10, 3 );
		add_action( 'customize_preview_init', array( $this, 'preview_items_list' ) );

		add_action( 'customize_controls_enqueue_scripts', array( $this, 'enqueue_pane_dependencies' ) );
		add_action( 'customize_controls_print_footer_scripts', array( $this, 'print_templates' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_preview_dependencies' ) );
	}

	/**
	 * Enqueue scripts and styles for the Customizer pane (controls).
	 */
	function enqueue_pane_dependencies() {

		// Add just-in-time dependency if the Customize Object Selector plugin is active.
		if ( wp_script_is( 'customize-object-selector-control', 'registered' ) ) {
			wp_scripts()->registered['customize-featured-item-section']->deps[] = 'customize-object-selector-control';
		}

		$handle = 'customize-featured-content-demo-pane';
		wp_enqueue_script( $handle );
		wp_add_inline_script( $handle, 'wp.customize.featuredContent.pane.initialize();' );
		wp_enqueue_style( $handle );
	}

	/**
	 * Print any additional templates needed.
	 */
	function print_templates() {
		?>
		<script id="tmpl-message-customize-control" type="text/template">
			<li class="customize-control message-control">
				<# if ( data.label ) { #>
					<span class="customize-control-title">{{ data.label }}</span>
				<# } #>
				<div class="notice notice-{{ data.type || 'info' }}">
					<p>{{{ data.message }}}</p>
				</div>
			</li>
		</script>
		<?php
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
	 * Register panel and control type.
	 *
	 * @see WP_Customize_Posts::register_constructs()
	 *
	 * @param \WP_Customize_Manager $wp_customize Customize manager instance.
	 */
	public function register( \WP_Customize_Manager $wp_customize ) {
		$this->manager = $wp_customize;

		// Register the dynamic control type if it is not already registered by Customize Posts.
		if ( ! class_exists( '\WP_Customize_Dynamic_Control' ) ) {
			$this->manager->register_control_type( __NAMESPACE__ . '\WP_Customize_Dynamic_Control' );
		}

		$this->manager->register_control_type( __NAMESPACE__ . '\Featured_Item_Status_Customize_Control' );

		// Note that settings and sections will by dynamically added via JS.
		$panel = new Featured_Items_Customize_Panel( $this->manager, 'featured_items', array(
			'title' => __( 'Featured Items', 'customize-featured-content-demo' ),
			'plugin' => $this->plugin,
		) );

		/*
		 * Note that this is done instead of registering Featured_Items_Customize_Panel
		 * via WP_Customize_Manager::register_panel_type() because it doesn't allow
		 * passing in a pre-instantiated object which means that constructor dependency
		 * injection will fail. Core should iterate over all of the registered panels
		 * and call print_template() on each unique class type.
		 */
		add_action( 'customize_controls_print_footer_scripts', array( $panel, 'print_template' ) );

		$wp_customize->add_panel( $panel );
	}

	/**
	 * Preview featured item insertions (auto-drafts) and deletions.
	 */
	public function preview_items_list() {
		add_filter( 'customize_featured_content_demo_items', array( $this, 'filter_featured_items' ) );
	}

	/**
	 * Filter featured items list to apply the customized state.
	 *
	 * Inject featured items created in the current changeset, and remove the items that have been trashed.
	 *
	 * @see Model::get_items()
	 *
	 * @param array $item_ids Items.
	 * @return array Item IDs.
	 */
	public function filter_featured_items( $item_ids ) {

		foreach ( $this->manager->settings() as $setting ) {
			if ( $setting instanceof Featured_Item_Property_Customize_Setting && 'status' === $setting->property ) {
				$status = $setting->value();
				if ( 'publish' === $status ) {
					$item_ids[] = $setting->post_id;
				} elseif ( 'trash' === $status ) {
					$item_ids = array_diff( $item_ids, array( $setting->post_id ) );
				}
			}
		}

		return $item_ids;
	}

	/**
	 * Add recognition for dynamically-created featured item settings.
	 *
	 * @param false|array $setting_args The arguments to the WP_Customize_Setting constructor.
	 * @param string      $setting_id   ID for dynamic setting.
	 * @return array|false Setting args or `false` if the `$setting_id` was not recognized.
	 */
	public function filter_customize_dynamic_setting_args( $setting_args, $setting_id ) {
		if ( preg_match( Featured_Item_Property_Customize_Setting::ID_PATTERN, $setting_id, $matches ) ) {
			if ( false == $setting_args ) {
				$setting_args = array();
			}
			$setting_args = array_merge(
				$setting_args,
				array(
					'type' => Featured_Item_Property_Customize_Setting::TYPE,
					'plugin' => $this->plugin,
					'post_id' => $matches['post_id'],
					'property' => $matches['property'],
				)
			);
		}
		return $setting_args;
	}

	/**
	 * Assign WP_Customize_Setting subclass to be used for the featured items.
	 *
	 * @param string $setting_class WP_Customize_Setting or a subclass.
	 * @param string $setting_id    ID for dynamic setting.
	 * @param array  $setting_args  Setting args.
	 * @return string Class name.
	 */
	public function filter_customize_dynamic_setting_class( $setting_class, $setting_id, $setting_args ) {
		unset( $setting_id );
		if ( isset( $setting_args['type'] ) && Featured_Item_Property_Customize_Setting::TYPE === $setting_args['type'] ) {
			$setting_class = __NAMESPACE__ . '\\Featured_Item_Property_Customize_Setting';
		}
		return $setting_class;
	}

	/**
	 * Add recognition for dynamically-created featured item partials.
	 *
	 * @param false|array $partial_args The arguments to the WP_Customize_Setting constructor.
	 * @param string      $partial_id   ID for dynamic partial.
	 * @return array|false Partial args or `false` if the `$partial_id` was not recognized.
	 */
	public function filter_customize_dynamic_partial_args( $partial_args, $partial_id ) {
		if ( preg_match( '#^featured_item\[(?P<post_id>\d+)\]$#', $partial_id, $matches ) ) {
			if ( false == $partial_args ) {
				$partial_args = array();
			}

			$partial_args = array_merge(
				$partial_args,
				array(
					'plugin' => $this->plugin,
					'post_id' => intval( $matches['post_id'] ),
					'type' => Featured_Item_Customize_Partial::TYPE,
				)
			);
		}
		return $partial_args;
	}

	/**
	 * Assign WP_Customize_Partial subclass to be used for the featured items.
	 *
	 * @param string $partial_class WP_Customize_Partial or a subclass.
	 * @param string $partial_id    ID for dynamic partial.
	 * @param array  $partial_args  Partial args.
	 * @return string Class name.
	 */
	public function filter_customize_dynamic_partial_class( $partial_class, $partial_id, $partial_args ) {
		unset( $partial_id );
		if ( isset( $partial_args['type'] ) && Featured_Item_Customize_Partial::TYPE === $partial_args['type'] ) {
			$partial_class = __NAMESPACE__ . '\\Featured_Item_Customize_Partial';
		}
		return $partial_class;
	}
}
