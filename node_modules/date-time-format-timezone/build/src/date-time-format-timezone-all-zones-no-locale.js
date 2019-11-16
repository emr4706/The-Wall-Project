/*
 * Copyright 2017, Yahoo Inc.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var myGlobal = (typeof global !== "undefined" && {}.toString.call(global) === '[object global]') ? global : window;
(require('./code/polyfill.js').default)(myGlobal);
(require('./code/data-loader.js').default)(myGlobal);
(require('./data/tzdata.js'))(myGlobal);
module.exports = myGlobal.Intl.DateTimeFormat;