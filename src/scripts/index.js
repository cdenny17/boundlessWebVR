import '../styles/index.scss';
import * as THREE from 'three';
import ThreeXr from './three-xr-main';
import bow from '../objects/bow1.gltf';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
var FBXLoader = require('three-fbx-loader');


function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

let glCanvas = document.createElement("canvas");
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ canvas: glCanvas });
var light = new THREE.DirectionalLight(0xffffff, 10);
var ambLight = new THREE.AmbientLight(0xffffff);
var cube = new THREE.Mesh(new THREE.CubeGeometry(20, 20, 20), new THREE.MeshLambertMaterial({color: new THREE.Color(0xbbbbbb)}));
var plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(100,100,10,10), new THREE.MeshBasicMaterial({color: new THREE.Color(0xbbbbbb)}));
plane.position.y = -2;
plane.position.z = 0;
plane.rotateX(degrees_to_radians(-90));
cube.position.y = 0;
cube.position.z = -40;

// add the object to the scene
scene.add(cube);
//scene.add(plane);
scene.add(light);
scene.add(ambLight);

var loader = new GLTFLoader();
loader.load(bow, handle_load,
( xhr ) => {
    // called while loading is progressing
    console.log( `${( xhr.loaded / xhr.total * 100 )}% loaded` );
},
( error ) => {
    // called when loading has errors
    console.error( 'An error happened', error );
});

var mesh;
// var mixer;

function handle_load(gltf) {
    console.log(gltf.scene);
    mesh = gltf.scene.children[1];
    mesh.material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xbbbbbb)});
    mesh.material.side = THREE.DoubleSide;
    console.log(mesh);
    // scene.add(mesh);
    // mesh.position.z = -1;
    mesh.traverse(child => {
        let scale = 0.3;
        child.scale.y =scale;
        child.scale.z =scale;
        child.scale.x =scale;
        child.rotateX(degrees_to_radians(-45));
        child.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0xbbbbbb)});
    });


    let leftHand = mesh;
    console.log(leftHand);
    // leftHand.position.z = -10;
    // leftHand.position.x = 0.5;
    scene.add(leftHand);
    ThreeXr.setLeftHand(leftHand);
}

// var loader = new FBXLoader();
// loader.load(bow, function(object) {
//     mixer = new THREE.AnimationMixer( object);
//     var action = mixer.clipAction( object.animations [0]);
//     action.play();
//     object.traverse( function(child) {
//         if ( child.isMesh) {
//             child.castShadow = true;
//             child.receiveShadow = true;
//         }
//     });

//     scene.add(object);
// });
// var bowModel;
// var objectLoader = new THREE.ObjectLoader();
// console.log(bow);
// objectLoader.load(bow, function ( obj ) {
//     bowModel = obj;
//     var mesh = obj.scene.children[0];
//     scene.add( obj );
// } );




let rightHand = new THREE.Mesh(new THREE.SphereBufferGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)}));
rightHand.position.z = -10;
rightHand.position.x = -1;
scene.add(rightHand);

ThreeXr.setRightHand(rightHand);

ThreeXr.addButtonPressListener("right", 1, function() {
    console.log("right handle buttons squeezed");
});

ThreeXr.addButtonReleaseListener("right", 1, function() {
    console.log('right handle button squeeze released');
});

ThreeXr.setUpdate(() => {
// if(bowModel) {
//     bowModel.position.z -= -0.1;
// }
});

ThreeXr.checkForXRSupport().then(supported => {
    var enterXrBtn = document.createElement("button");
    enterXrBtn.innerHTML = "Enter VR";
    enterXrBtn.addEventListener("click", () => {
        ThreeXr.start(glCanvas, scene, camera, renderer);
        
        
    });
    document.body.appendChild(enterXrBtn);
}).catch(e => {
    console.error(e);
});

