
import React, { Component } from 'react';

import {
    Engine,
    Scene,
    ArcRotateCamera,
    HemisphericLight,
    DirectionalLight,
    ShadowGenerator
  
} from 'react-babylonjs'
import { Vector3, Color3 } from '@babylonjs/core'



export default class ChatScene extends Component {

    constructor(props) {
        super(props);
        this.sceneRef = React.createRef();
    }

    createScene() {
        // Canvas
        const canvas = this.sceneRef;
        canvas.id = 'renderCanvas';
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        document.body.appendChild(canvas);

        // Scene
        const engine = new Engine(canvas, true, undefined, true);
        const scene = new Scene(engine);
        scene.useRightHandedSystem = true;
        scene.fogColor.set(0.5, 0.5, 0.5);
        // const assetManager = new AssetsManager(scene);

        // Use our own button to enable audio
        Engine.audioEngine.useCustomUnlockedButton = true;

        // Handle window resize
        window.addEventListener('resize', function () {
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            engine.resize();
        });
        engine.runRenderLoop(scene.render.bind(scene));

        // Camera
        const camera = new ArcRotateCamera(
            'Camera',
            Math.PI / 2,
            Math.PI / 2,
            1.4,
            new Vector3(0, 1.4, 0),
            scene
        );
        camera.minZ = 0.1;
        camera.maxZ = 1000;
        camera.setPosition(new Vector3(0, 1.4, 3.1));
        camera.setTarget(new Vector3(0, 0.8, 0));
        camera.wheelDeltaPercentage = 0.01;
        camera.attachControl(canvas, true);

        // Lights
        var hemiLight = new HemisphericLight(
            'light1',
            new Vector3(0, 1, 0),
            scene
        );
        hemiLight.intensity = 0.6;
        hemiLight.specular = Color3.Black();

        var dirLight = new DirectionalLight(
            'dir01',
            new Vector3(0, -0.5, -1.0),
            scene
        );
        dirLight.position = new Vector3(0, 5, 5);

        // Shadows
        this.shadowGenerator = new ShadowGenerator(1024, dirLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;

        // Environment
        var helper = scene.createDefaultEnvironment({
            enableGroundShadow: true,
        });
        helper.groundMaterial.primaryColor.set(0.5, 0.5, 0.5);
        helper.ground.receiveShadows = true;

        return { scene, camera };
    }

    render() {
        const { scene, camera } = this.createScene();
        
        return <canvas ref={this.sceneRef} />;
    }
}