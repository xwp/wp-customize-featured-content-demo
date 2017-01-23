=== Customize Featured Content (Demo) ===
Contributors: westonruter, xwp
Tags: customize
Requires at least: 4.7.1
Tested up to: 4.8-alpha
Stable tag: 0.1.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Select items to feature on your site.

== Description ==

This plugin provides an advanced demonstration of how to build a customizer interface for selecting items to feature on your site.
Items have a title, URL, featured image, and excerpt which are pulled from an optional related post or they can be selectively overridden as desired.

This plugin depends on first having the <a href="https://wordpress.org/plugins/customize-object-selector/">Customize Object Selector</a> plugin installed and activated.

Example of how to integrate with your theme, say to show the featured items on the homepage:

<pre lang="php">
<?php if ( is_front_page() && function_exists( '\Customize_Featured_Content_Demo\render_items' ) ) : ?>
	<?php \Customize_Featured_Content_Demo\render_items(); ?>
<?php endif; ?>
</pre>

== Changelog ==

= 0.1.0-alpha =
Work in progress
