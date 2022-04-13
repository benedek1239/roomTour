import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/OBJLoader.js';



class BasicCharacterControllerProxy {
    constructor(animations) {
        this._animations = animations;
    }

    get animations() {
        return this._animations;
    }
};


class BasicCharacterController {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._params = params;
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._position = new THREE.Vector3();

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFSM(
            new BasicCharacterControllerProxy(this._animations));

        this._LoadModels();
    }

    _LoadModels() {
        const loader = new FBXLoader();
        loader.setPath('./resources/zombie/');
        loader.load('mremireh_o_desbiens.fbx', (fbx) => {
            fbx.scale.setScalar(0.07);
            fbx.position.set(30, 0, 0);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            this._target = fbx;
            this._params.scene.add(this._target);

            this._mixer = new THREE.AnimationMixer(this._target);

            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('./resources/zombie/');
            loader.load('walk.fbx', (a) => { _OnLoad('walk', a); });
            loader.load('run.fbx', (a) => { _OnLoad('run', a); });
            loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
            loader.load('dance.fbx', (a) => { _OnLoad('dance', a); });
        });
    }

    get Position() {
        return this._position;
    }

    get Rotation() {
        if (!this._target) {
            return new THREE.Quaternion();
        }
        return this._target.quaternion;
    }

    Update(timeInSeconds) {
        if (!this._stateMachine._currentState) {
            return;
        }

        this._stateMachine.Update(timeInSeconds, this._input);

        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
            Math.abs(frameDecceleration.z), Math.abs(velocity.z));

        velocity.add(frameDecceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        const acc = this._acceleration.clone();
        if (this._input._keys.shift) {
            acc.multiplyScalar(2.0);
        }

        if (this._stateMachine._currentState.Name == 'dance') {
            acc.multiplyScalar(0.0);
        }

        if (this._input._keys.forward) {
            velocity.z += acc.z * timeInSeconds;
            // if (controlObject.position.x > -8 && controlObject.position.x < 40) {
            //     velocity.z += acc.z * timeInSeconds;
            // }
            // else {
            //     if (controlObject.position.x < -6) {
            //         controlObject.position.x = -7.9;
            //     }
            //     else {
            //         controlObject.position.x = 39.9;
            //     }
            // }
        }
        if (this._input._keys.backward) {
            if (controlObject.position.x > -8 && controlObject.position.x < 40) {
                velocity.z -= acc.z * timeInSeconds;
            }
            else {
                if (controlObject.position.x < -6) {
                    controlObject.position.x = -7.9;
                }
                else {
                    controlObject.position.x = 39.9;
                }
            }
        }
        if (this._input._keys.left) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }
        if (this._input._keys.right) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();

        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        this._position.copy(controlObject.position);

        if (this._mixer) {
            this._mixer.update(timeInSeconds);
        }
    }
};

class BasicCharacterControllerInput {
    constructor() {
        this._Init();
    }

    _Init() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };
        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87: // w
                this._keys.forward = true;
                break;
            case 65: // a
                this._keys.left = true;
                break;
            case 83: // s
                this._keys.backward = true;
                break;
            case 68: // d
                this._keys.right = true;
                break;
            case 32: // SPACE
                this._keys.space = true;
                break;
            case 16: // SHIFT
                this._keys.shift = true;
                break;
        }
    }

    _onKeyUp(event) {
        switch (event.keyCode) {
            case 87: // w
                this._keys.forward = false;
                break;
            case 65: // a
                this._keys.left = false;
                break;
            case 83: // s
                this._keys.backward = false;
                break;
            case 68: // d
                this._keys.right = false;
                break;
            case 32: // SPACE
                this._keys.space = false;
                break;
            case 16: // SHIFT
                this._keys.shift = false;
                break;
        }
    }
};


class FiniteStateMachine {
    constructor() {
        this._states = {};
        this._currentState = null;
    }

    _AddState(name, type) {
        this._states[name] = type;
    }

    SetState(name) {
        const prevState = this._currentState;

        if (prevState) {
            if (prevState.Name == name) {
                return;
            }
            prevState.Exit();
        }

        const state = new this._states[name](this);

        this._currentState = state;
        state.Enter(prevState);
    }

    Update(timeElapsed, input) {
        if (this._currentState) {
            this._currentState.Update(timeElapsed, input);
        }
    }
};


class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
        this._AddState('dance', DanceState);
    }
};


class State {
    constructor(parent) {
        this._parent = parent;
    }

    Enter() { }
    Exit() { }
    Update() { }
};


class DanceState extends State {
    constructor(parent) {
        super(parent);

        this._FinishedCallback = () => {
            this._Finished();
        }
    }

