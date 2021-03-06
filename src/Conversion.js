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

var Utilities = require('./util/Utilities');

/**
 * Contains contextual information for a single conversion process.
 *
 * @param {Europa} europa - the {@link Europa} instance responsible for this conversion
 * @param {Europa~Options} options - the options to be used
 * @public
 * @class
 * @extends Nevis
 */
var Conversion = Nevis.extend(function(europa, options) {
  /**
   * The {@link Europa} instance responsible for this {@link Conversion}.
   *
   * @public
   * @type {Europa}
   * @memberof Conversion#
   */
  this.europa = europa;

  /**
   * The options for this {@link Conversion}.
   *
   * @public
   * @type {Europa~Options}
   * @memberof Conversion#
   */
  this.options = options;

  /**
   * Whether the buffer is at the start of the current line.
   *
   * @public
   * @type {boolean}
   * @memberof Conversion#
   */
  this.atLeft = true;

  /**
   * Whether any white space should be removed from the start of the next output.
   *
   * @public
   * @type {boolean}
   * @memberof Conversion#
   */
  this.atNoWhiteSpace = true;

  /**
   * Whether the buffer is at the start of a paragraph.
   *
   * @public
   * @type {boolean}
   * @memberof Conversion#
   */
  this.atParagraph = true;

  /**
   * The conversion output buffer to which the Markdown will be written.
   *
   * @public
   * @type {string}
   * @memberof Conversion#
   */
  this.buffer = '';

  /**
   * The context for this {@link Conversion}.
   *
   * @public
   * @type {Object.<string, *>}
   * @memberof Conversion#
   */
  this.context = {};

  /**
   * Whether the buffer is currently within a code block.
   *
   * @public
   * @type {boolean}
   * @memberof Conversion#
   */
  this.inCodeBlock = false;

  /**
   * Whether the buffer is currently within an ordered list.
   *
   * @public
   * @type {boolean}
   * @memberof Conversion#
   */
  this.inOrderedList = false;

  /**
   * Whether the buffer is currently within a preformatted block.
   *
   * @public
   * @type {boolean}
   * @memberof Conversion#
   */
  this.inPreformattedBlock = false;

  /**
   * The last string to be output next to the buffer.
   *
   * @public
   * @type {string}
   * @memberof Conversion#
   */
  this.last = null;

  /**
   * The start of the current line.
   *
   * @public
   * @type {string}
   * @memberof Conversion#
   */
  this.left = '\n';

  /**
   * The depth of nested lists.
   *
   * @public
   * @type {number}
   * @memberof Conversion#
   */
  this.listDepth = 0;

  /**
   * The one-based index for the current list item within the current list.
   *
   * @public
   * @type {number}
   * @memberof Conversion#
   */
  this.listIndex = 1;

  this._document = europa.document;
  this._element = null;
  this._tagName = null;
  this._window = europa.window;
}, {

  /**
   * Appends the last output string to the buffer and then queues the specified <code>string</code> to be output.
   *
   * @param {string} string - the string to be appended
   * @return {Conversion} A reference to this {@link Conversion} for chaining purposes.
   * @public
   * @memberof Conversion#
   */
  append: function(string) {
    if (this.last != null) {
      this.buffer += this.last;
    }

    this.last = string;

    return this;
  },

  /**
   * Appends a paragraph to the output buffer.
   *
   * @return {Conversion} A reference to this {@link Conversion} for chaining purposes.
   * @public
   * @memberof Conversion#
   */
  appendParagraph: function() {
    if (this.atParagraph) {
      return this;
    }

    if (!this.atLeft) {
      this.append(this.left);

      this.atLeft = true;
    }

    this.append(this.left);

    this.atNoWhiteSpace = true;
    this.atParagraph = true;

    return this;
  },

  /**
   * Outputs the specified <code>string</code> to the buffer.
   *
   * Optionally, <code>string</code> can be "cleaned" before being output. Doing so will replace any certain special
   * characters as well as some white space.
   *
   * @param {string} string - the string to be output
   * @param {boolean} [clean=false] - <code>true</code> to clean <code>string</code>; otherwise <code>false</code>
   * @return {Conversion} A reference to this {@link Conversion} for chaining purposes.
   * @public
   * @memberof Conversion#
   */
  output: function(string, clean) {
    if (!string) {
      return this;
    }

    string = string.replace(/\r\n/g, '\n');

    if (clean) {
      string = string.replace(/\n([ \t]*\n)+/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]+/g, ' ');

      Utilities.forOwn(Conversion.replacements, function(value, key) {
        string = string.replace(Conversion.replacementsRegExp[key], value);
      });
    }

    if (!this.inPreformattedBlock) {
      if (this.atNoWhiteSpace) {
        string = string.replace(/^[ \t\n]+/, '');
      } else if (/^[ \t]*\n/.test(string)) {
        string = string.replace(/^[ \t\n]+/, '\n');
      } else {
        string = string.replace(/^[ \t]+/, ' ');
      }
    }

    if (!string) {
      return this;
    }

    this.atLeft = /\n$/.test(string);
    this.atNoWhiteSpace = /[ \t\n]$/.test(string);
    this.atParagraph = /\n{2}$/.test(string);

    return this.append(string.replace(/\n/g, this.left));
  },

  /**
   * Replaces the start of the current line with the <code>string</code> provided.
   *
   * @param {string} string - the string to replace the start of the current line
   * @return {Conversion} A reference to this {@link Conversion} for chaining purposes.
   * @public
   * @memberof Conversion#
   */
  replaceLeft: function(string) {
    if (!this.atLeft) {
      this.append(this.left.replace(/[ ]{2,4}$/, string));

      this.atLeft = true;
      this.atNoWhiteSpace = true;
      this.atParagraph = true;
    } else if (this.last) {
      this.last = this.last.replace(/[ ]{2,4}$/, string);
    }

    return this;
  }

}, {

  /**
   * A map of special characters and their replacements.
   *
   * @public
   * @static
   * @type {Object.<string, string>}
   * @memberof Conversion
   */
  replacements: {
    '\\\\': '\\\\',
    '\\[': '\\[',
    '\\]': '\\]',
    '>': '\\>',
    '_': '\\_',
    '\\*': '\\*',
    '`': '\\`',
    '#': '\\#',
    '([0-9])\\.(\\s|$)': '$1\\.$2',
    '\u00a9': '(c)',
    '\u00ae': '(r)',
    '\u2122': '(tm)',
    '\u00a0': ' ',
    '\u00b7': '\\*',
    '\u2002': ' ',
    '\u2003': ' ',
    '\u2009': ' ',
    '\u2018': '\'',
    '\u2019': '\'',
    '\u201c': '"',
    '\u201d': '"',
    '\u2026': '...',
    '\u2013': '--',
    '\u2014': '---'
  },

  /**
   * A map of special characters and the regular expression used to identify them.
   *
   * @public
   * @static
   * @type {Object.<string, RegExp>}
   * @memberof Conversion
   */
  replacementsRegExp: {}

});

