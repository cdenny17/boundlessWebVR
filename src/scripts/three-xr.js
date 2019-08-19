import * as THREE from 'three';

let glCanvas = null;
let gl = null;
let scene = null;
let camera = null;
let renderer = null;
let leftHand = null;
let rightHand = null;
let buttonListeners = [];
let buttonReleaseListeners = [];
let update = () => {};
let xrSession = null;
let xrReferenceSpace = null;
let leftButtonsDown = [];
let rightButtonsDown = [];
let rightPosition = null;
let leftPosition = null;

/**
 * This checks for VR capable devices
  */
export function checkForXRSupport() {
    // Check to see if there is an XR device available that supports immersive VR
    // presentation (for example: displaying in a headset). If the device has that
    // capability the page will want to add an "Enter VR" button to the page (similar to
    // a "Fullscreen" button) that starts the display of immersive VR content.

    //just returns the promise for the user to call
    return navigator.xr.supportsSession('immersive-vr');
}

/**
 * The user must have a glCanvas scene camera and renderer in place then the XR session will begin
 */
function beginXRSession() {
    // requestSession must be called within a user gesture event
    // like click or touch when requesting an immersive session.
    navigator.xr.requestSession('immersive-vr')
        .then(onSessionStarted)
        .catch(err => {
            // May fail for a variety of reasons. Probably just want to
            // render the scene normally without any tracking at this point.
            window.requestAnimationFrame(onDrawFrame);
        });
}

/**
 * 
 * @param {XRSession} session https://www.w3.org/TR/webxr/#xrsession-interface
 * this starts rendering the scene and sets the reference space https://www.w3.org/TR/webxr/#xrreferencespace-interface
 */
function onSessionStarted(session) {
    // Store the session for use later.
    xrSession = session;

    xrSession.requestReferenceSpace('local')
        .then((referenceSpace) => {
            xrReferenceSpace = referenceSpace;
        })
        .then(setupWebGLLayer) // Create a compatible XRWebGLLayer
        .then(() => {
            // Start the render loop
            xrSession.requestAnimationFrame(onDrawFrame);
        });
}




function setupWebGLLayer() {
    // Make sure the canvas context we want to use is compatible with the current xr device.
    return gl.makeXRCompatible().then(() => {
        // The content that will be shown on the device is defined by the session's
        // baseLayer.
        xrSession.updateRenderState({ baseLayer: new XRWebGLLayer(xrSession, gl) });
    });
}

function onDrawFrame(timestamp, xrFrame) {
    // Do we have an active session?
    if (xrSession) {
        let glLayer = xrSession.renderState.baseLayer;
        let pose = xrFrame.getViewerPose(xrReferenceSpace);
        if (pose) {
            scene.matrixAutoUpdate = false;

            if(leftHand) leftHand.matrixAutoUpdate = false;
            if(rightHand) rightHand.matrixAutoUpdate = false;

            renderer.autoClear = false;
            renderer.clear();
            renderer.setSize(glLayer.framebufferWidth, glLayer.framebufferHeight, false);

            gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);

            for (let view of pose.views) {
                let viewport = glLayer.getViewport(view);
                /**
                 * Changed this line from:
                 * renderEye(pose.transform.matrix, view.projectionMatrix, viewport);
                 * 
                 * the matrix, a 4X4 array of the position and rotation of the camera position
                 * was exactly inverted, the call view.transform.inverse.matrix not on the "pose" but
                 * on the "view" is oriented correctly for the vive
                 */
                renderEye(view.transform.inverse.matrix, view.projectionMatrix, viewport);
            }

            let inputSources = xrSession.inputSources;

            //will do nothing if there are no input sources connected
            for (let inputSource of inputSources) {
                //https://www.w3.org/TR/webxr/#xrframe-interface
                let inputPose = xrFrame.getPose(inputSource.gripSpace, xrReferenceSpace);

                if(!inputPose) continue;

                //if the inputsource reports that it is the left hand
                if(inputSource.handedness === "left") {
                    renderLeftHand(inputPose.transform);
                }

                //if the input source reports that it is the right hand
                if(inputSource.handedness === "right") {
                    renderRightHand(inputPose.transform);
                }
            
                //checks if there is a gamepad attached to the input source and that there are buttons
                //follows spec for web gamepad interface: https://w3c.github.io/gamepad/#dom-gamepad
                if(inputSource.gamepad && inputSource.gamepad.buttons.length > 0) {

                    //get number of buttons on game pad
                    let len = inputSource.gamepad.buttons.length;

                    //loop through all connected buttons to check if they are pressed
                    if(inputSource.handedness === 'left') {
                        checkButtonsDownLeft(inputSource.gamepad.buttons);
                    }

                    if(inputSource.handedness === 'right'){
                        checkButtonsDownRight(inputSource.gamepad.buttons);
                    }
                }
            }
        }

        //call user's set update function
        update();

        // Request the next animation callback
        xrSession.requestAnimationFrame(onDrawFrame);
    } else {
        // No session available, so render a default mono view.
        //   gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        //   drawScene();

        // Request the next window callback
        window.requestAnimationFrame(onDrawFrame);
    }
}