    get Name() {
        return 'dance';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['dance'].action;
        const mixer = curAction.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);

        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.reset();
            curAction.setLoop(THREE.LoopOnce, 1);
            curAction.clampWhenFinished = true;
            curAction.crossFadeFrom(prevAction, 0.2, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    _Finished() {
        this._Cleanup();
        this._parent.SetState('idle');
    }

    _Cleanup() {
        const action = this._parent._proxy._animations['dance'].action;

        action.getMixer().removeEventListener('finished', this._CleanupCallback);
    }

    Exit() {
        this._Cleanup();
    }

    Update(_) {
    }
};


class WalkState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.forward || input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};


class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;

            curAction.enabled = true;

            if (prevState.Name == 'walk') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }

            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }

    Exit() {
    }

    Update(timeElapsed, input) {
        if (input._keys.forward || input._keys.backward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk');
            }
            return;
        }

        this._parent.SetState('idle');
    }
};


class IdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'idle';
    }

    Enter(prevState) {
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }

    Exit() {
    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            this._parent.SetState('walk');
        } else if (input._keys.space) {
            this._parent.SetState('dance');
        }
    }
};


class ThirdPersonCamera {
    constructor(params) {
        this._params = params;
        this._camera = params.camera;

        this._currentPosition = new THREE.Vector3();
        this._currentLookat = new THREE.Vector3();
    }

    _CalculateIdealOffset() {
        const idealOffset = new THREE.Vector3(-15, 20, -30);
        idealOffset.applyQuaternion(this._params.target.Rotation);
        idealOffset.add(this._params.target.Position);
        return idealOffset;
    }

    _CalculateIdealLookat() {
        const idealLookat = new THREE.Vector3(0, 10, 50);
        idealLookat.applyQuaternion(this._params.target.Rotation);
        idealLookat.add(this._params.target.Position);
        return idealLookat;
    }

    Update(timeElapsed) {
        const idealOffset = this._CalculateIdealOffset();
        const idealLookat = this._CalculateIdealLookat();

        // const t = 0.05;
        // const t = 4.0 * timeElapsed;
        const t = 1.0 - Math.pow(0.001, timeElapsed);

        this._currentPosition.lerp(idealOffset, t);
        this._currentLookat.lerp(idealLookat, t);

        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);

        if (this._camera.position.z < -51) {
            this._camera.position.z = -50;
        }

    }
}