Object.defineProperties(Conversion.prototype, {

  document: {
    /**
     * Returns the current document for this {@link Conversion}.
     *
     * This may not be the same document as is associated with the {@link Europa} instance as this document may be
     * nested (e.g. a frame).
     *
     * @return {Document} The current document.
     * @public
     * @memberof Conversion#
     * @alias document
     */
    get: function() {
      return this._document;
    }
  },

  element: {
    /**
     * Returns the current element for this {@link Conversion}.
     *
     * @return {Element} The current element.
     * @public
     * @memberof Conversion#
     * @alias element
     */
    get: function() {
      return this._element;
    },

    /**
     * Sets the current element for this {@link Conversion} to <code>element</code>.
     *
     * @param {Element} element - the current element to be set
     * @return {void}
     * @public
     * @memberof Conversion#
     * @alias element
     */
    set: function(element) {
      this._element = element;
      this._tagName = element && element.tagName ? element.tagName.toLowerCase() : null;
    }
  },

  tagName: {
    /**
     * Returns the name of the tag for the current element for this {@link Conversion}.
     *
     * The tag name will always be in lower case, when available.
     *
     * @return {string} The current element's tag name.
     * @public
     * @memberof Conversion#
     * @alias tagName
     */
    get: function() {
      return this._tagName;
    }
  },

  window: {
    /**
     * Returns the current window for this {@link Conversion}.
     *
     * This may not be the same window as is associated with the {@link Europa} instance as this window may be nested
     * (e.g. a frame).
     *
     * @return {Window} The current window.
     * @public
     * @memberof Conversion#
     * @alias window
     */
    get: function() {
      return this._window;
    },

    /**
     * Sets the current window for this {@link Conversion} to <code>window</code>.
     *
     * This may not be the same window as is associated with the {@link Europa} instance as this window may be nested
     * (e.g. a frame).
     *
     * @param {Window} window - the window to be set
     * @return {void}
     * @public
     * @memberof Conversion#
     * @alias window
     */
    set: function(window) {
      this._window = window;
      this._document = window ? window.document : null;
    }
  }

});

Utilities.forOwn(Conversion.replacements, function(value, key) {
  Conversion.replacementsRegExp[key] = new RegExp(key, 'g');
});

module.exports = Conversion;
