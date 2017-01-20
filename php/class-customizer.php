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
		add_action( 'customize_register', array( $this, 'add_partials' ), 100 );
		add_action( 'customize_preview_init', array( $this, 'preview_items_list' ) );

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
	 * Register panel and control type.
	 *
	 * @see WP_Customize_Posts::register_constructs()
	 *
	 * @param \WP_Customize_Manager $wp_customize Customize manager instance.
	 */
	public function register( \WP_Customize_Manager $wp_customize ) {
		$this->manager = $wp_customize;

		// Register panel type so that templates will be printed. Core should do this by default for any added panel.
		$this->manager->register_panel_type( __NAMESPACE__ . '\\Featured_Items_Customize_Panel' );

		// Register the dynamic control type if it is not already registered by Customize Posts.
		if ( ! class_exists( '\WP_Customize_Dynamic_Control' ) ) {
			$this->manager->register_control_type( __NAMESPACE__ . '\WP_Customize_Dynamic_Control' );
		}

		// @todo Should this register all of the settings or should they be fetched dynamically via REST API call?
		$items = $this->plugin->model->get_items();
		$item_schema = $this->plugin->model->get_item_schema_properties();
		foreach ( $items as $item ) {
			foreach ( $item_schema as $field_id => $field_schema ) {
				if ( ! empty( $field_schema['readonly'] ) ) {
					continue;
				}
				$setting = new Featured_Item_Property_Customize_Setting( $wp_customize, array(
					'post_id' => $item['id'],
					'property' => $field_id,
					'plugin' => $this->plugin,
				) );
				$wp_customize->add_setting( $setting );
			}
		}
		add_filter( 'customize_sanitize_nav_menus_created_posts', array( $this, 'filter_nav_menus_created_posts_setting' ) );

		// Note that sections will by dynamically added via JS.
		$panel = new Featured_Items_Customize_Panel( $this->manager, 'featured_items', array(
			'title' => __( 'Featured Items', 'customize-featured-content-demo' ),
		) );
		$wp_customize->add_panel( $panel );
	}

	/**
	 * Preview featured item insertions (auto-drafts) and deletions.
	 */
	public function preview_items_list() {
		add_filter( 'customize_featured_content_demo_items', array( $this, 'filter_featured_items' ) );
	}

	/**
	 * Filter out featured_item posts from nav_menus_created_posts since we will handle publishing ourselves.
	 *
	 * @param array $post_ids Post IDs that have been created in the customizer session.
	 * @return array Post IDs for auto-draft posts.
	 */
	public function filter_nav_menus_created_posts_setting( $post_ids ) {
		return array_filter( $post_ids, function( $post_id ) {
			return Model::POST_TYPE !== get_post_type( $post_id );
		} );
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
			if ( $setting instanceof Featured_Item_Property_Customize_Setting ) {
				$partial_id = sprintf( '%s[%d]', Featured_Item_Property_Customize_Setting::TYPE, $setting->post_id );
				$partial_settings[ $partial_id ][ $setting->property ] = $setting;
			}
		}

		foreach ( $partial_settings as $partial_id => $settings ) {
			$related_post_setting = $settings['related_post'];
			$partial_args = array(
				'type' => 'featured_item',
				'plugin' => $this->plugin,
				'selector' => sprintf( '.featured-content-item-%d', $related_post_setting->post_id ),
				'primary_setting' => $related_post_setting->id, // First control in section is for related post, so this will get focused via edit shortcut.
				'settings' => array_values( wp_list_pluck( $settings, 'id' ) ),
				'container_inclusive' => true,
				'render_callback' => array( $this, 'render_item_partial' ),
			);
			$this->manager->selective_refresh->add_partial( $partial_id, $partial_args );
		}
	}

	/**
	 * Render item partial.
	 *
	 * @param \WP_Customize_Partial $partial Partial.
	 */
	public function render_item_partial( \WP_Customize_Partial $partial ) {
		$setting = $partial->component->manager->get_setting( $partial->primary_setting );
		if ( $setting instanceof Featured_Item_Property_Customize_Setting ) {
			$this->plugin->view->render_item( $setting->post_id );
		}
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
	 * @param string $setting_id    ID for dynamic setting, usually coming from `$_POST['customized']`.
	 * @param array  $setting_args  WP_Customize_Setting or a subclass.
	 * @return string Class name.
	 */
	public function filter_customize_dynamic_setting_class( $setting_class, $setting_id, $setting_args ) {
		unset( $setting_id );
		if ( isset( $setting_args['type'] ) && Featured_Item_Property_Customize_Setting::TYPE === $setting_args['type'] ) {
			$setting_class = __NAMESPACE__ . '\\Featured_Item_Property_Customize_Setting';
		}
		return $setting_class;
	}
}
