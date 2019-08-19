import '../styles/index.scss';
import * as THREE from 'three';
import ThreeXr from './three-xr-main';
import bow from '../objects/bow9.gltf';
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
var distance = 0;
var leftHand = null;
var rightHand = null;
var triggerDownRight = false;
var arrowClone = null;
var arrowCloneOrigin = 0;
var arrowClonePosition = null;
var shotArrow = null;
// add the object to the scene
// scene.add(cube);
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

function makeSlider(bone) {
    let sliderX = document.createElement('input');
    sliderX.type = "range";

    sliderX.onchange = function(e) {
        bone.position.x = Number(e.target.value);
        console.log(bone);
    };
    
    document.body.appendChild(sliderX);

    let sliderY = document.createElement('input');
    sliderY.type = "range";

    sliderY.onchange = function(e) {
        bone.position.y = Number(e.target.value);
        console.log(bone);
    };
    
    document.body.appendChild(sliderY);

    let sliderZ = document.createElement('input');
    sliderZ.type = "range";

    sliderZ.onchange = function(e) {
        bone.position.y = Number(e.target.value);
        console.log(bone);
    };
    
    document.body.appendChild(sliderZ);
}

var stringBone = null;

function handle_load(gltf) {
    console.log(gltf);
    mesh = gltf.scene.children[1];
    mesh.material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xbbbbbb)});
    mesh.material.side = THREE.DoubleSide;
    console.log(mesh);
    // scene.add(mesh);
    // mesh.position.z = -1;
    mesh.traverse(child => {        
        console.log('child', child.type);
        child.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0xbbbbbb), skinning: true});
    });

    

    mesh.rotateX(degrees_to_radians(90));
    mesh.scale.x = 0.5;
    mesh.scale.y = 0.5;
    mesh.scale.z = 0.5;

    stringBone = mesh.children[1].children[0].skeleton.bones[17];
    console.log(stringBone.position.y);

    leftHand = new THREE.Group();
    leftHand.add(mesh);
    // leftHand.children[1].children[0].skeleton.bones.forEach(bone => {
    //     makeSlider(bone);
    // });

    window.leftHand = leftHand;

    console.log(leftHand);
    // leftHand.position.z = -10;
    // leftHand.position.x = 0.5;
    scene.add(leftHand);
    ThreeXr.setLeftHand(leftHand);

    var arrow = gltf.scene.children[1];
    arrow.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0xD2691E)});
    let scale = 0.1;
    arrow.scale.y = scale;
    arrow.scale.z = scale;
    arrow.scale.x = scale;
    arrow.rotateX(degrees_to_radians(180));
    arrow.position.z = -0.25;
   
    arrowClone = arrow.clone();
    arrowClone.rotateX(degrees_to_radians(-90));
    arrowClone.position.y -= 0.23;
    arrowClone.position.z += 0.25;
    arrowCloneOrigin = arrowClone.position.y;

    leftHand.add(arrowClone);
    
    rightHand = new THREE.Group();
    rightHand.add(arrow);

    scene.add(rightHand);
    console.log(rightHand);
    ThreeXr.setRightHand(rightHand);


}



rightHand = new THREE.Mesh(new THREE.SphereBufferGeometry(0.1, 10, 10), new THREE.MeshBasicMaterial({color: new THREE.Color(0xff0000)}));
rightHand.position.z = -10;
rightHand.position.x = -1;
scene.add(rightHand);

ThreeXr.setRightHand(rightHand);

ThreeXr.addButtonPressListener("right", 0, function() {
    console.log("right handle buttons squeezed");
    triggerDownRight = true;
    var rightPosition = ThreeXr.getRightHandPostion();
    arrowClonePosition = new THREE.Vector3(rightPosition.x, rightPosition.y, rightPosition.z);
});

ThreeXr.addButtonReleaseListener("right", 0, function() {
    console.log('right handle button squeeze released');
    triggerDownRight = false;
    stringBone.position.y = -1.4162278175354004;
    arrowClone.position.y = arrowCloneOrigin;
    shotArrow = arrowClone.clone();
    let position = new THREE.Vector3();
    arrowClone.getWorldPosition(position);
    let rotation = new THREE.Quaternion();
    arrowClone.getWorldQuaternion(rotation);

    //shotArrow.applyMatrix(arrowClone.matrixWorld);
    // shotArrow.position = arrowClone.position;
    // shotArrow.rotation = arrowClone.rotation;
    shotArrow.speed = distance/20;
    scene.add(shotArrow);

});

function checkCollision() {
    for (var vertexIndex = 0; vertexIndex < Player.geometry.vertices.length; vertexIndex++) {       
        var localVertex = Player.geometry.vertices[vertexIndex].clone();
        var globalVertex = Player.matrix.multiplyVector3(localVertex);
        var directionVector = globalVertex.subSelf( Player.position );

        var ray = new THREE.Ray( Player.position, directionVector.clone().normalize() );
        var collisionResults = ray.intersectObjects( collidableMeshList );
        if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) {
            // a collision occurred... do something...
        }
    }
}

ThreeXr.setUpdate(() => {
    

    var leftPosition = ThreeXr.getLeftHandPostion();
    var rightPosition = ThreeXr.getRightHandPostion();



    if(leftPosition && rightPosition) {
        var leftVector = new THREE.Vector3(leftPosition.x, leftPosition.y, leftPosition.z);
        var rightVector = new THREE.Vector3(rightPosition.x, rightPosition.y, rightPosition.z);
        distance = leftVector.distanceTo(rightVector);

        if(stringBone && triggerDownRight) {
            let arrowDistance = arrowClonePosition.distanceTo(rightVector);
            stringBone.position.y = Math.min(distance * -12, -1.4162278175354004);
            arrowClone.position.y = arrowCloneOrigin + arrowDistance;
            // console.log(stringBone);
        }
    }

    if(shotArrow) {
        //shotArrow.position.x+=shotArrow.speed;
    }
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

