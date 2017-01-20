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
	 * Plugin constructor.
	 *
	 * @param Plugin $plugin Plugin instance.
	 */
	public function __construct( Plugin $plugin ) {
		$this->plugin = $plugin;
	}

	/**
	 * Render items.
	 */
	public function render_items() {
		echo '<ul class="featured-content-items">';
		$item_ids = array_keys( $this->plugin->model->get_items() );
		foreach ( $item_ids as $item_id ) {
			$this->render_item( $item_id );
		}
		echo '</ul>';
	}

	/**
	 * Render item.
	 *
	 * @param int $id Featured item ID.
	 */
	function render_item( $id ) {
		$item = $this->plugin->model->get_item( $id );
		if ( ! $item ) {
			return;
		}

		$related_post = ! empty( $item['related'] ) ? get_post( $item['related'] ) : null;
		if ( $related_post ) {
			if ( ! $item['url'] ) {
				$item['url'] = get_permalink( $related_post->ID );
			}
			if ( ! $item['title'] ) {
				$item['title'] = $related_post->post_title;
			}
			if ( ! $item['excerpt'] ) {
				$item['excerpt'] = $related_post->post_excerpt;
			}
			if ( ! $item['featured_media'] ) {
				$item['featured_media'] = get_post_thumbnail_id( $related_post );
			}
		}
		?>
		<li class="<?php echo esc_attr( "featured-content-item featured-content-item-$id" ); ?>" data-position="<?php echo esc_attr( $item['position'] ); ?>">
			<?php if ( $item['url'] ) : ?>
				<a class="title" href="<?php echo esc_url( $item['url'] ) ?>">
			<?php else : ?>
				<a class="title">
			<?php endif; ?>
				<?php echo wptexturize( esc_html( $item['title'] ) ); ?>
			</a>
			<?php if ( $item['featured_media'] ) : ?>
				<?php echo wp_get_attachment_image( $item['featured_media'], 'thumbnail' ) ?>
			<?php endif; ?>
			<?php if ( $item['excerpt'] ) : ?>
				<div class="description">
					<?php echo wpautop( wptexturize( esc_html( $item['excerpt'] ) ) ); ?>
				</div>
			<?php endif; ?>
		</li>
		<?php
	}
}
