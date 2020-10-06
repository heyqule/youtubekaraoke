// ==UserScript==
// @name         Youtube HTML5 Karaoke
// @namespace    http://heyqule.net/
// @version      0.4.0
// @description  Youtube HTML5 Karaoke, support center cut on regular MV, left/right vocal/instrumental mixed Karaoke MVs.
// @author       heyqule
// @match        https://www.youtube.com/watch?*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js
// @downloadURL  https://raw.githubusercontent.com/heyqule/youtubekaraoke/master/karaoke.js
// @updateURL    https://raw.githubusercontent.com/heyqule/youtubekaraoke/master/karaoke.js
// @grant        unsafeWindow
// ==/UserScript==


(function($) {
    'use strict';

    //Youtube Handler
    const mediaElement = $('.html5-main-video')[0];
    const targetContainer = 'div.ytp-right-controls';
    const primaryPlayer = 'div#primary div#player';

    const videoLinkProvider = {
        youtube: 'https://www.youtube.com/watch?v=%s'
    };
    const videoImageProvider = {
        youtube: 'https://i.ytimg.com/vi/%s/hqdefault.jpg'
    };
    const channelLinkProvider = {
        youtube: 'https://www.youtube.com/channel/%s'
    };

    let KaraokeUI = function ($) {
        return {
            menuUI : function() {
                $(targetContainer).prepend(
                    $('<button />',{
                        title: '🎤: Off',
                        id: 'karaoke-button',
                        class: 'ytp-karaoke-button ytp-button',
                        text: '🎤',
                        style: 'position: relative; top:-0.5em; padding-left:0.25em; font-size:1.5em;',
                        'aria-haspopup': 'true',
                        onClick: 'KaraokePluginSwitch();'
                    })
                );
            },
            controlPanelUI : function(channelAdjustedValue, highPassAdjustedValue, lowPassAdjustedValue, gainAdjustedValue) {
                let controlPanel = $('<div>',{
                    id:"karaoke_controlpanel"
                });

                controlPanel.append($('<h3>',{
                    text: '🎤 Controls'
                })).append(
                    $('<div>',{
                        id: 'karaoke_controlpanel_message'
                    })
                );

                controlPanel.append(
                    $('<div>',{style:'width:33%; display:inline-block;'}).
                    append('<label style="width:100px;">Vocal Attenuation: (left - center - right)</label><br />').
                    append($('<input>',{
                        type: 'range',
                        id: 'channelshift',
                        min: 0,
                        max: 2,
                        value: channelAdjustedValue,
                        step: 1,
                        onchange: 'KaraokePluginChannelAdjust(this)'
                    })).
                    append('<br />').
                    append('<label style="width:100px;">High Pass: <span id="KaraokeHighPassValue">'+highPassAdjustedValue+'</span> Hz</label><br />').
                    append($('<input>',{
                        type: 'range',
                        id: 'highpass',
                        min: 50,
                        max: 400,
                        value: highPassAdjustedValue,
                        step: 10,
                        onchange: 'KaraokePluginHighPassAdjust(this)'
                    })).
                    append('<br />').
                    append('<label style="width:100px;">Low Pass: <span id="KaraokeLowPassValue">'+lowPassAdjustedValue+'</span> Hz</label><br />').
                    append($('<input>',{
                        type: 'range',
                        id: 'lowpass',
                        min: 4000,
                        max: 8000,
                        value: lowPassAdjustedValue,
                        step: 200,
                        onchange: 'KaraokePluginLowPassAdjust(this)'
                    }))
                );

                controlPanel.append(
                    $('<div>',{style:'width:33%; display:inline-block;'}).
                    append('<label style="width:100px;">🎤 Gain: <span id="KaraokeGainValue">'+gainAdjustedValue+'</span></label><br />').
                    append($('<input>',{
                        type: 'range',
                        id: 'micgain',
                        min: 0,
                        max: 2,
                        value: gainAdjustedValue,
                        step: 0.1,
                        onchange: 'KaraokePluginMicGainAdjust(this)'
                    })).
                    append('<br /><br />').
                    append($('<input>',{
                        type: 'button',
                        id: 'save_setting',
                        value: 'Save to Cloud',
                        onclick: 'KaraokePluginSaveToRemote(this)'
                    })).
                    append('<br /><br />').
                    append($('<input>',{
                        type: 'button',
                        id: 'search_track_dialog',
                        value: 'Search Similar Tracks',
                        onclick: 'KaraokePluginTrackSearch(this)'
                    }))
                );

                controlPanel.insertAfter(primaryPlayer);

                return controlPanel
            },
            searchUI : function() {
                let container = $('<div>',{
                    id: 'karaoke_search_form'
                })

                let input = $('<input>',{
                    type: 'input',
                    id: 'karaoke_search',
                    placeholder: 'Search Here',
                });
                let button = $('<button>',{
                    id: 'karaoke_search_submit',
                    html: 'Submit',
                    onclick: 'KaraokePluginSubmitSearch()'
                });
                let message = $('<p>', {
                    id: 'karaoke_search_message',
                });

                container.append(input);
                container.append(button);
                container.append(message);

                return container;
            },
            resultUI : function() {
                let container = $('<div>',{
                    id: 'karaoke_search_result_tabs'
                });
                let songs = $('<div>',{
                    id: 'karaoke_search_result_songs',
                    html: 'Empty',
                    css: {
                        width:'100%-50px',
                    }
                });
                let channels = $('<div>',{
                    id: 'karaoke_search_result_channels',
                    html: 'Empty',
                    css: {
                        width:'100%-50px',
                    }
                });
                let tabs = $('<ul><li><a href="#karaoke_search_result_songs">Songs</a></li><li><a href="#karaoke_search_result_channels">Channels</a></li></ul>')
                container.append(tabs)
                container.append(songs)
                container.append(channels)
                container.tabs()
                return container
            },
            searchDialogUI : function() {
                let trackSearchDialog = $('<div>', {
                    id: 'track_search',
                    title: 'Track Search'
                });
                trackSearchDialog.append(this.searchUI());
                trackSearchDialog.append(this.resultUI());
                $('#karaoke_controlpanel').append(trackSearchDialog)
                trackSearchDialog.dialog({
                    open: function( event, ui ) {
                        $('.ui-dialog').css({
                            'z-index':'10000',
                            'width': '50%',
                            'min-width': '320px',
                            'height': '50%',
                            'min-height': '300px'
                        });
                    }
                });
                return trackSearchDialog;
            },
            getVideoLink: function(type, video_id) {
                return videoLinkProvider[type].replace('%s',video_id)
            },
            getVideoImage: function(type, video_id) {
                return videoImageProvider[type].replace('%s',video_id)
            },
            getChannelLink: function(type, channel_id) {
                return channelLinkProvider[type].replace('%s',channel_id)
            },
            songItemUI : function(data) {
                console.log('render songs');
                console.log(data);
                let songTab = $('#karaoke_search_result_songs');
                songTab.empty();
                for(let i = 0; i < data.length; i++)
                {
                    let img = $('<img>',{src: this.getVideoImage('youtube',data[i].song_id)});
                    let block = $('<a>',{href: this.getVideoLink('youtube',data[i].song_id)})
                    block.append(img).append(data[i].name);
                    songTab.append(block);
                }
            },
            channelItemUI : function(data) {
                console.log('render channel');
                console.log(data);
                let songTab = $('#karaoke_search_result_songs')
                for(let i = 0; i < data.length; i++)
                {

                }
            },
            renderTab: function() {
                let json_data = "{\"songs\":[{\"id\":8,\"name\":\"Backstreet Boys - Larger Than Life (Official Music Video)\",\"song_id\":\"MEb2CecR11I\"},{\"id\":6,\"name\":\"Backstreet Boys - Shape Of My Heart (Official Music Video)\",\"song_id\":\"OT5msu-dap8\"},{\"id\":7,\"name\":\"Backstreet Boys - I Want It That Way (Official Music Video)\",\"song_id\":\"4fndeDfaWCg\"},{\"id\":5,\"name\":\"The Call\",\"song_id\":\"9TscNjSU8P4\"}],\"channels\":[{\"id\":3,\"name\":\"Backstreet Boys - Topic\",\"channel_id\":\"UCQsJi7L4_zXzYRN2X0Fw3Zg\"},{\"id\":4,\"name\":\"BackstreetBoysVEVO\",\"channel_id\":\"UCUFdeo1oLLH_QPlaQfZrqbg\"}]}";
                let data = JSON.parse(json_data);
                this.songItemUI(data.songs);
                this.channelItemUI(data.channels);
            }
        }
    }(jQuery)

    let KaraokePlugin = function ($, KaraokeUI) {
        const APIKey = null;
        const MAX_CACHE_SIZE = 5000;
        //webaudio elements
        let audioContext, audioSource,micAudioContext, micSource;
        let karaokeFilterOn = false;
        let channelAdjustedValue = 1, gainAdjustedValue = 1;
        let highPassAdjustedValue = 200, lowPassAdjustedValue = 6000
        let trackSearchDialog = null;


        let _createBiquadFilter = function(type,freq,qValue)
        {
            let filter = audioContext.createBiquadFilter();
            filter.type = type;
            filter.frequency.value = freq;
            filter.Q.value = qValue;
            return filter;
        }
        /**
        *  Cut common vocal frequencies @ center
        */
        let _cutCenter = function()
        {
            //cutoff frequencies
            let f1 = highPassAdjustedValue;
            let f2 = lowPassAdjustedValue;
            console.log('setting center cut @'+f1+' - '+f2);
            //splitter and gains
            let splitter, gainL, gainR;
            //biquadFilters
            let filterLP1, filterHP1, filterLP2, filterHP2;
            let filterLP3, filterHP3, filterLP4, filterHP4;
            //phase inversion filter
            splitter = audioContext.createChannelSplitter(2);
            gainL = audioContext.createGain();
            gainR = audioContext.createGain();
            gainL.gain.value = 1;
            gainR.gain.value = -1;
            splitter.connect(gainL, 0);
            splitter.connect(gainR, 1);
            gainL.connect(audioContext.destination);
            gainR.connect(audioContext.destination);
            //biquad filters
            filterLP1 = _createBiquadFilter("lowpass",f2,1);
            filterHP1 = _createBiquadFilter("highpass",f1,1);
            filterLP3 = _createBiquadFilter("lowpass",f2,1);
            filterHP3 = _createBiquadFilter("highpass",f1,1);
            filterLP2 = _createBiquadFilter("lowpass",f1,1);
            filterHP2 = _createBiquadFilter("highpass",f2,1);
            filterLP4 = _createBiquadFilter("lowpass",f1,1);
            filterHP4 = _createBiquadFilter("highpass",f2,1);
            //connect filters
            audioSource.connect(filterLP1);
            audioSource.connect(filterLP2);
            audioSource.connect(filterHP2);
            filterLP1.connect(filterLP3);
            filterLP3.connect(filterHP1);
            filterHP1.connect(filterHP3);
            filterHP3.connect(splitter);
            filterLP2.connect(filterLP4);
            filterLP4.connect(audioContext.destination);
            filterHP2.connect(filterHP4);
            filterHP4.connect(audioContext.destination);
        }

        /**
        * Expand left channel to both channel, drop right channel
        */
        let _cutRight = function()
        {
            console.log('setting right cut');
            let splitter, merger;
            splitter = audioContext.createChannelSplitter(2);
            merger = audioContext.createChannelMerger(1);
            splitter.connect(merger, 0);
            audioSource.connect(splitter);
            merger.connect(audioContext.destination);
        }

        /**
        * Expand right channel to both channel, drop left channel
        */
        let _cutLeft = function()
        {
            console.log('setting left cut');
            let splitter,merger;
            splitter = audioContext.createChannelSplitter(2);
            merger = audioContext.createChannelMerger(1);
            splitter.connect(merger, 1);
            audioSource.connect(splitter);
            merger.connect(audioContext.destination);
        }

        /**
         * Handle Microphone gain.  This only applicable to mic that connected to browser.
         * @param amount
         * @private
         */
        let _micGain = function(amount)
        {
            let gainElement = $('#KaraokeGainValue')
            gainElement.html(amount);
            console.log(gainElement.html());

            micSource.disconnect();

            let micGain = micAudioContext.createGain();
            micSource.connect( micGain );
            micGain.connect( micAudioContext.destination );
            micGain.gain.value = amount;
            micSource.connect( micAudioContext.destination );
        }

        /**
          * 0 = left cut, 1 = center cut, 2 = right cut
         **/
        let _adjustChannel = function()
        {
            console.log('channelAdjust:'+channelAdjustedValue);
            _disconnectProcessors();
            switch(channelAdjustedValue) {
                case 0:
                    _cutLeft();
                    break;
                case 1:
                    _cutCenter()
                    break;
                case 2:
                    _cutRight();
                    break;
            }

            _saveSetting();
        }

        let _disconnectProcessors = function() {
            console.log('disconnect audio processors');
            audioSource.disconnect();
        }

        let _getVideoId = function() {
            let queryString = window.location.search;
            let urlParams = new URLSearchParams(queryString);
            return urlParams.get('v');
        }

        let _loadSetting = function() {
            let videoId = _getVideoId();
            if(typeof videoId === undefined) {
                return;
            }
            let savedItem = JSON.parse(localStorage.getItem(videoId));
            console.log("Loaded "+videoId, savedItem);
            if(savedItem) {
                channelAdjustedValue = savedItem.cv;
                lowPassAdjustedValue = savedItem.lpv;
                highPassAdjustedValue = savedItem.hpv;

                savedItem.date = Date.now();
                localStorage.setItem(videoId, JSON.stringify(savedItem));
            }
            else if(APIKey) {
                _loadSettingFromRemote(videoId)
            }
        }

        let _loadSettingFromRemote = function(videoId) {
            return this;
        }

        let _saveSetting = function() {
            let videoId = _getVideoId();
            if(typeof videoId === undefined) {
                return;
            }
            let data = {
                cv: channelAdjustedValue,
                lpv: lowPassAdjustedValue,
                hpv: highPassAdjustedValue,
                date: Date.now()
            }
            localStorage.setItem(videoId, JSON.stringify(data));

            _trimCache();
        }

        let _SaveSettingToRemote = function() {
            let videoId = _getVideoId();
            if(APIKey) {
                $('#karaoke_controlpanel_message').html($('<div>',{
                    class: 'ui-state-highlight ui-corner-all',
                    html: 'This is work in progress'
                }))
            }
            else
            {
                $('#karaoke_controlpanel_message').html($('<div>',{
                    class: 'ui-state-error ui-corner-all',
                    html: 'You don\'t have permission to save to cloud'
                }))
            }
            return this;
        }

        let _trimCache = function() {
            if(localStorage.length > MAX_CACHE_SIZE) {
                let sortableArray = [];
                for (let i = 0; i < localStorage.length; i++) {
                    sortableArray[localStorage.key(i)] = {
                        key: localStorage.key(i),
                        data: JSON.parse(localStorage.getItem(localStorage.key(i)))
                    };
                }
                sortableArray.sort((a, b) => (a.data.date > b.data.date) ? 1 : -1);
                for (let i = 0; i < MAX_CACHE_SIZE/5; i++) {
                    localStorage.removeItem(sortableArray[i].key);
                }
            }
        }

        return {
            setupAudioSource : function ()
            {
                //setup audio routing
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    audioContext = new AudioContext();
                    audioSource = audioContext.createMediaElementSource(mediaElement);
                    audioSource.connect(audioContext.destination);
                } catch (e) {
                    console.error('Web Audio API is not supported in this browser');
                }

                return this;
            },
            setupMic: function(primaryPlayer) {
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(function(stream) {
                    /* use the stream */
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    micAudioContext = new AudioContext();
                    console.log('Mic Latency:'+micAudioContext.baseLatency);

                    // Create an AudioNode from the stream.
                    micSource = micAudioContext.createMediaStreamSource( stream );

                    // Connect it to the destination to hear yourself (or any other node for processing!)
                    micSource.connect( micAudioContext.destination );
                })
                    .catch(function(err) {
                    /* handle the error */
                });

                return this;
            },
            setupMenu: function()
            {
                KaraokeUI.menuUI();
                return this;
            },
            filterOn: function() {
                console.log("Removing vocals");
                _adjustChannel();
                return this;
            },
            filterOff: function() {
                console.log("Adding in vocals");
                _disconnectProcessors();
                audioSource.connect(audioContext.destination);
                return this;
            },
            switch: function()
            {
                let karaokeButton = $('#karaoke-button');
                if(karaokeFilterOn)
                {
                    karaokeFilterOn = false;
                    this.filterOff();
                    karaokeButton.attr('title','🎤: Off');
                    karaokeButton.css('background-color','transparent');
                    this.removeControlPanel();
                }
                else
                {
                    karaokeFilterOn = true;
                    this.filterOn();
                    karaokeButton.attr('title','🎤: On');
                    karaokeButton.css('background-color','#eee');
                    this.showControlPanel();
                }

                return this;
            },
            showControlPanel: function()
            {
                console.log('showpanel');
                this.controlPanel = KaraokeUI.controlPanelUI(channelAdjustedValue,
                    highPassAdjustedValue, lowPassAdjustedValue, gainAdjustedValue);
                return this;
            },
            removeControlPanel: function()
            {
                console.log('hidepanel');
                this.controlPanel.remove();

                return this;
            },
            micGainAdjust: function(element)
            {
                gainAdjustedValue = $(element).val();
                _micGain(gainAdjustedValue);

                return this;
            },
            channelAdjust: function(element)
            {
                channelAdjustedValue = parseInt($(element).val());
                _adjustChannel();

                return this;
            },
            highPassAdjust: function(element)
            {
                highPassAdjustedValue = parseInt($(element).val());
                $('#KaraokeHighPassValue').html(highPassAdjustedValue.toString());
                _adjustChannel()
                return this;
            },
            lowPassAdjust: function(element)
            {
                lowPassAdjustedValue = parseInt($(element).val());
                $('#KaraokeLowPassValue').html(lowPassAdjustedValue.toString());
                _adjustChannel()
                return this;
            },
            saveToRemote: function(element)
            {
                _SaveSettingToRemote();
                return this;
            },
            searchTracks: function(element)
            {
                console.log('Open Search');
                if(trackSearchDialog == null) {
                    trackSearchDialog = KaraokeUI.searchDialogUI()
                }
                else
                {
                    if(trackSearchDialog.dialog('isOpen')) {
                        trackSearchDialog.dialog('close');
                    }
                    else
                    {
                        trackSearchDialog.dialog('open');
                    }
                }
            },
            loadSetting: function() {
                _loadSetting();
                $('#channelshift').val(channelAdjustedValue);
                $('#highpass').val(highPassAdjustedValue);
                $('#lowpass').val(lowPassAdjustedValue);
            }
        };
    }(jQuery, KaraokeUI);

    $("head").append (
        '<link '
        + 'href="//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.min.css" '
        + 'rel="stylesheet" type="text/css">'
    );

    if (typeof audioContext === 'undefined') {
        console.log("setting up mic");
        KaraokePlugin.setupMic(primaryPlayer);
        console.log("setting up audio source");
        KaraokePlugin.setupAudioSource(mediaElement);
        console.log("setting up menu");
        KaraokePlugin.setupMenu(targetContainer);

        unsafeWindow.KaraokePluginSwitch = function() {
            KaraokePlugin.switch();
        }
        unsafeWindow.KaraokePluginMicGainAdjust = function(element) {
            KaraokePlugin.micGainAdjust(element);
        }
        unsafeWindow.KaraokePluginChannelAdjust = function(element) {
            KaraokePlugin.channelAdjust(element);
        }
        unsafeWindow.KaraokePluginHighPassAdjust = function(element) {
            KaraokePlugin.highPassAdjust(element);
        }
        unsafeWindow.KaraokePluginLowPassAdjust = function(element) {
            KaraokePlugin.lowPassAdjust(element);
        }
        unsafeWindow.KaraokePluginSaveToRemote = function() {
            KaraokePlugin.saveToRemote();
        }
        unsafeWindow.KaraokePluginTrackSearch = function() {
            KaraokePlugin.searchTracks();
        }
        unsafeWindow.KaraokePluginSubmitSearch = function() {
            KaraokeUI.renderTab();
        }

        KaraokePlugin.loadSetting();
    }

})(jQuery);
