import '../styles/index.scss';
import * as THREE from 'three';

// var scene = new THREE.Scene();
// var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000);
// var renderer = new THREE.WebGLRenderer({canvas: glCanvas });
// renderer.setSize( window.innerWidth, window.innerHeight );
// document.body.appendChild( renderer.domElement );

// var update = function ()
//     {

//     };
// var render = function ()
// {
//     renderer.render( scene, camera);
// };

// var GameLoop = function ()
// {
//     requestAnimationFrame( GameLoop);

//     update();
//     render();
// };

// GameLoop();

function checkForXRSupport() {
    // Check to see if there is an XR device available that supports immersive VR
    // presentation (for example: displaying in a headset). If the device has that
    // capability the page will want to add an "Enter VR" button to the page (similar to
    // a "Fullscreen" button) that starts the display of immersive VR content.
    navigator.xr.supportsSession('immersive-vr').then(() => {
        var enterXrBtn = document.createElement("button");
        enterXrBtn.innerHTML = "Enter VR";
        enterXrBtn.addEventListener("click", beginXRSession);
        document.body.appendChild(enterXrBtn);
    }).catch((reason) => {
        console.log("Session not supported: " + reason);
    });
}
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
let xrSession = null;
let xrReferenceSpace = null;

function onSessionStarted(session) {
    // Store the session for use later.
    xrSession = session;

    console.log(xrSession);

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
let glCanvas = document.createElement("canvas");
let gl = glCanvas.getContext("webgl", { xrCompatible: true });
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ canvas: glCanvas });
var cube = new THREE.Mesh(new THREE.CubeGeometry(20, 20, 20), new THREE.MeshNormalMaterial());
cube.position.y = 0;
cube.position.z = -40;
// add the object to the scene
scene.add(cube);

let leftHand = new THREE.Mesh(new THREE.SphereBufferGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({color: new THREE.Color(0x0000ff)}));
leftHand.position.z = -10;
leftHand.position.x = 0.5;
scene.add(leftHand);

let rightHand = new THREE.Mesh(new THREE.SphereBufferGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)}));
rightHand.position.z = -10;
rightHand.position.x = -1;
scene.add(rightHand);

let buttonListeners = [];
let leftButtonsDown = [];
let rightButtonsDown = [];


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
            // Run imaginary 3D engine's simulation to step forward physics, animations, etc.
            // scene.updateScene(timestamp, xrFrame);
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

            //will do nothing if inputsource not connected
            for(let inputSource of inputSources) {
                //https://www.w3.org/TR/webxr/#xrframe-interface
                let inputPose = xrFrame.getPose(inputSource.gripSpace, xrReferenceSpace);
            

                if(inputSource.handedness === "left") {
                    renderLeftHand(inputPose.transform);
                }

                if(inputSource.handedness === "right") {
                    renderRightHand(inputPose.transform);
                }

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

function renderLeftHand(transform) {
    let posMatrix = new THREE.Matrix4();
    posMatrix.fromArray(transform.matrix);
    leftHand.matrix.copy(posMatrix);
}

function renderRightHand(transform) {
    let posMatrix = new THREE.Matrix4();
    posMatrix.fromArray(transform.matrix);
    rightHand.matrix.copy(posMatrix);
}


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

let buttonReleaseListeners = [];

function addButtonPressListener(hand, num, func) {
    buttonListeners.push({hand: hand, num: num, func: func});
}

function addButtonReleaseListener(hand, num, func) {
    buttonReleaseListeners.push({hand: hand, num: num, func: func});
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

addButtonPressListener('left', 0, () => {
    console.log('click 0');
});

addButtonReleaseListener('left', 0, () => {
    console.log('unclick 0');
});


checkForXRSupport();
