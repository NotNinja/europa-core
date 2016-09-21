/*
 * Copyright (C) 2016 Alasdair Mercer, Skelp
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

'use strict'

var forOwn = require('lodash.forown')
var Oopsy = require('oopsy')

var Transformation = require('./transformation').Transformation

/**
 * Transforms an HTML string or DOM element into Markdown.
 *
 * @param {Window} window - the <code>Window</code> to be used
 * @param {Object<string, Plugin>} plugins - the plugins to be used
 * @public
 * @constructor Transformer
 * @extends {Oopsy}
 */
var Transformer = Oopsy.extend(function(window, plugins) {
  /**
   * The <code>Window</code> for this {@link Transformer}.
   *
   * @public
   * @type {Window}
   */
  this.window = window

  /**
   * The <code>HTMLDocument</code> for this {@link Transformer}.
   *
   * @public
   * @type {HTMLDocument}
   */
  this.document = window.document

  /**
   * The plugins for this {@link Transformer}.
   *
   * @public
   * @type {Object<string, Plugin>}
   */
  this.plugins = plugins
}, {

  /**
   * Transforms the specified <code>html</code> into Markdown using the <code>options</code> provided.
   *
   * <code>html</code> can either be an HTML string or a DOM element whose HTML contents are to be transformed into
   * Markdown.
   *
   * @param {Element|string} html - the HTML (or element whose inner HTML) to be transformed into Markdown
   * @param {Transformation~Options} options - the options to be used
   * @return {string} The transformed Markdown.
   * @public
   */
  transform: function(html, options) {
    if (!html) {
      return ''
    }

    var root
    if (typeof html === 'string') {
      root = this.document.createElement('div')
      root.innerHTML = html
    } else {
      root = html
    }

    var transformation = new Transformation(this, options)

    forOwn(this.plugins, function(plugin) {
      plugin.beforeAll(transformation)
    })

    this.transformElement(root, transformation)

    forOwn(this.plugins, function(plugin) {
      plugin.afterAll(transformation)
    })

    return transformation.append('').buffer.trim()
  },

  /**
   * Transforms the specified <code>element</code> and it's children into Markdown using the <code>transformation</code>
   * provided.
   *
   * Nothing happens if <code>element</code> is <code>null</code> or is invisible (simplified detection used).
   *
   * @param {Element} element - the element to be transformed into Markdown as well as it's children
   * @param {Transformation} transformation - the current {@link Transformation}
   * @return {void}
   * @public
   */
  transformElement: function(element, transformation) {
    if (!element) {
      return
    }

    var context
    var i
    var plugin
    var transformChildren
    var value

    if (element.nodeType === this.window.Node.ELEMENT_NODE) {
      if (!this._isVisible(element)) {
        return
      }

      transformation.element = element

      context = {}
      plugin = this.plugins.get(transformation.tagName)
      transformChildren = true

      if (plugin) {
        plugin.before(transformation, context)
        transformChildren = plugin.transform(transformation, context)
      }

      if (transformChildren) {
        for (i = 0; i < element.childNodes.length; i++) {
          this.transformElement(element.childNodes[i], transformation)
        }
      }

      if (plugin) {
        plugin.after(transformation, context)
      }
    } else if (element.nodeType === this.window.Node.TEXT_NODE) {
      value = element.nodeValue || ''

      if (transformation.inPreformattedBlock) {
        transformation.output(value)
      } else if (transformation.inCodeBlock) {
        transformation.output(value.replace(/`/g, '\\`'))
      } else {
        transformation.output(value, true)
      }
    }
  },

  /**
   * Checks whether the specified <code>element</code> is currently visible.
   *
   * This is not a very sophisticated check and could easily be mistaken, but it should catch a lot of the most simple
   * cases.
   *
   * @param {Element} element - the element whose visibility is to be checked
   * @return {boolean} <code>true</code> if <code>element</code> is visible; otherwise <code>false</code>.
   * @private
   */
  _isVisible: function(element) {
    var style = this.window.getComputedStyle(element)

    return style.getPropertyValue('display') !== 'none' && style.getPropertyValue('visibility') !== 'hidden'
  }

})

exports.Transformer = Transformer