/**
 * this checks to see if a button is being held on the left controller and puts the number of the button into an array
 * it calls any event handlers if the state of the buttons has changed from one frame to the other
 * if the button is held down the continue portion holds the function until the release occurs
 */
function checkButtonsDownLeft(buttons) {
    let len = buttons.length;
    let buttonsDown = [];
    let buttonsUp = [];

    for(let i = 0; i < len; ++i) {
        if(buttons[i].pressed) {
            buttonsDown.push(i);
        } else {
            buttonsUp.push(i);
        }
    }

    for(let i = 0; i < buttonsDown.length; ++i){
        //button is already down, so handler has already been called
        if(leftButtonsDown[buttonsDown[i]]) {
            continue;
        } else {
            handleButtonPress('left', buttonsDown[i]);
            leftButtonsDown[buttonsDown[i]] = true;
        }
    }

    for(let i = 0; i < buttonsUp.length; ++i) {
        if(leftButtonsDown[buttonsUp[i]]) {
            handleButtonRelease('left', buttonsUp[i]);
            leftButtonsDown[buttonsUp[i]] = false;
        } else {
            continue;
        }
    }
}

/**
 * this checks to see if a button is being held on the righ controller and puts the number of the button into an array
 * it calls any event handlers if the state of the buttons has changed from one frame to the other
 * if the button is held down the continue portion holds the function until the release occurs
 */
function checkButtonsDownRight(buttons) {
    let len = buttons.length;
    let buttonsDown = [];
    let buttonsUp = [];

    for(let i = 0; i < len; ++i) {
        if(buttons[i].pressed) {
            buttonsDown.push(i);
        } else {
            buttonsUp.push(i);
        }
    }

    for(let i = 0; i < buttonsDown.length; ++i){
        //button is already down, so handler has already been called
        if(rightButtonsDown[buttonsDown[i]]) {
            continue;
        } else {
            handleButtonPress('right', buttonsDown[i]);
            rightButtonsDown[buttonsDown[i]] = true;
        }
    }

    for(let i = 0; i < buttonsUp.length; ++i) {
        if(rightButtonsDown[buttonsUp[i]]) {
            handleButtonRelease('right', buttonsUp[i]);
            rightButtonsDown[buttonsUp[i]] = false;
        } else {
            continue;
        }
    }
}

/**
 * 
 * @param {XRTransform} transform https://www.w3.org/TR/webxr/#xrrigidtransform-interface
 * sets the position of the left hand object for example a 3d representation of a VR controller etc
 */
