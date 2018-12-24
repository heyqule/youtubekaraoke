// ==UserScript==
// @name         Youtube HTML5 Karaoke
// @namespace    http://heyqule.net/
// @version      0.1.1
// @description  Youtube HTML5 Karaoke, support center cut on regular MV, left/right vocal/instrumental mixed Karaoke MVs.
// @author       heyqule
// @match        https://www.youtube.com/watch?*
// @require      https://code.jquery.com/jquery-3.3.1.slim.min.js
// @downloadUrl  https://raw.githubusercontent.com/heyqule/youtubekaraoke/master/karaoke.js
// @grant        unsafeWindow
// ==/UserScript==


(function($) {
    'use strict';
    var KaraokePlugin = function ($) {
        //webaudio elements
        var audioContext, audioSource,micAudioContext, micSource;
        var karaokeFilterOn = false;
        var pitchAdjustedValue = 0, channelAdjustedValue = 1;

        var _createBiquadFilter = function(type,freq,qValue)
        {
            var filter = audioContext.createBiquadFilter();
            filter.type = type;
            filter.frequency.value = freq;
            filter.Q.value = qValue;
            return filter;
        }
        /**
        *  Cut common vocal frequencies @ center
        */
        var _cutCenter = function()
        {
            //cutoff frequencies
            var f1 = 200;
            var f2 = 6000;
            console.log('setting center cut @'+f1+' - '+f2);
            //splitter and gains
            var splitter, gainL, gainR;
            //biquadFilters
            var filterLP1, filterHP1, filterLP2, filterHP2;
            var filterLP3, filterHP3, filterLP4, filterHP4;
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
        var _cutRight = function()
        {
            console.log('setting right cut');
            var splitter, merger;
            splitter = audioContext.createChannelSplitter(2);
            merger = audioContext.createChannelMerger(1);
            splitter.connect(merger, 0);
            audioSource.connect(splitter);
            merger.connect(audioContext.destination);
        }

        /**
        * Expand right channel to both channel, drop left channel
        */
        var _cutLeft = function()
        {
            console.log('setting left cut');
            var splitter,merger;
            splitter = audioContext.createChannelSplitter(2);
            merger = audioContext.createChannelMerger(1);
            splitter.connect(merger, 1);
            audioSource.connect(splitter);
            merger.connect(audioContext.destination);
        }

        var _pitchShift = function(amount)
        {
            $('#KaraokePitchValue').html(amount);
            console.log($('#KaraokePitchValue').html());

            micSource.disconnect();

            if(amount != 0)
            {
                console.log('apply pitch shift');
                var pitchShiftEffect = new Jungle( micAudioContext );
                var wetGain = micAudioContext.createGain();
                pitchShiftEffect.output.connect( wetGain );
                pitchShiftEffect.setPitchOffset(amount);
                micSource.connect( pitchShiftEffect.input );
                wetGain.connect( micAudioContext.destination);
            }
            else
            {
                console.log('cancel pitch shift');
                micSource.connect( micAudioContext.destination );
            }

        }
        /**
          * 0 = left cut, 1 = center cut, 2 = right cut
         **/
        var _adjustChannel = function()
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
        }

        var _disconnectProcessors = function() {
            console.log('disconnect audio processors');
            audioSource.disconnect();
        }

        return {
            setupAudioSource : function (mediaElement)
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
                var self = this;
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(function(stream) {
                    /* use the stream */
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    micAudioContext = new AudioContext();

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
            setupMenu: function(targetContainer)
            {
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
                if(karaokeFilterOn)
                {
                    karaokeFilterOn = false;
                    this.filterOff();
                    $('#karaoke-button').attr('title','🎤: Off');
                    $('#karaoke-button').css('background-color','transparent');
                    this.removeControlPanel();
                }
                else
                {
                    karaokeFilterOn = true;
                    this.filterOn();
                    $('#karaoke-button').attr('title','🎤: On');
                    $('#karaoke-button').css('background-color','#eee');
                    this.showControlPanel();
                }

                return this;
            },
            showControlPanel: function()
            {
                console.log('showpanel');
                this.controlPanel = $('<div>',{
                    id:"karaoke_controlpanel"
                });

                this.controlPanel.append($('<h3>',{
                    text: '🎤 Controls'
                }));

                this.controlPanel.append(
                    $('<div>',{style:'width:33%; display:inline-block;'}).
                    append('<label style="width:100px;">Vocal Attenuation: (left - center - right)</label><br />').
                    append($('<input>',{
                        type: 'range',
                        id: 'pitchshift',
                        min: 0,
                        max: 2,
                        value: channelAdjustedValue,
                        step: 1,
                        onchange: 'KaraokePluginChannelAdjust(this)'
                    }))
                );

                this.controlPanel.append(
                    $('<div>',{style:'width:33%; display:inline-block;'}).
                    append('<label style="width:100px;">🎤 Pitch Shift: <span id="KaraokePitchValue">'+pitchAdjustedValue+'</span></label><br />').
                    append($('<input>',{
                        type: 'range',
                        id: 'pitchshift',
                        min: -0.5,
                        max: 1.5,
                        value: pitchAdjustedValue,
                        step: 0.1,
                        onchange: 'KaraokePluginPitchAdjust(this)'
                    }))
                );

                this.controlPanel.insertAfter(primaryPlayer);

                return this;
            },
            removeControlPanel: function()
            {
                console.log('hidepanel');
                this.controlPanel.remove();

                return this;
            },
            pitchAdjust: function(element)
            {
                pitchAdjustedValue = $(element).val();
                console.log('pitchshift:'+pitchAdjustedValue);
                _pitchShift(pitchAdjustedValue);

                return this;
            },
            channelAdjust: function(element)
            {
                channelAdjustedValue = parseInt($(element).val());
                _adjustChannel();
            }
        };
    }(jQuery);

    if (typeof audioContext === 'undefined') {
        //Youtube Handler
        var mediaElement = $('.html5-main-video')[0];
        var targetContainer = 'div.ytp-right-controls';
        var primaryPlayer = 'div#primary div#player';

        console.log("setting up mic");
        KaraokePlugin.setupMic(primaryPlayer);
        console.log("setting up audio source");
        KaraokePlugin.setupAudioSource(mediaElement);
        console.log("setting up menu");
        KaraokePlugin.setupMenu(targetContainer);

        unsafeWindow.KaraokePluginSwitch = function() {
            KaraokePlugin.switch();
        }
        unsafeWindow.KaraokePluginPitchAdjust = function(element) {
            KaraokePlugin.pitchAdjust(element);
        }
        unsafeWindow.KaraokePluginChannelAdjust = function(element) {
            KaraokePlugin.channelAdjust(element);
        }

    }



// Copyright 2012, Google Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

function createFadeBuffer(context, activeTime, fadeTime) {
    var length1 = activeTime * context.sampleRate;
    var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
    var length = length1 + length2;
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var p = buffer.getChannelData(0);

    console.log("createFadeBuffer() length = " + length);

    var fadeLength = fadeTime * context.sampleRate;

    var fadeIndex1 = fadeLength;
    var fadeIndex2 = length1 - fadeLength;

    // 1st part of cycle
    for (var i = 0; i < length1; ++i) {
        var value;

        if (i < fadeIndex1) {
            value = Math.sqrt(i / fadeLength);
        } else if (i >= fadeIndex2) {
            value = Math.sqrt(1 - (i - fadeIndex2) / fadeLength);
        } else {
            value = 1;
        }

        p[i] = value;
    }

    // 2nd part
    for (var i = length1; i < length; ++i) {
        p[i] = 0;
    }


    return buffer;
}

function createDelayTimeBuffer(context, activeTime, fadeTime, shiftUp) {
    var length1 = activeTime * context.sampleRate;
    var length2 = (activeTime - 2*fadeTime) * context.sampleRate;
    var length = length1 + length2;
    var buffer = context.createBuffer(1, length, context.sampleRate);
    var p = buffer.getChannelData(0);

    console.log("createDelayTimeBuffer() length = " + length);

    // 1st part of cycle
    for (var i = 0; i < length1; ++i) {
        if (shiftUp)
          // This line does shift-up transpose
          p[i] = (length1-i)/length;
        else
          // This line does shift-down transpose
          p[i] = i / length1;
    }

    // 2nd part
    for (var i = length1; i < length; ++i) {
        p[i] = 0;
    }

    return buffer;
}

var delayTime = 0.100;
var fadeTime = 0.050;
var bufferTime = 0.100;

function Jungle(context) {
    this.context = context;
    // Create nodes for the input and output of this "module".
    var input = context.createGain();
    var output = context.createGain();
    this.input = input;
    this.output = output;

    // Delay modulation.
    var mod1 = context.createBufferSource();
    var mod2 = context.createBufferSource();
    var mod3 = context.createBufferSource();
    var mod4 = context.createBufferSource();
    this.shiftDownBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, false);
    this.shiftUpBuffer = createDelayTimeBuffer(context, bufferTime, fadeTime, true);
    mod1.buffer = this.shiftDownBuffer;
    mod2.buffer = this.shiftDownBuffer;
    mod3.buffer = this.shiftUpBuffer;
    mod4.buffer = this.shiftUpBuffer;
    mod1.loop = true;
    mod2.loop = true;
    mod3.loop = true;
    mod4.loop = true;

    // for switching between oct-up and oct-down
    var mod1Gain = context.createGain();
    var mod2Gain = context.createGain();
    var mod3Gain = context.createGain();
    mod3Gain.gain.value = 0;
    var mod4Gain = context.createGain();
    mod4Gain.gain.value = 0;

    mod1.connect(mod1Gain);
    mod2.connect(mod2Gain);
    mod3.connect(mod3Gain);
    mod4.connect(mod4Gain);

    // Delay amount for changing pitch.
    var modGain1 = context.createGain();
    var modGain2 = context.createGain();

    var delay1 = context.createDelay();
    var delay2 = context.createDelay();
    mod1Gain.connect(modGain1);
    mod2Gain.connect(modGain2);
    mod3Gain.connect(modGain1);
    mod4Gain.connect(modGain2);
    modGain1.connect(delay1.delayTime);
    modGain2.connect(delay2.delayTime);

    // Crossfading.
    var fade1 = context.createBufferSource();
    var fade2 = context.createBufferSource();
    var fadeBuffer = createFadeBuffer(context, bufferTime, fadeTime);
    fade1.buffer = fadeBuffer
    fade2.buffer = fadeBuffer;
    fade1.loop = true;
    fade2.loop = true;

    var mix1 = context.createGain();
    var mix2 = context.createGain();
    mix1.gain.value = 0;
    mix2.gain.value = 0;

    fade1.connect(mix1.gain);
    fade2.connect(mix2.gain);

    // Connect processing graph.
    input.connect(delay1);
    input.connect(delay2);
    delay1.connect(mix1);
    delay2.connect(mix2);
    mix1.connect(output);
    mix2.connect(output);

    // Start
    var t = context.currentTime + 0.050;
    var t2 = t + bufferTime - fadeTime;
    mod1.start(t);
    mod2.start(t2);
    mod3.start(t);
    mod4.start(t2);
    fade1.start(t);
    fade2.start(t2);

    this.mod1 = mod1;
    this.mod2 = mod2;
    this.mod1Gain = mod1Gain;
    this.mod2Gain = mod2Gain;
    this.mod3Gain = mod3Gain;
    this.mod4Gain = mod4Gain;
    this.modGain1 = modGain1;
    this.modGain2 = modGain2;
    this.fade1 = fade1;
    this.fade2 = fade2;
    this.mix1 = mix1;
    this.mix2 = mix2;
    this.delay1 = delay1;
    this.delay2 = delay2;

    this.setDelay(delayTime);
}

Jungle.prototype.setDelay = function(delayTime) {
    this.modGain1.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
    this.modGain2.gain.setTargetAtTime(0.5*delayTime, 0, 0.010);
}

var previousPitch = -1;

Jungle.prototype.setPitchOffset = function(mult) {
        if (mult>0) { // pitch up
            this.mod1Gain.gain.value = 0;
            this.mod2Gain.gain.value = 0;
            this.mod3Gain.gain.value = 1;
            this.mod4Gain.gain.value = 1;
        } else { // pitch down
            this.mod1Gain.gain.value = 1;
            this.mod2Gain.gain.value = 1;
            this.mod3Gain.gain.value = 0;
            this.mod4Gain.gain.value = 0;
        }
        this.setDelay(delayTime*Math.abs(mult));
    previousPitch = mult;
}

})(jQuery);
