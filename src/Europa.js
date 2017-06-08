/*
 * Copyright (C) 2017 Alasdair Mercer, !ninja
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

var Nevis = require('nevis/lite');

var Conversion = require('./Conversion');
var DefaultPreset = require('./plugin/preset/DefaultPreset');
var DOMUtilities = require('./util/DOMUtilities');
var Option = require('./option/Option');
var OptionParser = require('./option/OptionParser');
var Plugin = require('./plugin/Plugin');
var PluginManager = require('./plugin/PluginManager');
var Preset = require('./plugin/preset/Preset');
var ServiceManager = require('./service/ServiceManager');
var Utilities = require('./util/Utilities');

var pluginManager = new PluginManager();
pluginManager.registerPreset(new DefaultPreset());
var serviceManager = new ServiceManager();

/**
 * Enables configuration of a HTML to Markdown converter that supports HTML strings and DOM elements.
 *
 * @param {Europa~Options} [options] - the options to be used
 * @public
 * @class
 * @extends Nevis
 */
var Europa = Nevis.extend(function(options) {
  this._options = options;
  this._window = null;
}, {

  /**
   * Converts the specified <code>html</code> into Markdown based on the options configured for this {@link Europa}
   * instance.
   *
   * <code>html</code> can either be an HTML string or a DOM element whose HTML contents are to be converted into
   * Markdown.
   *
   * @param {Element|string} html - the HTML (or element whose inner HTML is) to be converted into Markdown
   * @return {string} The Markdown converted from <code>html</code>.
   * @public
   * @memberof Europa#
   */
  convert: function(html) {
    if (!html) {
      return '';
    }

    var window = this.window;
    var options = new OptionParser([
      new Option('absolute', false),
      new Option('baseUri', function() {
        return serviceManager.getService('window').getBaseUri(window);
      }),
      new Option('inline', false)
    ])
    .parse(this._options);
    var root;

    if (typeof html === 'string') {
      root = window.document.createElement('div');
      root.innerHTML = html;
    } else {
      root = html;
    }

    var conversion = new Conversion(this, options);

    Utilities.forOwn(pluginManager.plugins, function(plugin) {
      plugin.beforeAll(conversion);
    });

    this.convertElement(root, conversion);

    Utilities.forOwn(pluginManager.plugins, function(plugin) {
      plugin.afterAll(conversion);
    });

    return conversion.append('').buffer.trim();
  },

  /**
   * Converts the specified <code>element</code> and it's children into Markdown using the <code>conversion</code>
   * provided.
   *
   * Nothing happens if <code>element</code> is <code>null</code> or is invisible (simplified detection used).
   *
   * @param {Element} element - the element (along well as it's children) to be converted into Markdown
   * @param {Conversion} conversion - the current {@link Conversion}
   * @return {void}
   * @public
   * @memberof Europa#
   */
  convertElement: function(element, conversion) {
    if (!element) {
      return;
    }

    var convertChildren = false;
    var window = this.window;
    var context, i, plugin, value;

    if (element.nodeType === window.Node.ELEMENT_NODE) {
      if (!DOMUtilities.isVisible(element)) {
        return;
      }

      conversion.element = element;

      context = {};
      plugin = pluginManager.plugins[conversion.tagName];
      convertChildren = true;

      if (plugin) {
        plugin.before(conversion, context);
        convertChildren = plugin.convert(conversion, context);
      }

      if (convertChildren) {
        for (i = 0; i < element.childNodes.length; i++) {
          this.convertElement(element.childNodes[i], conversion);
        }
      }

      if (plugin) {
        plugin.after(conversion, context);
      }
    } else if (element.nodeType === window.Node.TEXT_NODE) {
      value = element.nodeValue || '';

      if (conversion.inPreformattedBlock) {
        conversion.output(value);
      } else if (conversion.inCodeBlock) {
        conversion.output(value.replace(/`/g, '\\`'));
      } else {
        conversion.output(value, true);
      }
    }
  },

  /**
   * Destroys the window used by this {@link Europa} instance.
   *
   * This allows closeable {@link WindowService} implementations to close the window and free up resources. However,
   * this instance can and will simply retrieve another Window from the {@link WindowService} the next time it is
   * required.
   *
   * @return {Europa} A reference to this {@link Europa} for chaining purposes.
   * @public
   * @memberof Europa#
   */
  destroy: function() {
    if (this._window) {
      serviceManager.getService('window').closeWindow(this._window);
      this._window = null;
    }

    return this;
  }

}, {

  /**
   * A convient reference to {@link Plugin} exposed on {@link Europa} for cases where Europa Core is bundled.
   *
   * @public
   * @static
   * @type {Function}
   * @memberof Europa
   */
  Plugin: Plugin,

  /**
   * A convient reference to {@link Preset} exposed on {@link Europa} for cases where Europa Core is bundled.
   *
   * @public
   * @static
   * @type {Function}
   * @memberof Europa
   */
  Preset: Preset,

  /**
   * Registers the specified <code>plugin</code> to be used by all {@link Europa} instances.
   *
   * If <code>plugin</code> declares support for a tag name which already has a {@link Plugin} registered for it,
   * <code>plugin</code> will replace the previously registered plugin, but only for conflicting tag names.
   *
   * @param {Plugin} plugin - the {@link Plugin} to be registered
   * @return {void}
   * @public
   * @static
   * @memberof Europa
   */
  register: function(plugin) {
    pluginManager.register(plugin);
  },

  /**
   * Registers all of the plugins within the specified <code>preset</code> to be used by all {@link Europa} instances.
   *
   * If a {@link Plugin} within <code>preset</code> declares support for a tag name which already has a plugin
   * registered for it, the plugin within <code>preset</code> will replace the previously registered plugin, but only
   * for conflicting tag names.
   *
   * @param {Preset} preset - the {@link Preset} whose plugins are to be registered
   * @return {void}
   * @public
   * @static
   * @memberof Europa
   */
  registerPreset: function(preset) {
    pluginManager.registerPreset(preset);
  },

  /**
   * Configures the <code>service</code> provided to be used by all {@link Europa} instances.
   *
   * @param {Service} service - the {@link Service} to be configured
   * @return {void}
   * @throws {Error} If a {@link Service} has already been configured with the same name.
   * @public
   * @static
   * @memberof Europa
   */
  use: function(service) {
    serviceManager.setService(service.getName(), service);
  }

});

Object.defineProperties(Europa.prototype, {

  document: {
    /**
     * Returns the document to be used for HTML to Markdown conversion by this {@link Europa} instance.
     *
     * @return {Document} The document.
     * @public
     * @memberof Europa#
     * @alias document
     */
    get: function() {
      return this.window.document;
    }
  },

  window: {
    /**
     * Returns the window to be used for HTML to Markdown conversion by this {@link Europa} instance.
     *
     * @return {Window} The window.
     * @public
     * @memberof Europa#
     * @alias window
     */
    get: function() {
      if (!this._window) {
        this._window = serviceManager.getService('window').getWindow();
      }

      return this._window;
    }
  }

});

module.exports = Europa;

/**
 * The options used by {@link Europa}.
 *
 * @typedef {Object} Europa~Options
 * @property {boolean} [absolute=false] - Whether absolute URLS should be used for anchors/images.
 * @property {string} [baseUri] - The base URI for the window.
 * @property {boolean} [inline=false] - Whether anchor/image URLs are to be inserted inline.
 */