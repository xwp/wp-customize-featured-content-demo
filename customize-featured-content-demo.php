<?php
/**
 * Plugin Name: Customize Featured Content (Demo)
 * Plugin URI:  https://github.com/xwp/wp-customize-featured-content-demo
 * Description: Select items to feature on your site.
 * Author:      Weston Ruter, XWP
 * Author URI:  https://make.xwp.co/
 * Text Domain: customize-featured-content-demo
 * Domain Path: /languages
 * Version:     0.1.0-alpha
 *
 * @package Customize_Featured_Content_Demo
 */

/*
 * Copyright (c) 2017 XWP (https://xwp.co/)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License, version 2 or, at
 * your discretion, any later version, as published by the Free
 * Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA
 */

namespace Customize_Featured_Content_Demo;

spl_autoload_register( function( $class_name ) {
	if ( 0 !== strpos( $class_name, __NAMESPACE__ . '\\' ) ) {
		return;
	}
	$class_name = substr( $class_name, strlen( __NAMESPACE__ ) + 1 );
	$filename = 'class-' . str_replace( array( '\\', '_' ), array( '/', '-' ), strtolower( $class_name ) ) . '.php';
	require_once dirname( __FILE__ ) . '/php/' . $filename;
} );

global $customize_featured_content_demo_plugin;
$customize_featured_content_demo_plugin = new Plugin();
add_action( 'plugins_loaded', array( $customize_featured_content_demo_plugin, 'init' ), 100 );
