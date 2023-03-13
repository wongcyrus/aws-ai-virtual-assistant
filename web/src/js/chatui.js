const copyClickCode = (ele) => {
    const input = document.createElement('textarea');
    input.value = ele.dataset.mdicContent;
    const nDom = ele.previousElementSibling;
    const nDelay = ele.dataset.mdicNotifyDelay;
    const cDom = nDom.previousElementSibling;
    document.body.appendChild(input);
    input.select();
    input.setSelectionRange(0, 9999);
    document.execCommand('copy');
    document.body.removeChild(input);
    if (nDom.style.display === 'none') {
        nDom.style.display = 'block';
        cDom && (cDom.style.display = 'none');
        setTimeout(() => {
            nDom.style.display = 'none';
            cDom && (cDom.style.display = 'block');
        }, nDelay);
    }
};
$().ready(() => {

    const md = markdownit({
        highlight: function (str, lang) { // markdown高亮
            try {
                return hljs.highlightAuto(str).value;
            } catch (__) { }

            return ""; // use external default escaping
        }
    });
    md.use(texmath, { // markdown katex公式
        engine: katex,
        delimiters: 'dollars',
        katexOptions: { macros: { "\\RR": "\\mathbb{R}" } }
    });
    const x = {
        getCodeLang(str = '') {
            const res = str.match(/ class="language-(.*?)"/);
            return (res && res[1]) || '';
        },
        getFragment(str = '') {
            return str ? `<span class="u-mdic-copy-code_lang">${str}</span>` : '';
        },
    };
    const strEncode = (str = '') => {
        if (!str || str.length === 0) {
            return '';
        }
        return str
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/'/g, '\'')
            .replace(/"/g, '&quot;');
    };
    const getCodeLangFragment = (oriStr = '') => {
        return x.getFragment(x.getCodeLang(oriStr));
    };

    const enhanceCode = (render, options = {}) => (...args) => {
        /* args = [tokens, idx, options, env, slf] */
        const {
            btnText = 'Copy Code', // button text
            successText = 'Code Success', // copy-success text
            successTextDelay = 2000, // successText show time [ms]
            showCodeLanguage = true, // false | show code language
        } = options;
        const [tokens = {}, idx = 0] = args;
        const cont = strEncode(tokens[idx].content || '');
        const originResult = render.apply(this, args);       
        const tpls = [
            '<br/>',
            '<div class="m-mdic-copy-wrapper">',           
            `<div class="u-mdic-copy-notify" style="display:none;">${successText}</div>`,
            '<button ',
            'class="u-mdic-copy-btn j-mdic-copy-btn" ',
            `data-mdic-content="${cont}" `,
            `data-mdic-notify-delay="${successTextDelay}" `,
            `onclick="copyClickCode(this)">${btnText}</button>`,
            '</div>',
        ];
        const LAST_TAG = '</pre>';
        const newResult = originResult.replace(LAST_TAG, `${tpls.join('')}${LAST_TAG}`);
        return newResult;
    };

    const codeBlockRender = md.renderer.rules.code_block;
    const fenceRender = md.renderer.rules.fence;
    md.renderer.rules.code_block = enhanceCode(codeBlockRender);
    md.renderer.rules.fence = enhanceCode(fenceRender);

    md.renderer.rules.image = function (tokens, idx, options, env, slf) {
        var token = tokens[idx];
        token.attrs[token.attrIndex("alt")][1] = slf.renderInlineAsText(token.children, options, env);
        token.attrSet("onload", "messagsEle.scrollTo(0, messagsEle.scrollHeight);this.removeAttribute('onload')");
        return slf.renderToken(tokens, idx, options)
    }

    function getUrlVars() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    }

    const urlParams = getUrlVars();
    const apikey = urlParams['apikey'];
    const endpoint = urlParams['endpoint'];

    if (!apikey) alert("Pleaase reload the page with api key!");

    const speakers = new Map([
        ['Grace', undefined],
        ['Wes', undefined],
    ]);

    const conversations = new Map();
    conversations.set('Grace', { "past_user_inputs": [], "generated_responses": [] });
    conversations.set('Wes', { "past_user_inputs": [], "generated_responses": [] });


    $('#reset').click(() => {
        conversations.set('Grace', { "past_user_inputs": [], "generated_responses": [] });
        conversations.set('Wes', { "past_user_inputs": [], "generated_responses": [] });
        $('.msger-chat').empty();
    });

    const msgerForm = get(".msger-inputarea");
    const msgerInput = get(".msger-input");
    const msgerChat = get(".msger-chat");

    const BOT_IMG = "assets/images/bot.png";
    const PERSON_IMG = "assets/images/user.png";
    const BOT_NAME = "BOT";
    const PERSON_NAME = "You";

    function HTMLEncode(str) {
        return $('<div/>').text(str).html();
    }

    function appendMessage(name, img, side, text) {
        //   Simple solution for small apps
        let message = HTMLEncode(text);
        const displayMode = $("#models").find(':selected').val().split(",")[2];
        if (side == "left" && displayMode == "code") {
            message = `<div class='markdown-body'>${md.render(text)}</div>`;
        }
        const msgHTML = `
        <div class="msg ${side}-msg">
          <div class="msg-img" style="background-image: url(${img})"></div>    
          <div class="msg-bubble">
            <div class="msg-info">
              <div class="msg-info-name">${name}</div>
              <div class="msg-info-time">${formatDate(new Date())}</div>
            </div>    
            <div class="msg-text">${message}</div>
          </div>
        </div>
      `;
        msgerChat.insertAdjacentHTML("beforeend", msgHTML);
        msgerChat.scrollTop += 500;
    }

    function botResponse(message) {
        appendMessage(BOT_NAME, BOT_IMG, "left", message);
    }

    // Utils
    function get(selector, root = document) {
        return root.querySelector(selector);
    }

    function formatDate(date) {
        const h = "0" + date.getHours();
        const m = "0" + date.getMinutes();
        return `${h.slice(-2)}:${m.slice(-2)}`;
    }

    async function getAWsCredentials() {
        let sessionCredentials = await $.ajax({
            url: endpoint + 'session-token',
            contentType: 'application/json',
            dataType: 'json',
            headers: {
                "X-Api-Key": apikey
            }
        });
        window.AWS.config.credentials = new AWS.Credentials(sessionCredentials["AccessKeyId"], sessionCredentials["SecretAccessKey"], sessionCredentials["SessionToken"]);
    }

    async function main() {
        // Initialize AWS and create Polly service objects
        window.AWS.config.region = "us-east-1";
        await getAWsCredentials();


        const polly = new AWS.Polly();
        const presigner = new AWS.Polly.Presigner();
        const speechInit = HOST.aws.TextToSpeechFeature.initializeService(
            polly,
            presigner,
            window.AWS.VERSION
        );

        // Define the glTF assets that will represent the hosts
        const characterFile1 = './assets/glTF/characters/adult_female/grace/grace.gltf';
        const characterFile2 = './assets/glTF/characters/adult_male/wes/wes.gltf';
        const animationPath1 = './assets/glTF/animations/adult_female';
        const animationPath2 = './assets/glTF/animations/adult_male';
        const animationFiles = [
            'stand_idle.glb',
            'lipsync.glb',
            'gesture.glb',
            'emote.glb',
            'face_idle.glb',
            'blink.glb',
            'poi.glb',
        ];
        const gestureConfigFile = 'gesture.json';
        const poiConfigFile = 'poi.json';
        const audioAttachJoint1 = 'char:def_c_neckB'; // Name of the joint to attach audio to
        const audioAttachJoint2 = 'char:def_c_neckB';
        const lookJoint1 = 'char:jx_c_look'; // Name of the joint to use for point of interest target tracking
        const lookJoint2 = 'char:jx_c_look';
        const voice1 = 'Joanna'; // Polly voice. Full list of available voices at: https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
        const voice2 = 'Joey';
        const voiceEngine = 'neural'; // Neural engine is not available for all voices in all regions: https://docs.aws.amazon.com/polly/latest/dg/NTTS-main.html

        // Set up the scene and hosts
        const { scene, camera } = await createScene();
        const {
            character: character1,
            clips: clips1,
            bindPoseOffset: bindPoseOffset1,
        } = await loadCharacter(
            scene,
            characterFile1,
            animationPath1,
            animationFiles
        );
        const {
            character: character2,
            clips: clips2,
            bindPoseOffset: bindPoseOffset2,
        } = await loadCharacter(
            scene,
            characterFile2,
            animationPath2,
            animationFiles
        );

        character1.position.x = 1.25;
        character1.rotation.y = -0.5;
        character2.position.x = -0.5;
        character2.rotation.y = 0.5;

        // Find the joints defined by name
        const children1 = character1.getDescendants(false);
        const audioAttach1 = children1.find(
            child => child.name === audioAttachJoint1
        );
        const lookTracker1 = children1.find(child => child.name === lookJoint1);
        const children2 = character2.getDescendants(false);
        const audioAttach2 = children2.find(
            child => child.name === audioAttachJoint2
        );
        const lookTracker2 = children2.find(child => child.name === lookJoint2);

        // Read the gesture config file. This file contains options for splitting up
        // each animation in gestures.glb into 3 sub-animations and initializing them
        // as a QueueState animation.
        const gestureConfig1 = await fetch(
            `${animationPath1}/${gestureConfigFile}`
        ).then(response => response.json());
        const gestureConfig2 = await fetch(
            `${animationPath2}/${gestureConfigFile}`
        ).then(response => response.json());

        // Read the point of interest config file. This file contains options for
        // creating Blend2dStates from look pose clips and initializing look layers
        // on the PointOfInterestFeature.
        const poiConfig1 = await fetch(
            `${animationPath1}/${poiConfigFile}`
        ).then(response => response.json());
        const poiConfig2 = await fetch(
            `${animationPath2}/${poiConfigFile}`
        ).then(response => response.json());

        const [
            idleClips1,
            lipsyncClips1,
            gestureClips1,
            emoteClips1,
            faceClips1,
            blinkClips1,
            poiClips1,
        ] = clips1;
        const host1 = createHost(
            character1,
            audioAttach1,
            voice1,
            voiceEngine,
            idleClips1[0],
            faceClips1[0],
            lipsyncClips1,
            gestureClips1,
            gestureConfig1,
            emoteClips1,
            blinkClips1,
            poiClips1,
            poiConfig1,
            lookTracker1,
            bindPoseOffset1,
            scene,
            camera
        );
        const [
            idleClips2,
            lipsyncClips2,
            gestureClips2,
            emoteClips2,
            faceClips2,
            blinkClips2,
            poiClips2,
        ] = clips2;
        const host2 = createHost(
            character2,
            audioAttach2,
            voice2,
            voiceEngine,
            idleClips2[0],
            faceClips2[0],
            lipsyncClips2,
            gestureClips2,
            gestureConfig2,
            emoteClips2,
            blinkClips2,
            poiClips2,
            poiConfig2,
            lookTracker2,
            bindPoseOffset2,
            scene,
            camera
        );

        // Turn down blink layer weight to account for the difference in eyelid height between Grace and Fiona
        host1.AnimationFeature.setLayerWeight('Blink', 0.5);

        // Set up each host to look at the other when the other speaks and at the
        // camera when speech ends
        const onHost1StartSpeech = () => {
            host2.PointOfInterestFeature.setTarget(lookTracker1);
        };
        const onHost2StartSpeech = () => {
            host1.PointOfInterestFeature.setTarget(lookTracker2);
        };
        const onStopSpeech = () => {
            host1.PointOfInterestFeature.setTarget(camera);
            host2.PointOfInterestFeature.setTarget(camera);
        };

        host1.listenTo(
            host1.TextToSpeechFeature.EVENTS.play,
            onHost1StartSpeech
        );
        host1.listenTo(
            host1.TextToSpeechFeature.EVENTS.resume,
            onHost1StartSpeech
        );
        host2.listenTo(
            host2.TextToSpeechFeature.EVENTS.play,
            onHost2StartSpeech
        );
        host2.listenTo(
            host2.TextToSpeechFeature.EVENTS.resume,
            onHost2StartSpeech
        );
        HOST.aws.TextToSpeechFeature.listenTo(
            HOST.aws.TextToSpeechFeature.EVENTS.pause,
            onStopSpeech
        );
        HOST.aws.TextToSpeechFeature.listenTo(
            HOST.aws.TextToSpeechFeature.EVENTS.stop,
            onStopSpeech
        );

        // Hide the load screen and show the text input
        document.getElementById('textToSpeech').style.display = 'inline-block';
        document.getElementById('loadScreen').style.display = 'none';

        // Wait for the TextToSpeechFeature to be ready
        await speechInit;

        speakers.set('Grace', host1);
        speakers.set('Wes', host2);

        initializeUX();
    }

    // Set up base scene
    async function createScene() {
        // Canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'renderCanvas';
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        document.body.appendChild(canvas);

        // Scene
        const engine = new BABYLON.Engine(canvas, true, undefined, true);
        const scene = new BABYLON.Scene(engine);
        scene.useRightHandedSystem = true;
        scene.fogColor.set(0.5, 0.5, 0.5);
        const assetManager = new BABYLON.AssetsManager(scene);


        // Use our own button to enable audio
        BABYLON.Engine.audioEngine.useCustomUnlockedButton = true;

        // Handle window resize
        window.addEventListener('resize', function () {
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            engine.resize();
        });
        engine.runRenderLoop(scene.render.bind(scene));

        // Camera
        const camera = new BABYLON.ArcRotateCamera(
            'Camera',
            Math.PI / 2,
            Math.PI / 2,
            1.4,
            new BABYLON.Vector3(0, 2, 0),
            scene
        );
        camera.minZ = 0.1;
        camera.maxZ = 1000;
        camera.setPosition(new BABYLON.Vector3(0, 3, 3.1));
        camera.setTarget(new BABYLON.Vector3(0, 0.8, 0));
        camera.wheelDeltaPercentage = 0.01;
        camera.attachControl(canvas, true);

        // Lights
        var hemiLight = new BABYLON.HemisphericLight(
            'light1',
            new BABYLON.Vector3(0, 1, 0),
            scene
        );
        hemiLight.intensity = 0.6;
        hemiLight.specular = BABYLON.Color3.Black();

        var dirLight = new BABYLON.DirectionalLight(
            'dir01',
            new BABYLON.Vector3(0, -0.5, -1.0),
            scene
        );
        dirLight.position = new BABYLON.Vector3(0, 5, 5);

        // Shadows
        shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 6, height: 6 });
        ground.receiveShadows = true;
        const groundMaterial = new BABYLON.StandardMaterial("ground", scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture(
            "assets/images/AWSMLHeroes.png", scene, false, false);
        ground.material = groundMaterial;

        // Environment
        await scene.createDefaultXRExperienceAsync({
            enableGroundShadow: true,
        });

        return { scene, camera };
    }

    // Load character model and animations
    async function loadCharacter(
        scene,
        characterFile,
        animationPath,
        animationFiles
    ) {
        // Load character model
        const {
            character,
            bindPoseOffset,
        } = await BABYLON.SceneLoader.LoadAssetContainerAsync(
            characterFile
        ).then(container => {
            const [character] = container.meshes;
            const [bindPoseOffset] = container.animationGroups;

            // Make the offset pose additive
            if (bindPoseOffset) {
                BABYLON.AnimationGroup.MakeAnimationAdditive(bindPoseOffset);
            }

            // Add everything to the scene
            container.scene = scene;
            container.addAllToScene();

            // Cast shadows but don't receive
            shadowGenerator.addShadowCaster(character, true);
            for (var index = 0; index < container.meshes.length; index++) {
                container.meshes[index].receiveShadows = false;
            }

            return { character, bindPoseOffset };
        });

        const children = character.getDescendants(false);

        // Load animations
        const clips = await Promise.all(
            animationFiles.map((filename, index) => {
                const filePath = `${animationPath}/${filename}`;

                return BABYLON.SceneLoader.LoadAssetContainerAsync(filePath).then(
                    container => {
                        const startingIndex = scene.animatables.length;
                        const firstIndex = scene.animationGroups.length;

                        // Apply animation to character
                        container.mergeAnimationsTo(
                            scene,
                            scene.animatables.slice(startingIndex),
                            target => children.find(c => c.name === target.name) || null
                        );

                        // Find the new animations and destroy the container
                        const animations = scene.animationGroups.slice(firstIndex);
                        container.dispose();
                        scene.onAnimationFileImportedObservable.notifyObservers(scene);

                        return animations;
                    }
                );
            })
        );

        return { character, clips, bindPoseOffset };
    }

    // Initialize the host
    function createHost(
        character,
        audioAttachJoint,
        voice,
        engine,
        idleClip,
        faceIdleClip,
        lipsyncClips,
        gestureClips,
        gestureConfig,
        emoteClips,
        blinkClips,
        poiClips,
        poiConfig,
        lookJoint,
        bindPoseOffset,
        scene,
        camera
    ) {
        // Add the host to the render loop
        const host = new HOST.HostObject({ owner: character });
        scene.onBeforeAnimationsObservable.add(() => {
            host.update();
        });

        // Set up text to speech
        host.addFeature(HOST.aws.TextToSpeechFeature, false, {
            scene,
            attachTo: audioAttachJoint,
            voice,
            engine,
        });

        // Set up animation
        host.addFeature(HOST.anim.AnimationFeature);

        // Base idle
        host.AnimationFeature.addLayer('Base');
        host.AnimationFeature.addAnimation(
            'Base',
            idleClip.name,
            HOST.anim.AnimationTypes.single,
            { clip: idleClip }
        );
        host.AnimationFeature.playAnimation('Base', idleClip.name);

        // Face idle
        host.AnimationFeature.addLayer('Face', {
            blendMode: HOST.anim.LayerBlendModes.Additive,
        });
        BABYLON.AnimationGroup.MakeAnimationAdditive(faceIdleClip);
        host.AnimationFeature.addAnimation(
            'Face',
            faceIdleClip.name,
            HOST.anim.AnimationTypes.single,
            { clip: faceIdleClip, from: 1 / 30, to: faceIdleClip.to }
        );
        host.AnimationFeature.playAnimation('Face', faceIdleClip.name);

        // Blink
        host.AnimationFeature.addLayer('Blink', {
            blendMode: HOST.anim.LayerBlendModes.Additive,
            transitionTime: 0.075,
        });
        blinkClips.forEach(clip => {
            BABYLON.AnimationGroup.MakeAnimationAdditive(clip);
        });
        host.AnimationFeature.addAnimation(
            'Blink',
            'blink',
            HOST.anim.AnimationTypes.randomAnimation,
            {
                playInterval: 3,
                subStateOptions: blinkClips.map(clip => {
                    return {
                        name: clip.name,
                        loopCount: 1,
                        clip,
                    };
                }),
            }
        );
        host.AnimationFeature.playAnimation('Blink', 'blink');

        // Talking idle
        host.AnimationFeature.addLayer('Talk', {
            transitionTime: 0.75,
            blendMode: HOST.anim.LayerBlendModes.Additive,
        });
        host.AnimationFeature.setLayerWeight('Talk', 0);
        const talkClip = lipsyncClips.find(c => c.name === 'stand_talk');
        BABYLON.AnimationGroup.MakeAnimationAdditive(talkClip);
        lipsyncClips.splice(lipsyncClips.indexOf(talkClip), 1);
        host.AnimationFeature.addAnimation(
            'Talk',
            talkClip.name,
            HOST.anim.AnimationTypes.single,
            { clip: talkClip }
        );
        host.AnimationFeature.playAnimation('Talk', talkClip.name);

        // Gesture animations
        host.AnimationFeature.addLayer('Gesture', {
            transitionTime: 0.5,
            blendMode: HOST.anim.LayerBlendModes.Additive,
        });

        gestureClips.forEach(clip => {
            const { name } = clip;
            const config = gestureConfig[name];
            BABYLON.AnimationGroup.MakeAnimationAdditive(clip);

            if (config !== undefined) {
                // Add the clip to each queueOption so it can be split up
                config.queueOptions.forEach((option, index) => {
                    option.clip = clip;
                    option.to /= 30.0;
                    option.from /= 30.0;
                });
                host.AnimationFeature.addAnimation(
                    'Gesture',
                    name,
                    HOST.anim.AnimationTypes.queue,
                    config
                );
            } else {
                host.AnimationFeature.addAnimation(
                    'Gesture',
                    name,
                    HOST.anim.AnimationTypes.single,
                    { clip }
                );
            }
        });

        // Emote animations
        host.AnimationFeature.addLayer('Emote', {
            transitionTime: 0.5,
        });

        emoteClips.forEach(clip => {
            const { name } = clip;
            host.AnimationFeature.addAnimation(
                'Emote',
                name,
                HOST.anim.AnimationTypes.single,
                { clip, loopCount: 1 }
            );
        });

        // Viseme poses
        host.AnimationFeature.addLayer('Viseme', {
            transitionTime: 0.12,
            blendMode: HOST.anim.LayerBlendModes.Additive,
        });
        host.AnimationFeature.setLayerWeight('Viseme', 0);
        const blendStateOptions = lipsyncClips.map(clip => {
            BABYLON.AnimationGroup.MakeAnimationAdditive(clip);
            return {
                name: clip.name,
                clip,
                weight: 0,
                from: 1 / 30,
                to: 2 / 30,
            };
        });
        host.AnimationFeature.addAnimation(
            'Viseme',
            'visemes',
            HOST.anim.AnimationTypes.freeBlend,
            { blendStateOptions }
        );
        host.AnimationFeature.playAnimation('Viseme', 'visemes');

        // POI poses
        const children = character.getDescendants(false);
        poiConfig.forEach(config => {
            host.AnimationFeature.addLayer(config.name, {
                blendMode: HOST.anim.LayerBlendModes.Additive,
            });

            // Find each pose clip and make it additive
            config.blendStateOptions.forEach(clipConfig => {
                clip = poiClips.find(clip => clip.name === clipConfig.clip);
                BABYLON.AnimationGroup.MakeAnimationAdditive(clip);
                clipConfig.clip = clip;
                clipConfig.from = 1 / 30;
                clipConfig.to = 2 / 30;
            });

            host.AnimationFeature.addAnimation(
                config.name,
                config.animation,
                HOST.anim.AnimationTypes.blend2d,
                { ...config }
            );

            host.AnimationFeature.playAnimation(config.name, config.animation);

            // Find and store the reference object
            config.reference = children.find(
                child => child.name === config.reference
            );
        });

        // Apply bindPoseOffset clip if it exists
        if (bindPoseOffset !== undefined) {
            host.AnimationFeature.addLayer('BindPoseOffset', {
                blendMode: HOST.anim.LayerBlendModes.Additive,
            });
            host.AnimationFeature.addAnimation(
                'BindPoseOffset',
                bindPoseOffset.name,
                HOST.anim.AnimationTypes.single,
                { clip: bindPoseOffset, from: 1 / 30, to: 2 / 30 }
            );
            host.AnimationFeature.playAnimation(
                'BindPoseOffset',
                bindPoseOffset.name
            );
        }

        // Set up Lipsync
        const visemeOptions = {
            layers: [
                {
                    name: 'Viseme',
                    animation: 'visemes',
                },
            ],
        };
        const talkingOptions = {
            layers: [
                {
                    name: 'Talk',
                    animation: 'stand_talk',
                    blendTime: 0.75,
                    easingFn: HOST.anim.Easing.Quadratic.InOut,
                },
            ],
        };
        host.addFeature(
            HOST.LipsyncFeature,
            false,
            visemeOptions,
            talkingOptions
        );

        // Set up Gestures
        host.addFeature(HOST.GestureFeature, false, {
            layers: {
                Gesture: { minimumInterval: 3 },
                Emote: {
                    blendTime: 0.5,
                    easingFn: HOST.anim.Easing.Quadratic.InOut,
                },
            },
        });

        // Set up Point of Interest
        host.addFeature(
            HOST.PointOfInterestFeature,
            false,
            {
                target: camera,
                lookTracker: lookJoint,
                scene,
            },
            {
                layers: poiConfig,
            },
            {
                layers: [{ name: 'Blink' }],
            }
        );

        return host;
    }

    // Return the host whose name matches the text of the current tab
    function getCurrentHost() {
        var name = $("input[name='ActiveHost']:checked").val();
        return { name, host: speakers.get(name) };
    }

    function initializeUX(speakers) {

        // Update the text area text with gesture SSML markup when clicked

        msgerForm.addEventListener("submit", event => {
            event.preventDefault();

            const msgText = msgerInput.value;
            if (!msgText) return;

            appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText);
            msgerInput.value = "";

            const { name, host } = getCurrentHost(speakers);
            const gestureMap = host.GestureFeature.createGestureMap();
            const gestureArray = host.GestureFeature.createGenericGestureArray([
                'Gesture',
            ]);

            const urlParams = getUrlVars();
            const apikey = urlParams['apikey'];
            const endpoint = urlParams['endpoint'];

            const messages = conversations.get(name);
            const data = {
                "model": $("#models").find(':selected').val().split(",")[1],
                "past_user_inputs": [...messages.past_user_inputs],
                "generated_responses": [...messages.generated_responses],
                "text": msgText
            }
            messages.past_user_inputs.push(msgText);

            $.ajax({
                url: endpoint + $("#models").find(':selected').val().split(",")[0],
                contentType: 'application/json',
                type: "POST",
                dataType: 'json',
                headers: {
                    "X-Api-Key": apikey
                },
                data: JSON.stringify(data)
            }).then(answer => {

                if (!answer.message) {
                    botResponse("No answer!");
                    return;
                }

                const ssml = HOST.aws.TextToSpeechUtils.autoGenerateSSMLMarks(
                    answer.message,
                    gestureMap,
                    gestureArray
                );

                host.TextToSpeechFeature["play"](ssml);

                const messages = conversations.get(name);
                if (answer.message) {
                    messages.generated_responses.push(answer.message);
                } else {
                    messages.generated_responses.push("");
                }
                botResponse($('#showSSM').is(':checked') ? ssml : answer.message);
            });

        });


    }
    main();
});


