import '../styles/index.scss';
import * as THREE from 'three';
import ThreeXr from './three-xr-main';
import bow from '../objects/bow9.gltf';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import targetImg from '../image/target2.png';
import background from '../image/whiteBG.jpeg';

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

var scene = null;
var camera = null;
var renderer = null;
var light = null;
var ambLight = null;
var backgroundTexture= null;
var skyCube = null;
let glCanvas = null;
var plane = null;
var targets = [];
var distance = 0;
var leftHand = null;
var rightHand = null;
var triggerDownRight = false;
var arrowClone = null;
var bowMesh;
var stringBone = null;


function init() {
    glCanvas = document.createElement("canvas");
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: glCanvas });
    light = new THREE.DirectionalLight(0xffffff, 1);
    ambLight = new THREE.AmbientLight(0xaaaaaa);
    backgroundTexture = new THREE.TextureLoader().load(background);
    skyCube = new THREE.Mesh(new THREE.SphereBufferGeometry(50, 50, 50), new THREE.MeshBasicMaterial({map:backgroundTexture, side:THREE.DoubleSide} ) );
    plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(10,10,10,10), new THREE.MeshLambertMaterial({color: new THREE.Color(0xffffff)}));
    plane.position.y = -1.5;
    plane.position.z = 0;
    plane.rotateX(degrees_to_radians(-90));

    scene.add(light);
    scene.add(ambLight);
    scene.add(skyCube);

    scene.add(plane);
}

function addCube (x, y, z) {
    var cube = new THREE.Mesh(new THREE.CubeGeometry(0.35, 0.35, 0.35), new THREE.MeshLambertMaterial({color: new THREE.Color(0xffffff)}));
    var texture = new THREE.TextureLoader().load( targetImg );
    var cubeBig = new THREE.Mesh(new THREE.CubeGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({color: new THREE.Color(0xffffff), map: texture}));
    cube.position.x = x;
    cube.position.y = y;
    cube.position.z = z;
    cubeBig.position.x = x;
    cubeBig.position.y = y;
    cubeBig.position.z = z;

    scene.add(cube);
    scene.add(cubeBig);

    return cube;
}

function addBow() {
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

    function handle_load(gltf) {
        console.log(gltf);
        bowMesh = gltf.scene.children[1];
        bowMesh.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0xbbbbbb)});
        bowMesh.material.side = THREE.DoubleSide;
        bowMesh.traverse(child => {        
                child.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0x5e3c1e), skinning: true});
        });
    
        bowMesh.rotateX(degrees_to_radians(90));
        bowMesh.scale.x = 0.5;
        bowMesh.scale.y = 0.5;
        bowMesh.scale.z = 0.5;
    
        stringBone = bowMesh.children[1].children[0].skeleton.bones[17];
        leftHand = new THREE.Group();
        leftHand.add(bowMesh);
    
        scene.add(leftHand);
        ThreeXr.setLeftHand(leftHand);
    
        var arrow = gltf.scene.children[1];
        arrow.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0x5e3c1e)});

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

        rightHand = new THREE.Group();

        rightHand.add(arrow);
        scene.add(rightHand);
        ThreeXr.setRightHand(rightHand);
    }
}

init();
// left group
targets.push(addCube(0, 0, -4));
targets.push(addCube(1.5, 0, -5));
targets.push(addCube(-1, 1.5, -6));
targets.push(addCube(1, 1.5, -6));
//back group
targets.push(addCube(-4, 0, 0));
targets.push(addCube(-5, 0, 1.5));
targets.push(addCube(-6, 1.5, -1));
targets.push(addCube(-6, 1.5, 1));
//right group
targets.push(addCube(0, 0, 4));
targets.push(addCube(1.5, 0, 5));
targets.push(addCube(-1, 1.5, 6));
targets.push(addCube(1, 1.5, 6));
//front group
targets.push(addCube(4, 0, 0));
targets.push(addCube(5, 0, 1.5));
targets.push(addCube(6, 1.5, -1));
targets.push(addCube(6, 1.5, 1));
addBow();

ThreeXr.addButtonPressListener("right", 0, function() {
    console.log("right handle buttons squeezed");
    triggerDownRight = true;
});

ThreeXr.addButtonReleaseListener("right", 0, function() {
    triggerDownRight = false;
    ThreeXr.setRightHand(null);
    rightHand.children[0].speed = distance/2;
   stringBone.position.y = -1.4162278175354004;
   var rightHandReload = rightHand.clone();
   scene.add(rightHandReload);
   rightHand = rightHandReload;
   ThreeXr.setRightHand(rightHand);
});

ThreeXr.setUpdate(() => {
    var leftPosition = ThreeXr.getLeftHandPostion();
    var rightPosition = ThreeXr.getRightHandPostion();
    
    if(leftPosition && rightPosition) {
        var leftVector = new THREE.Vector3(leftPosition.x, leftPosition.y, leftPosition.z);
        var rightVector = new THREE.Vector3(rightPosition.x, rightPosition.y, rightPosition.z);
        distance = leftVector.distanceTo(rightVector);

        if(stringBone && triggerDownRight) {
            stringBone.position.y = Math.min(distance * -12, -1.4162278175354004);
        }
    }

    let len = targets.length;

    for (let i = 0; i < len; ++i){
        let cube = targets[i];

        //This sets a boinding box for the cube so that the arrow has something to intersect
        cube.geometry.computeBoundingBox();
        var box = cube.geometry.boundingBox.clone();
        cube.updateMatrixWorld(true);
        box.copy(cube.geometry.boundingBox).applyMatrix4(cube.matrixWorld);
        //iterates over every object in the scene to check if the child has speed then moves it forward
        scene.traverse(child => {
            if (child.speed) {
                child.position.z -= child.speed;
                //creates a bounding box for the moving child
                child.geometry.computeBoundingBox();
                var arrowBox = child.geometry.boundingBox.clone();
                child.updateMatrixWorld( true );
                arrowBox.copy( child.geometry.boundingBox ).applyMatrix4( child.matrixWorld );

                //check to see if bounding boxes have intersected then change speed to 0 stops item
                if (arrowBox.intersectsBox(box)) {
                    console.log("intersection");
                    child.speed = 0;
                }
            }
        });
    }
});

ThreeXr.checkForXRSupport().then(supported => {
    var enterXrBtn = document.getElementById("button-start");
       enterXrBtn.addEventListener("click", () => {
        ThreeXr.start(glCanvas, scene, camera, renderer); 
    });
    
}).catch(e => {
    console.error(e);
});

