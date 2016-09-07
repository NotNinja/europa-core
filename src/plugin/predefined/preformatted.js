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

/* eslint no-unused-vars: "off" */

import Plugin from '../plugin'

/**
 * A {@link Plugin} which outputs the contents in a preformatted block.
 *
 * @public
 * @extends {Plugin}
 */
class PreformattedPlugin extends Plugin {

  /**
   * @override
   */
  after(transformation, context) {
    transformation.atLeft = false
    transformation.atParagraph = false
    transformation.inPreformattedBlock = context.get('previousInPreformattedBlock')
    transformation.left = context.get('previousLeft')

    transformation.appendParagraph()
  }

  /**
   * @override
   */
  before(transformation, context) {
    context.set('previousInPreformattedBlock', transformation.inPreformattedBlock)
    context.set('previousLeft', transformation.left)
  }

  /**
   * @override
   */
  transform(transformation, context) {
    const value = '    '

    transformation.left += value

    if (transformation.atParagraph) {
      transformation.append(value)
    } else {
      transformation.appendParagraph()
    }
  }

}

export default PreformattedPlugin