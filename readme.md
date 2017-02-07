<!-- DO NOT EDIT THIS FILE; it is auto-generated from readme.txt -->
# Customize Featured Content (Demo)

Select items to feature on your site.

**Contributors:** [westonruter](https://profiles.wordpress.org/westonruter), [xwp](https://profiles.wordpress.org/xwp)  
**Tags:** [customize](https://wordpress.org/plugins/tags/customize)  
**Requires at least:** 4.7.1  
**Tested up to:** 4.8-alpha  
**Stable tag:** 0.1.0  
**License:** [GPLv2 or later](http://www.gnu.org/licenses/gpl-2.0.html)  

[![Build Status](https://travis-ci.org/xwp/wp-customize-featured-content-demo.svg?branch=master)](https://travis-ci.org/xwp/wp-customize-featured-content-demo) 

## Description ##

This plugin provides an advanced demonstration of how to build a customizer interface for selecting items to feature on your site.
Items have a title, URL, and featured image which are pulled from an optional related post or they can be selectively overridden as desired.

This plugin depends on first having the <a href="https://wordpress.org/plugins/customize-object-selector/">Customize Object Selector</a> plugin installed and activated. Without this plugin active, you won't be able to select a related post and will have to enter the title, featured image, and URL for each item.

A `[featured_items]` shortcode is included, allowing you to render the featured items in any page or post.

You may also render the items as part of your theme with the following example code which renders the items on the front page:

```php
<?php if ( is_front_page() && function_exists( '\Customize_Featured_Content_Demo\render_items' ) ) : ?>
	<?php \Customize_Featured_Content_Demo\render_items(); ?>
<?php endif; ?>
```

## Changelog ##

### 0.2.0 ###
* Add styling of featured item titles for both coloring and positioning (#4)[https://github.com/xwp/wp-customize-featured-content-demo/pull/4].
* Allow featured items to be draggable in the preview (#6)[https://github.com/xwp/wp-customize-featured-content-demo/pull/6].

### 0.1.0 ###
* Featured Items panel is contextual to previewing URLs that have featured items rendered.
* New items can be added (via `auto-draft` status).
* Items can be trashed (and untrashed).
* Selecting related post to serve as the basis of the item. Related post provides default featured item, title, excerpt, and URL which all appear as placeholders.
* Allows overriding featured image, title, and URL which come from the related post.
* Shift-click on featured image to focus on the corresponding control.
* Shift-click on title to inline edit. Edit mode reveals raw value and upon blur/enter/esc the partial refreshes with the rendered title. (Try adding :-) or "double-quotes" and -- dashes to see filters apply.)
* Re-ordering items via drag-and-drop of sections; items rearrange without any selective refresh request.
* Featured item data are lazy-loaded from the REST API. No settings are registered statically; all are recognized dynamically.
* All sections, controls, and partials are constructed only when needed.
* Custom post type has `Model` abstraction in front of it which has a schema which is then used to define the REST API endpoints and the customizer settings alike.


