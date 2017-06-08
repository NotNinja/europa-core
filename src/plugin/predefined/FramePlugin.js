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

var Plugin = require('../Plugin');

/**
 * A {@link Plugin} which outputs the contents of nested frame.
 *
 * @public
 * @class
 * @extends Plugin
 */
var FramePlugin = Plugin.extend({

  /**
   * @override
   */
  after: function(conversion, context) {
    conversion.window = context.previousWindow;
  },

  /**
   * @override
   */
  before: function(conversion, context) {
    context.previousWindow = conversion.window;
  },

  /**
   * @override
   */
  convert: function(conversion, context) {
    var window = conversion.element.contentWindow;

    if (window) {
      conversion.window = window;

      conversion.europa.convertElement(window.document.body, conversion);
    }

    return false;
  },

  /**
   * @override
   */
  getTagNames: function() {
    return [ 'frame', 'iframe' ];
  }

});

module.exports = FramePlugin;
