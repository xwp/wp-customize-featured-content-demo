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

		// Sync status of featured items with the status of the changeset.
		add_action( 'transition_post_status', array( $this, 'keep_alive_auto_drafts_at_transition_post_status' ), 20, 3 );
		add_action( 'delete_post', array( $this, 'delete_changeset_featured_item_auto_draft_posts' ) );
	}

	/**
	 * Get featured item posts referenced in a given changeset.
	 *
	 * @param string $changeset_uuid Changeset UUID.
	 * @param string $status         Post status. Defaults top auto-draft.
	 * @return \WP_Post[] Featured item posts.
	 */
	public function get_featured_items_in_changeset( $changeset_uuid, $status = 'auto-draft' ) {
		require_once ABSPATH . WPINC . '/class-wp-customize-manager.php';
		$wp_customize = new \WP_Customize_Manager( compact( 'changeset_uuid' ) );

		// Make sure the featured item settings get added.
		$wp_customize->register_dynamic_settings();

		$post_ids = array();
		foreach ( $wp_customize->settings() as $setting ) {
			if ( $setting instanceof Featured_Item_Property_Customize_Setting ) {
				$post_ids[] = $setting->post_id;
			}
		}

		// No featured items are in the changeset so nothing to do.
		if ( empty( $post_ids ) ) {
			return array();
		}

		$query = new \WP_Query( array(
			'post__in' => $post_ids,
			'posts_per_page' => -1,
			'post_type' => Model::POST_TYPE,
			'post_status' => $status,
			'no_found_rows' => true,
			'cache_results' => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
			'lazy_load_term_meta' => false,
		) );

		return $query->posts;
	}

	/**
	 * Make sure that auto-draft featured items get their post_date bumped to prevent premature garbage-collection.
	 *
	 * When a changeset is updated but remains an auto-draft, ensure the post_date
	 * for the auto-draft featured items remains the same so that it will be
	 * garbage-collected at the same time by `wp_delete_auto_drafts()`. Otherwise,
	 * if the changeset is updated to be a draft then update the featured items
	 * to have a far-future post_date so that they will never be garbage collected
	 * unless the changeset post itself is deleted.
	 *
	 * @see wp_delete_auto_drafts()
	 *
	 * @param string   $new_status Transition to this post status.
	 * @param string   $old_status Previous post status.
	 * @param \WP_Post $post Post data.
	 */
	public function keep_alive_auto_drafts_at_transition_post_status( $new_status, $old_status, $post ) {
		unset( $old_status );
		global $wpdb;

		// Short-circuit if not a changeset or if the changeset was published.
		if ( 'customize_changeset' !== $post->post_type || 'publish' === $new_status ) {
			return;
		}

		if ( 'auto-draft' === $new_status ) {
			/*
			 * Keep the post date for the featured item matching the changeset
			 * so that it will not be garbage-collected before the changeset.
			 */
			$new_post_date = $post->post_date;
		} else {
			/*
			 * Since the changeset no longer has an auto-draft (and it is not published)
			 * it is now a persistent changeset, a long-lived draft, and so any
			 * associated auto-draft featured items should have their dates
			 * pushed out very far into the future to prevent them from ever
			 * being garbage-collected.
			 */
			$new_post_date = gmdate( 'Y-m-d H:i:d', strtotime( '+100 years' ) );
		}

		foreach ( $this->get_featured_items_in_changeset( $post->post_name, 'auto-draft' ) as $post ) {
			$wpdb->update(
				$wpdb->posts,
				array(
					'post_date' => $new_post_date, // Note wp_delete_auto_drafts() only looks at this this date.
				),
				array(
					'ID' => $post->ID,
				)
			);
			clean_post_cache( $post->ID );
		}
	}

	/**
	 * Delete auto-draft featured_item posts associated with the supplied changeset.
	 *
	 * @param int $post_id Post ID for the customize_changeset.
	 */
	function delete_changeset_featured_item_auto_draft_posts( $post_id ) {
		$post = get_post( $post_id );
		if ( ! $post || 'customize_changeset' !== $post->post_type ) {
			return;
		}
		foreach ( $this->get_featured_items_in_changeset( $post->post_name, 'auto-draft' ) as $post ) {
			wp_delete_post( $post->ID, true );
		}
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

		$this->manager->register_control_type( __NAMESPACE__ . '\Featured_Item_Field_Customize_Control' );
		$this->manager->register_control_type( __NAMESPACE__ . '\Featured_Item_Status_Customize_Control' );
		$this->manager->register_control_type( __NAMESPACE__ . '\Featured_Item_Element_Positioning_Customize_Control' );

		// Note that settings and sections will by dynamically added via JS.
		$panel = new Featured_Items_Customize_Panel( $this->manager, 'featured_items', array(
			'title' => __( 'Featured Items', 'customize-featured-content-demo' ),
			'plugin' => $this->plugin,
			'capability' => $this->plugin->model->object->cap->edit_posts,
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
