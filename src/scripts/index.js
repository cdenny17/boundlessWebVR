import '../styles/index.scss';
import * as THREE from 'three';
import ThreeXr from './three-xr-main';
import bow from '../objects/bow9.gltf';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';


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
var cube = new THREE.Mesh(new THREE.CubeGeometry(0.3, 0.3, 0.3), new THREE.MeshLambertMaterial({color: new THREE.Color(0x555555)}));
var cubeBig = new THREE.Mesh(new THREE.CubeGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({color: new THREE.Color(0xbbbbbb), map: new THREE.VideoTexture(targ)}));
var targ = document.getElementById('targ');
var plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(100,100,10,10), new THREE.MeshBasicMaterial({color: new THREE.Color(0x555555)}));
plane.position.y = -2;
plane.position.z = 0;
plane.rotateX(degrees_to_radians(-90));
cube.position.y = 0;
cube.position.z = -3;
cubeBig.position.y = 0;
cubeBig.position.z = -3;
var distance = 0;
var leftHand = null;
var rightHand = null;
var triggerDownRight = false;
var arrowClone = null;
var arrowCloneOrigin = 0;




// add the object to the scene
scene.add(cube);
scene.add(cubeBig);
scene.add(plane);
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



var stringBone = null;

function handle_load(gltf) {
    console.log(gltf);
    mesh = gltf.scene.children[1];
    mesh.material = new THREE.MeshBasicMaterial({color: new THREE.Color(0xbbbbbb)});
    mesh.material.side = THREE.DoubleSide;
    mesh.traverse(child => {        
            child.material = new THREE.MeshLambertMaterial({color: new THREE.Color(0xb06331), skinning: true});
    });

    

    mesh.rotateX(degrees_to_radians(90));
    mesh.scale.x = 0.5;
    mesh.scale.y = 0.5;
    mesh.scale.z = 0.5;

    stringBone = mesh.children[1].children[0].skeleton.bones[17];
    

    leftHand = new THREE.Group();
    leftHand.add(mesh);

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

    
    rightHand = new THREE.Group();
    rightHand.add(arrow);

    scene.add(rightHand);
    ThreeXr.setRightHand(rightHand);


}

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

            
            // arrowClone.position.y = arrowCloneOrigin + arrowDistance;
            // console.log(stringBone);
        }
    }

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

});

ThreeXr.checkForXRSupport().then(supported => {
    var enterXrBtn = document.createElement("button");
    enterXrBtn.innerHTML = "Enter VR";
    enterXrBtn.addEventListener("click", () => {
        ThreeXr.start(glCanvas, scene, camera, renderer);
        
        
    });
    document.getElementById('header').appendChild(enterXrBtn);
}).catch(e => {
    console.error(e);
});