class ThirdPersonCameraDemo {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        this._threejs = new THREE.WebGLRenderer({
            antialias: true
        });
        this._threejs.outputEncoding = THREE.sRGBEncoding;
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);

        const fbxLoader = new FBXLoader();
        const objloader = new OBJLoader();
        const imageLoader = new THREE.ImageLoader();
        var textureLoader = new THREE.TextureLoader();
        const gltfLoader = new GLTFLoader();

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0;
        const far = 1000.0;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(135, 10, 25);

        this._scene = new THREE.Scene();
        let light = new THREE.DirectionalLight(0xFFFFFF, 0.45);
        light.position.set(0, 14, 0);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 4096;
        light.shadow.mapSize.height = 4096;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 50;
        light.shadow.camera.right = -50;
        light.shadow.camera.top = 50;
        light.shadow.camera.bottom = -50;
        this._scene.add(light);

        light = new THREE.AmbientLight(0xFFFFFF, 0.35);
        this._scene.add(light);

        const loader = new THREE.CubeTextureLoader();

        //Door
        fbxLoader.load(
            'resources/door/Door.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.position.set(18, 0, -50);
                object.scale.set(.16, .17, .28);
                object.rotation.y = -Math.PI / 2;
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                    }
                });
            })

        //Bed
        fbxLoader.load(
            'resources/bed/Bed.FBX',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.position.set(-30, -3, -31);
                object.scale.set(.6, .55, .7);
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Rick and Morty
        var material = new THREE.MeshLambertMaterial({
            map: textureLoader.load('resources/rick.jpg')
        });
        var geometry = new THREE.PlaneGeometry(37, 16);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-23, 35, -49.7)
        mesh.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.visible = true;
            }
        });
        this._scene.add(mesh);

        //Black Carpet
        let blackCarpet = new THREE.Mesh(
            new THREE.PlaneGeometry(22, 65, 10, 15),
            new THREE.MeshStandardMaterial({
                color: 0x010101,
            }));
        blackCarpet.position.set(15, 0.01, 9);
        blackCarpet.castShadow = false;
        blackCarpet.receiveShadow = true;
        blackCarpet.rotation.x = -Math.PI / 2;
        this._scene.add(blackCarpet);

        //Cabinet
        fbxLoader.load(
            'resources/cabinet/cabinet.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.position.set(-1, -3, -46);
                object.scale.set(.15, .12, .15);
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Lamp
        objloader.load(
            'resources/lamp/lowpoly.obj',
            (object) => {
                object.position.set(-3, 7, -46);
                object.scale.set(13, 13, 13);
                object.rotation.y += 0.6;
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Table
        fbxLoader.load(
            'resources/table1/table.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.position.set(-27, 3, 10);
                object.scale.set(.028, .022, .022);
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Tv
        fbxLoader.load(
            'resources/tv/tv.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.scale.set(.09, .12, .12);
                object.position.set(-27.5, 11.5, -3);
                object.rotation.z += Math.PI / 2;
                object.children[0].material.color.set(0x000000)
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Carpet
        var material = new THREE.MeshLambertMaterial({
            map: textureLoader.load('resources/carpet.jpg')
        });
        var geometry = new THREE.PlaneGeometry(64, 40);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x += Math.PI / 2;
        mesh.rotation.z -= Math.PI / 2;
        mesh.scale.z *= -1;
        mesh.position.set(-30, 0.1, 50)
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this._scene.add(mesh);

        //Table 2
        fbxLoader.load(
            'resources/table2/table.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.scale.set(.1, .12, .107);
                object.position.set(-34, 0.1, 28);
                object.rotation.y += Math.PI;
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })
        //Table 2 top
        var material = new THREE.MeshLambertMaterial({
            map: textureLoader.load('resources/wood.jpg')
        });
        var geometry = new THREE.PlaneGeometry(30, 13);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x += Math.PI / 2;
        mesh.scale.z *= -1;
        mesh.position.set(-33.8, 8.9, 28)
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this._scene.add(mesh);

        //Table 3
        fbxLoader.load(
            'resources/table2/table.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.scale.set(.11, .12, .13);
                object.position.set(-41, 0.1, 51);
                object.rotation.y -= Math.PI / 2;
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })
        //Table 3 top
        let table3top = new THREE.Mesh(
            new THREE.PlaneGeometry(16, 33, 10, 15),
            new THREE.MeshStandardMaterial({
                color: 0x020202,
            }));
        table3top.position.set(-41, 9, 51);
        table3top.castShadow = false;
        table3top.receiveShadow = true;
        table3top.rotation.x = -Math.PI / 2;
        this._scene.add(table3top);

        //Playstation
        fbxLoader.load(
            'resources/ps/ps.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.position.set(-39, 9.5, 28);
                object.scale.set(.009, .005, .009);
                object.children[0].material.color.set(0xFFFFFF)
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Coffe
        var material = new THREE.MeshLambertMaterial({
            map: textureLoader.load('resources/coffe.png')
        });
        var geometry = new THREE.PlaneGeometry(19, 19);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(-49.9, 35, 55)
        mesh.rotation.y += Math.PI / 2;
        mesh.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.visible = true;
            }
        });
        this._scene.add(mesh);

        //Laptop
        fbxLoader.load(
            'resources/laptop/laptop v3_0.fbx',
            (object) => {
                object.castShadow = true;
                object.receiveShadow = true;
                object.position.set(-26, 8.7, 29);
                object.scale.set(.004, .004, .004);
                object.children[1].material[0].color.set(0x000000);
                object.children[1].material[1].color.set(0xFF0000);
                object.children[1].material[3].color.set(0xFF0000);

                object.rotation.y += Math.PI / 2;
                this._scene.add(object);
                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            })

        //Monitor
        fbxLoader.load(
            'resources/monitor/monitor2.fbx',
            (object) => {
                object.position.set(-47, 9.2, 51);
                object.scale.set(1.6, 1, 1.6);
                this._scene.add(object);
                object.children[0].material[0].color.set(0x020202)
                object.children[0].material[1].color.set(0x020202)
            })

        //Ryzen
        var material = new THREE.MeshLambertMaterial({
            map: textureLoader.load('resources/ryzen.png')
        });
        var geometry = new THREE.PlaneGeometry(17, 7);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.scale.z *= -1;
        mesh.rotation.x += Math.PI / 2;
        mesh.rotation.z -= 4.72;
        mesh.position.set(-38, 9.1, 51)
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this._scene.add(mesh);

        //Piano
        fbxLoader.load(
            'resources/piano/piano.fbx',
            (object) => {
                object.position.set(-15, 0, 72);
                object.scale.set(0.22, 0.13, 0.2);
                object.rotation.y += Math.PI;
                this._scene.add(object);

                object.children[5].material[0].color.set(0x010101);
                object.children[5].material[1].visible = false;
                object.children[5].material[2].visible = false;
                object.children[5].material[3].color.set(0x010101);
                object.children[5].material[4].color.set(0x010101);
                object.children[5].material[5].color.set(0x010101);
                object.children[5].material[7].color.set(0x010101);
                object.children[5].material[8].color.set(0x010101);

                object.children[7].material.color.set(0x010101);

                object.children[8].material.color.set(0x010101);
                object.children[9].material.color.set(0x010101);
                object.children[10].material.color.set(0x010101);
                object.children[11].material.color.set(0x010101);
                object.children[12].material.color.set(0x010101);
                object.children[13].material.color.set(0x010101);
                object.children[14].material.color.set(0x010101);
                object.children[15].material.color.set(0x010101);
                object.children[16].material.color.set(0x010101);
                object.children[17].material.color.set(0x010101);
                object.children[18].material.color.set(0x010101);
                object.children[19].material.color.set(0x010101);
            })

            //Mouse
            fbxLoader.load(
                'resources/mouse/mouse.fbx',
                (object) => {
                    object.position.set(-37, 9.1, 45);
                    object.scale.set(0.6, 0.6, 0.6);
                    object.rotation.y += Math.PI / 2;
                    object.children[0].material[0].color.set(0x000000);
                    object.children[0].material[1].color.set(0x000000);
                    object.children[0].material[2].color.set(0x000000);

                    this._scene.add(object);
                })

            //Keyboard
            fbxLoader.load(
                'resources/keyboard/keyboard.fbx',
                (object) => {
                    object.position.set(-38, 9.7, 56);
                    object.scale.set(0.0026, 0.0026, 0.0026);
                    object.rotation.y += Math.PI / 2;
                    this._scene.add(object);
                    object.children[0].material.visible = false;
                })

            //Curtain
            objloader.load(
                'resources/curtain/curtain.obj',
                (object) => {
                    object.position.set(5, 4, 82);
                    object.scale.set(0.05, 0.07, 0.04);
                    object.rotation.z += Math.PI / 2;
                    object.rotation.x -= Math.PI / 2;
                    object.children[0].material.color.set(0x020303);

                    this._scene.add(object);
                })
        
            //Speaker 1
            fbxLoader.load(
                'resources/speaker/speaker.fbx',
                (object) => {
                    object.position.set(-46, 10.2, 65);
                    object.scale.set(0.01, 0.01, 0.01);
                    object.rotation.y += 2.1;
                    object.children[0].material.color.set(0x020202);
                    object.children[0].children[0].material[0].color.set(0x050505);
                    object.children[0].children[0].material[1].color.set(0x030303);
                    this._scene.add(object);
                })

            //Speaker 2
            fbxLoader.load(
                'resources/speaker/speaker.fbx',
                (object) => {
                    object.position.set(-46, 10.2, 37);
                    object.scale.set(0.01, 0.01, 0.01);
                    object.rotation.y += 1.2;
                    object.children[0].material.color.set(0x020202);
                    object.children[0].children[0].material[0].color.set(0x050505);
                    object.children[0].children[0].material[1].color.set(0x030303);
                    this._scene.add(object);
                })

            let floor = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 140, 10, 10),
                new THREE.MeshStandardMaterial({
                    color: 0x4f2611,
                }));
            floor.position.set(0, 0, 20);
            floor.castShadow = false;
            floor.receiveShadow = true;
            floor.rotation.x = -Math.PI / 2;
            this._scene.add(floor);

            let ceiling = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 140, 10, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFFFFFF,
                }));
            ceiling.castShadow = false;
            ceiling.receiveShadow = true;
            ceiling.position.set(0, 50, 20);
            ceiling.rotation.x = Math.PI / 2;
            this._scene.add(ceiling);

            let plane2 = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 50, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xffb029,
                }));
            plane2.castShadow = false;
            plane2.position.set(0, 25, -50);
            plane2.receiveShadow = true;
            this._scene.add(plane2);
            let plane2Up = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 2, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFAFAFA,
                }));
            plane2Up.castShadow = false;
            plane2Up.position.set(0, 49, -49.9);
            plane2Up.receiveShadow = true;
            this._scene.add(plane2Up);

            let plane3 = new THREE.Mesh(
                new THREE.PlaneGeometry(140, 50, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xffb029,
                }));
            plane3.castShadow = false;
            plane3.position.set(50, 25, 20);
            plane3.receiveShadow = true;
            plane3.rotation.y = -Math.PI / 2;
            this._scene.add(plane3);
            let plane3Up = new THREE.Mesh(
                new THREE.PlaneGeometry(140, 2, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFAFAFA,
                }));
            plane3Up.castShadow = false;
            plane3Up.position.set(49.9, 49, 20);
            plane3Up.receiveShadow = true;
            plane3Up.rotation.y = -Math.PI / 2;
            this._scene.add(plane3Up);

            let plane4 = new THREE.Mesh(
                new THREE.PlaneGeometry(140, 50, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xffb029,
                }));
            plane4.castShadow = false;
            plane4.position.set(-50, 25, 20);
            plane4.receiveShadow = true;
            plane4.rotation.y = Math.PI / 2;
            this._scene.add(plane4);
            let plane4Up = new THREE.Mesh(
                new THREE.PlaneGeometry(140, 2, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFAFAFA,
                }));
            plane4Up.castShadow = false;
            plane4Up.position.set(-49.9, 49, 20);
            plane4Up.receiveShadow = true;
            plane4Up.rotation.y = Math.PI / 2;
            this._scene.add(plane4Up);

            let plane5 = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 50, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xffb029,
                }));
            plane5.castShadow = false;
            plane5.position.set(0, 25, 87);
            plane5.rotation.y -= Math.PI;
            plane5.receiveShadow = true;
            this._scene.add(plane5);
            let plane5Up = new THREE.Mesh(
                new THREE.PlaneGeometry(100, 2, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFAFAFA,
                }));
            plane5Up.castShadow = false;
            plane5Up.rotation.y -= Math.PI;
            plane5Up.position.set(0, 49, 86.9);
            plane5Up.receiveShadow = true;
            this._scene.add(plane5Up);

            let extrapanel1 = new THREE.Mesh(
                new THREE.PlaneGeometry(5, 50, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xffb029,
                }));
            extrapanel1.castShadow = false;
            extrapanel1.position.set(-44, 25, 85);
            extrapanel1.receiveShadow = true;
            extrapanel1.rotation.y = Math.PI / 2;
            this._scene.add(extrapanel1);
            let extrapanel1Up = new THREE.Mesh(
                new THREE.PlaneGeometry(5, 2, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFAFAFA,
                }));
            extrapanel1Up.castShadow = false;
            extrapanel1Up.position.set(-43.98, 49, 85);
            extrapanel1Up.receiveShadow = true;
            extrapanel1Up.rotation.y = Math.PI / 2;
            this._scene.add(extrapanel1Up);

            let extraplane2 = new THREE.Mesh(
                new THREE.PlaneGeometry(7, 50, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xffb029,
                }));
            extraplane2.castShadow = false;
            extraplane2.position.set(-47.5, 25, 82.5);
            extraplane2.rotation.y -= Math.PI;
            extraplane2.receiveShadow = true;
            this._scene.add(extraplane2);
            let extrapanel2Up = new THREE.Mesh(
                new THREE.PlaneGeometry(7, 2, 100, 10),
                new THREE.MeshStandardMaterial({
                    color: 0xFAFAFA,
                }));
            extrapanel2Up.castShadow = false;
            extrapanel2Up.position.set(-47.5, 49, 82.48);
            extrapanel2Up.receiveShadow = true;
            extrapanel2Up.rotation.y -= Math.PI;
            this._scene.add(extrapanel2Up);

        this._mixers = [];
        this._previousRAF = null;

        this._LoadAnimatedModel();
        this._RAF();
    }

    _LoadAnimatedModel() {
        const params = {
            camera: this._camera,
            scene: this._scene,
        }
        this._controls = new BasicCharacterController(params);

        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: this._camera,
            target: this._controls,
        });
    }

    _OnWindowResize() {
        this._threejs.setSize(window.innerWidth, window.innerHeight);
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
    }

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            this._RAF();

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }

        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }

        this._thirdPersonCamera.Update(timeElapsedS);
    }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new ThirdPersonCameraDemo();
});


function _LerpOverFrames(frames, t) {
    const s = new THREE.Vector3(0, 0, 0);
    const e = new THREE.Vector3(100, 0, 0);
    const c = s.clone();

    for (let i = 0; i < frames; i++) {
        c.lerp(e, t);
    }
    return c;
}

function _TestLerp(t1, t2) {
    const v1 = _LerpOverFrames(100, t1);
    const v2 = _LerpOverFrames(50, t2);
}

_TestLerp(0.01, 0.01);
_TestLerp(1.0 / 100.0, 1.0 / 50.0);
_TestLerp(1.0 - Math.pow(0.3, 1.0 / 100.0),
    1.0 - Math.pow(0.3, 1.0 / 50.0));