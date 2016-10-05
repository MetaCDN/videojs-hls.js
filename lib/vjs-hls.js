require("videojs-quality-picker");

var attachVideojsStreamrootProvider = function (window, videojs, Hls) {
    function StreamrootProviderHLS (source, tech) {
        tech.name_ = 'streamrootHLS';

        var _video = tech.el();
        var _hls;

        function initialize() {
            var hlsjsConfig = tech.options_.hlsjsConfig || {};

            _hls = new Hls(hlsjsConfig);
            if (hlsjsConfig.event) {
                for (var x in hlsjsConfig.event) {
                    _hls.on(Hls.Events[x], hlsjsConfig.event[x]);
                }
            }
            _hls.on(Hls.Events.MANIFEST_PARSED, _onMetaData);
            _hls.on(Hls.Events.LEVEL_SWITCH, _onLevelSwitch);
            _hls.on(Hls.Events.LEVEL_LOADING, _onLevelLoading);

            _video.addEventListener('error', handleVideoEvent);
            _video.addEventListener('play', handleStartEvent);
            _video.addEventListener('pause', handleStopEvent);

            _hls.attachMedia(_video);
        }

        this.dispose = function () {
            _hls.destroy();
        };

        function handleStartEvent() {
            _hls.startLoad();
        }

        function handleStopEvent() {
            _hls.stopLoad();
        }

        function handleVideoEvent(evt) {
            switch (evt.type) {
                case 'error':
                    switch(evt.target.error.code) {
                        case evt.target.error.MEDIA_ERR_ABORTED:
                            break;
                        case evt.target.error.MEDIA_ERR_DECODE:
                            handleMediaError();
                            break;
                        case evt.target.error.MEDIA_ERR_NETWORK:
                            break;
                        case evt.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            break;
                    }
             }
        }

        function load(source) {
            _hls.loadSource(source.src);
        }

        function switchQuality(qualityId, trackType) {
            _hls.nextLevel = qualityId;
        }

        function _onLevelSwitch(event, level) {
            tech.trigger('switchqualitylevel', level);
        }

        function _onLevelLoading(url, level) {
            tech.trigger('levelLoading', level);
        }


        function handleMediaError() {
            _hls.recoverMediaError();
            _video.play();
        }

        function _onMetaData(event, data) {
            var cleanTracklist = [];

            if (data.levels.length > 1) {
                var autoLevel = {
                    id: -1,
                    label: "auto",
                    selected: -1 === _hls.manualLevel
                };
                cleanTracklist.push(autoLevel);
            }

            data.levels.forEach(function(level, index) {
                var quality = {}; // Don't write in level (shared reference with Hls.js)
                quality.id = index;
                quality.selected = index === _hls.manualLevel;
                quality.label = _levelLabel(level);

                cleanTracklist.push(quality);
            });

            var payload = {
                qualityData: {video: cleanTracklist},
                qualitySwitchCallback: switchQuality
            };

            tech.trigger('loadedqualitydata', payload);

            function _levelLabel(level) {
                if (level.height) return level.height + "p";
                else if (level.width) return Math.round(level.width * 9 / 16) + "p";
                else if (level.bitrate) return (level.bitrate / 1000) + "kbps";
                else return 0;
            }
        }

        initialize();
        load(source);
    }

    if (Hls.isSupported()) {
        videojs.getComponent('Html5').registerSourceHandler({

            canHandleSource: function (source) {

                var hlsTypeRE = /^application\/x-mpegURL$/i;
                var hlsExtRE = /\.m3u8/i;
                var result;

                if (hlsTypeRE.test(source.type)) {
                    result = 'probably';
                } else if (hlsExtRE.test(source.src)) {
                    result = 'maybe';
                } else {
                    result = '';
                }

                return result;
            },

            handleSource: function (source, tech) {

                if (tech.hlsProvider) {
                    tech.hlsProvider.dispose();
                }

                tech.hlsProvider = new StreamrootProviderHLS(source, tech);

                return tech.hlsProvider;
            }

        }, 0);

    } else {
        console.error("Hls.js is not supported in this browser!");
    }

    videojs.StreamrootProviderHLS = StreamrootProviderHLS;
};

module.exports = attachVideojsStreamrootProvider;
