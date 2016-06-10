var Hls = require("metacdn.hls.js");
var attachVideojsStreamrootProvider = require('./vjs-hls');

attachVideojsStreamrootProvider(window, window.videojs, Hls);
