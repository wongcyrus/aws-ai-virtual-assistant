

import React, { Component } from 'react';

export default class Panel extends Component {

    // constructor(props) {
    //     super(props);       
    // }
    render() {
        return (<div id="textToSpeech">
            <button class="tab current" onclick="toggleHost(event)">Grace</button>
            <button class="tab" onclick="toggleHost(event)">Alien</button>
            <div>
                <textarea autofocus size="23" type="text" class="textEntry Grace">
                    <speak>
       
                    </speak>
                </textarea>
                <textarea autofocus size="23" type="text" class="textEntry Alien">
                    <speak>
                        Hi there! As you can see I'm set up to be a host too, although I don't use
                        the same type of skeleton as any of the original Amazon Sumerian hosts. With
                        open source hosts, you can apply host functionality to any custom animated
                        character you'd like. I'm excited to see what kinds of interesting host
                        characters you'll bring to life!
                    </speak>
                </textarea>
            </div>
            <div>
                <button id="play" class="speechButton">Play</button>
                <button id="pause" class="speechButton">Pause</button>
                <button id="resume" class="speechButton">Resume</button>
                <button id="stop" class="speechButton">Stop</button>
            </div>
            <div>
                <button id="gestures" class="gestureButton">Generate Gestures</button>
            </div>
            <div>
                <select id="emotes" class="gestureButton"></select>
            </div>
            <div>
                <button id="playEmote" class="gestureButton">Play Emote</button>
            </div>
        </div>
        );
    }
}