<?php
/**
 * Class View.
 *
 * @package Customize_Featured_Content_Demo
 */

namespace Customize_Featured_Content_Demo;

/**
 * Class View
 *
 * @package Customize_Featured_Content_Demo
 */
class View {

	/**
	 * Plugin instance.
	 *
	 * @var Plugin
	 */
	public $plugin;

	/**
	 * Number of times the items were rendered.
	 *
	 * This is used by the active callback for the featured_items panel to
	 * determine whether or not it is contextual to the current preview.
	 *
	 * @see Featured_Items_Customize_Panel::active_callback()
	 * @var int
	 */
	public $render_items_count = 0;

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
		add_action( 'init', array( $this, 'register_shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Register shortcode.
	 */
	public function register_shortcode() {
		$view = $this; // For PHP 5.3.
		add_shortcode( 'featured_items', function() use ( $view ) {
			ob_start();
			$view->render_items();
			return ob_get_clean();
		} );
	}

	/**
	 * Enqueue scripts.
	 */
	public function enqueue_scripts() {
		wp_enqueue_script( 'customize-featured-content-demo-frontend' );
		wp_enqueue_style( 'customize-featured-content-demo-frontend' );
	}

	/**
	 * Render items.
	 */
	public function render_items() {
		$this->render_items_count += 1;
		$item_ids = array_keys( $this->plugin->model->get_items() );

		/*
		 * Render nothing if there are no items and if not in the customizer preview.
		 * If in the customizer preview, it's key to render the container UL so that
		 * new items can be added to it when they are created without having to
		 * refresh the entire page.
		 */
		if ( empty( $item_ids ) && ! is_customize_preview() ) {
			return;
		}

		$rest_server = rest_get_server();
		$route = '/wp/v2/' . $this->plugin->model->object->rest_base;
		$request = new \WP_REST_Request( 'GET', $route );
		$response = $rest_server->dispatch( $request );

		/*
		 * Force related posts to use the view context instead of the embed context.
		 * This is needed because for some reason the featured_media field is marked
		 * as only having the view and edit contexts.
		 */
		foreach ( $response->data as &$featured_item_data ) {
			if ( empty( $featured_item_data['_links']['related'] ) ) {
				continue;
			}
			foreach ( $featured_item_data['_links']['related'] as &$link ) {
				$link['href'] = add_query_arg( 'context', 'view', $link['href'] );
			}
		}

		/** This filter is documented in wp-includes/rest-api/class-wp-rest-server.php */
		$response = apply_filters( 'rest_post_dispatch', $response, $rest_server, $request );

		$response_data = $rest_server->response_to_data( $response, true );

		// Ensure the links for the linked items also get embedded (2-levels deep).
		foreach ( $response_data as &$featured_item ) {
			if ( empty( $featured_item['_embedded']['related'] ) ) {
				continue;
			}
			foreach ( $featured_item['_embedded']['related'] as &$related ) {
				$post_response = rest_ensure_response( $related );
				$related = $rest_server->response_to_data( $post_response, true );
			}
		}

		echo '<ul class="featured-content-items">';
		echo '<script type="application/json">';
		echo wp_json_encode( $response_data );
		echo '</script>';
		echo '</ul>';
	}

	/**
	 * Get rendered title.
	 *
	 * @param string $title Raw title.
	 * @param int    $id    Item (post) ID.
	 * @return string Rendered title.
	 */
	public function get_rendered_title( $title, $id ) {

		/** This filter is documented in wp-includes/post-template.php*/
		$title = apply_filters( 'the_title', $title, $id );

		$title = convert_smilies( $title );

		return $title;
	}

	/**
	 * Render item.
	 *
	 * @deprecated
	 */
	function render_item() {
		_deprecated_function( __METHOD__, '0.2.0' );
	}
}