function renderLeftHand(transform) {
    if(!leftHand) return;

    //creates matrix which contains position and rotation of object
    let posMatrix = new THREE.Matrix4();

    //sets threejs matrix from what is received from webxr api
    posMatrix.fromArray(transform.matrix);

    leftPosition = transform.position;

    //updates position of object
    leftHand.matrix.copy(posMatrix);
}

/**
 * 
 * @param {XRTransform} transform https://www.w3.org/TR/webxr/#xrrigidtransform-interface
 * sets the position of the right hand object for example a 3d representation of a VR controller etc
 */
function renderRightHand(transform) {
    if(!rightHand) return;

    let posMatrix = new THREE.Matrix4();
    posMatrix.fromArray(transform.matrix);
    rightPosition = transform.position;
    rightHand.matrix.copy(posMatrix);
    // console.log(rightHand);
}


/**
 * 
 * @param {Float32Array} viewMatrixArray https://www.w3.org/TR/webxr/#xrrigidtransform-interface
 * @param {Float32Array} projectionMatrix https://www.w3.org/TR/webxr/#xrview-interface
 * @param {XRViewport} viewport https://www.w3.org/TR/webxr/#xrviewport-interface
 */
function renderEye(viewMatrixArray, projectionMatrix, viewport) {
    // Set the left or right eye half.
    renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

    let viewMatrix = new THREE.Matrix4();

    viewMatrix.fromArray(viewMatrixArray, 0);

    // Update the scene and camera matrices.
    camera.projectionMatrix.fromArray(projectionMatrix);
    camera.matrixWorldInverse.copy(viewMatrix);
    scene.matrix.copy(viewMatrix);

    // Tell the scene to update (otherwise it will ignore the change of matrix).
    scene.updateMatrixWorld(true);
    renderer.render(scene, camera);
    // Ensure that left eye calcs aren't going to interfere.
    renderer.clearDepth();
}

/**
 * 
 * @param {THREE.Object3D} object add the 3D object you wish to use as the left hand
 */
export function setLeftHand(object) {
    leftHand = object;
}

/**
 * 
 * @param {THREE.Object3D} object add the 3D object you wish to use as the right hand
 */
export function setRightHand(object) {
    rightHand = object;
}

export function getRightHandPostion() {
    return rightPosition;
}

export function getLeftHandPostion() {
    return leftPosition;
}
/**
 * 
 * @param {DOMCanvas} _glCanvas 
 * @param {THREE.Scene} _scene 
 * @param {THREE.Camera} _camera 
 * @param {THREE.WebGLRenderer} _renderer 
 * This initiallizes the render variables and starts rendering the XR scene
 */
export function start(_glCanvas, _scene, _camera, _renderer) {
    if(!_glCanvas || !_scene || !_camera || !_renderer) {
        console.error('Missing required parameter');
        return;
    }

    glCanvas = _glCanvas;
    scene = _scene;
    camera = _camera;
    renderer = _renderer;
    
    gl = glCanvas.getContext("webgl", { xrCompatible: true });
    beginXRSession();

}

/**
 * 
 * @param {String} hand "left" or "right"
 * @param {Number} num index of button pressed
 * @param {Function} func function to be called on button press
 */
export function addButtonPressListener(hand, num, func) {
    buttonListeners.push({hand: hand, num: num, func: func});
}

/**
 * 
 * @param {String} hand "left" or "right"
 * @param {Number} num index of button released
 * @param {Function} func function to be called when button is released
 */
export function addButtonReleaseListener(hand, num, func) {
    buttonReleaseListeners.push({hand: hand, num: num, func: func});
}

/**
 * 
 * @param {Function} func optional function to be called every frame for animation etc
 */
export function setUpdate(func) {
    update = func;
}

function handleButtonPress(hand, num) {
    for(let button of buttonListeners) {
        if(button.hand === hand && button.num === num) {
            button.func();
        }
    }
}

function handleButtonRelease(hand, num) {
    for(let button of buttonReleaseListeners) {
        if(button.hand === hand && button.num === num) {
            button.func();
        }
    }
}
