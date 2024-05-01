import * as THREE from 'three';
import {
    FontLoader
} from 'three/addons/loaders/FontLoader.js';
import {
    TextGeometry
} from 'three/addons/geometries/TextGeometry.js';
import {
    TrackballControls
} from 'three/addons/controls/TrackballControls.js';

const gui = new dat.GUI({
    hideable: false
});
let armControllers = [];
let tickerOffsetController, animateRotationZCheckbox;

const params = {
    wordInput: "DIA STUDIO",
    fontSize: 0.1,
    wordRepeats: 14,
    isFixed: true,
    playTicker: true,
    tickerOffset: 0,
    tickerSpeed: 3,
    scaleTarget: 33,
    scaleDelayFactor: 0.5,
    positionAmplitude: 0,
    positionDelayFactor: 0.5,
    showGeometry: true,
    arms: [{
            length: 1,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            frequency: 1
        },
        {
            length: 1,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            frequency: 1
        },
        {
            length: 1,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            frequency: 1
        },
    ],
    cameraPositionX: 0,
    cameraPositionY: 0,
    cameraPositionZ: 2,
    cameraRotationX: 0,
    cameraRotationY: 0,
    cameraRotationZ: 0,

    animateRotationZ: true,
    rotationZSpeed: 1,
};


let camera, scene, renderer, controls;
let textMesh, font;
let curve;

let accumulationFinal = [];


// remove redundant variables
//----------------------------------------------
var wordInput = params.wordInput;
var fontSize = params.fontSize;
var wordRepeats = params.wordRepeats;
var isFixed = params.isFixed;
let scaleTarget = params.scaleTarget;
let scaleDelayFactor = params.scaleDelayFactor;
let positionAmplitude = params.positionAmplitude;
let positionDelayFactor = params.positionDelayFactor;



let currentCurveMesh = null;
let cachedSpacedPoints = [];
let arms = [{
        length: 0.36,
        rotation: new THREE.Vector3(0, 0, 0),
        frequency: 1
    },
    {
        length: 0.43,
        rotation: new THREE.Vector3(1.66, 0, 0),
        frequency: 4
    },
    {
        length: 0.19,
        rotation: new THREE.Vector3(3.68, 1.54, 1.71),
        frequency: 5
    },
];





initGUI();
setArmsSliders();

init();
animate();




function initGUI() {
    // Type Setting Controls
    const typeSettingFolder = gui.addFolder('Type Setting');
    typeSettingFolder.add(params, 'wordInput').onChange(updateWord);
    typeSettingFolder.add(params, 'fontSize', 0.05, 0.25).onChange(updateFontSize);
    typeSettingFolder.add(params, 'wordRepeats', 1, 20, 1).onChange(updateRepeats);
    typeSettingFolder.add(params, 'isFixed').onChange(updateFix);
    typeSettingFolder.add(params, 'playTicker'); // Checkbox for playTicker
    tickerOffsetController = typeSettingFolder.add(params, 'tickerOffset', 0, 50, 0.01).onChange(updateTickerOffset);

    // Type Manipulation Controls
    const typeManFolder = gui.addFolder('Type Manipulation');
    typeManFolder.add(params, 'scaleTarget', 1, 150).onChange(updateScaleTarget);
    typeManFolder.add(params, 'scaleDelayFactor', 0, 5).onChange(updateScaleDelayFactor);
    typeManFolder.add(params, 'positionAmplitude', 0, 0.3).onChange(updatePositionAmplitude);
    typeManFolder.add(params, 'positionDelayFactor', 0, 5).onChange(updatePositionDelayFactor);

    // Geometry Controls
    const geometryFolder = gui.addFolder('Geometry');
    geometryFolder.add(params, 'showGeometry').onChange(toggleGeometryVisibility);
    geometryFolder.add({
        resetArms
    }, 'resetArms');
    geometryFolder.add({
        randomizeArms
    }, 'randomizeArms');
    geometryFolder.add({
        zeroArms
    }, 'zeroArms');

    params.arms.forEach((arm, index) => {
        let armFolder = geometryFolder.addFolder('Arm ' + (index + 1));

        if (index == 2) {
            // Animate Rotation Z Checkbox
            animateRotationZCheckbox = armFolder.add(params, 'animateRotationZ').onChange(value => {
                // Toggle the animation on or off
                animateRotationZ = value;
                if (value) {
                    requestAnimationFrame(animateArm3RotationZ);
                }
            });
        }

        armControllers[index] = {
            length: armFolder.add(params.arms[index], 'length', 0, 0.5).onChange(updateArmParameters),
            rotationX: armFolder.add(params.arms[index], 'rotationX', 0, 360).onChange(updateArmParameters),
            rotationY: armFolder.add(params.arms[index], 'rotationY', 0, 360).onChange(updateArmParameters),
            rotationZ: armFolder.add(params.arms[index], 'rotationZ', 0, 360).onChange(updateArmParameters),
            frequency: armFolder.add(params.arms[index], 'frequency', 0, 10).onChange(updateArmParameters)
        };
    });

    // Export Controls
    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(params, 'cameraPositionX', -10, 10).onChange(updateCameraPosition);
    cameraFolder.add(params, 'cameraPositionY', -10, 10).onChange(updateCameraPosition);
    cameraFolder.add(params, 'cameraPositionZ', 0, 20).onChange(updateCameraPosition);
    cameraFolder.add(params, 'cameraRotationX', -Math.PI, Math.PI).onChange(updateCameraRotation);
    cameraFolder.add(params, 'cameraRotationY', -Math.PI, Math.PI).onChange(updateCameraRotation);
    cameraFolder.add(params, 'cameraRotationZ', -Math.PI, Math.PI).onChange(updateCameraRotation);

    // Export Controls
    // const exportFolder = gui.addFolder('Export');
    const animationControlsFolder = gui.addFolder('Animation Controls');
    animationControlsFolder.add(params, 'tickerSpeed', 0, 30);
    animationControlsFolder.add(params, 'rotationZSpeed', 0, 10);
}



function init() {
    // Camera
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 2;

    // Scene
    scene = new THREE.Scene();

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Trackball Controls
    controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 5.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    // Resize Listener
    window.addEventListener('resize', onWindowResize);

    // Load Font
    const loader = new FontLoader();
    loader.load('assets/fonts/Rand_Medium.json', function(loadedFont) {
        font = loadedFont;
        createGeometry();
        distributeText();
    });

    // Start the animateArm3RotationZ if animateRotationZ is true
    if (params.animateRotationZ) {
        requestAnimationFrame(animateArm3RotationZ);
    }
}




function createGeometry() {
    // Remove existing geometry from the scene
    if (currentCurveMesh) {
        scene.remove(currentCurveMesh);
        currentCurveMesh.geometry.dispose(); // Optional: Dispose of the geometry for memory management
        currentCurveMesh.material.dispose(); // Optional: Dispose of the material for memory management
        currentCurveMesh = null;
    }

    // Calculate the spline points
    let points = calculateSplinePoints(arms);

    // Create the curve
    curve = new THREE.CatmullRomCurve3(points);

    // Visualize the curve
    const curveGeometry = new THREE.TubeGeometry(curve, 1000, 0.002, 8, false);
    const curveMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000
    });
    currentCurveMesh = new THREE.Mesh(curveGeometry, curveMaterial); // Update the reference to the new mesh
    scene.add(currentCurveMesh);

    // Set visibility based on the checkbox state
    currentCurveMesh.visible = params.showGeometry;

    // Cache the spaced points
    cachedSpacedPoints = curve.getSpacedPoints(5000);
}


function calculateSplinePoints(arms) {
    let points = [];
    let numPoints = 1000; // Number of points to calculate for the spline

    for (let step = 0; step <= numPoints; step++) {
        // Start with the initial origin for the first arm
        let initialOrigin = new THREE.Vector3(0, 0, 0);
        let endPointFirstArm = drawCircleAroundPoint(initialOrigin, arms[0].rotation, arms[0].length, step, numPoints, arms[0].frequency);

        // Use the end point of the first arm as the origin for the second arm
        let endPointSecondArm = arms.length > 1 ?
            drawCircleAroundPoint(endPointFirstArm, arms[1].rotation, arms[1].length, step, numPoints, arms[1].frequency) :
            endPointFirstArm;

        // Use the end point of the second arm as the origin for the third arm
        let endPointThirdArm = arms.length > 2 ?
            drawCircleAroundPoint(endPointSecondArm, arms[2].rotation, arms[2].length, step, numPoints, arms[2].frequency) :
            endPointSecondArm;

        // The final point for this step is the end point of the last arm
        points.push(endPointThirdArm);
    }

    return points;
}

function drawCircleAroundPoint(origin, rotation, armLength, step, numPoints, frequency) {
    let angleStep = (Math.PI * 2) / numPoints; // Full circle divided by number of points
    let angle = step * angleStep * frequency; // Adjust angle for frequency

    // Calculate the point on the circle before applying rotation
    let localPoint = new THREE.Vector3(armLength * Math.cos(angle), armLength * Math.sin(angle), 0);

    // Create a rotation matrix from the rotation settings
    let rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeRotationFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z, 'XYZ'));

    // Apply the rotation to the point
    let rotatedPoint = localPoint.clone().applyMatrix4(rotationMatrix);

    // Translate the point to the origin
    let finalPoint = rotatedPoint.clone().add(origin);

    return finalPoint;
}
















function distributeText() {

    const message = wordInput;
    const size = fontSize;
    const totalCurveLength = curve.getLength();

    if (textMesh) {
        scene.remove(textMesh);
        textMesh.traverse(function(node) {
            if (node.isMesh) {
                node.geometry.dispose();
                node.material.dispose();
            }
        });
    }
    textMesh = new THREE.Group();

    if (!curve || !(curve instanceof THREE.Curve)) {
        console.error('The curve is not defined or not an instance of THREE.Curve');
        return;
    }

    const accumulation = calculateAccumulation(message);

    const messageRepeat = Array(wordRepeats).fill(message).join(" ");
    const wordWidth = accumulation[accumulation.length - 1];
    const spaceWidth = fontSize;
    let accumulationRepeat = [];
    for (let repeat = 0; repeat < wordRepeats; repeat++) {
        accumulationRepeat = accumulationRepeat.concat(
            accumulation.map(accum => accum + repeat * (wordWidth + spaceWidth))
        );
        if (repeat < wordRepeats - 1) {
            accumulationRepeat.push(accumulationRepeat[accumulationRepeat.length - 1] + spaceWidth);
        }
    }

    accumulationFinal = [];

    if (isFixed) {
        let totalWidthUsed = accumulationRepeat[accumulationRepeat.length - 1] + spaceWidth;
        let remainingWidth = totalCurveLength - totalWidthUsed;
        let offsetPerLetter = remainingWidth / accumulationRepeat.length;

        // Adjust each accumulated position by the additional offset
        accumulationFinal = accumulationRepeat.map((accum, i) => {
            return accum + offsetPerLetter * i;
        });
    } else {
        accumulationFinal = accumulationRepeat;
    }

    messageRepeat.split('').forEach((char, i) => {
        if (accumulationFinal[i] <= totalCurveLength) {
            placeLetterOnCurve(char, accumulationFinal[i]);
        } else {
            return;
        }
    });

    // Add the textMesh group to the scene
    scene.add(textMesh);
}


function calculateAccumulation(message) {
    let accumulatedWidth = 0;
    const accumulation = [];

    for (let i = 0; i < message.length; i++) {
        const partialMessage = message.substring(0, i) + "I";
        const geometry = new TextGeometry(partialMessage, {
            font: font,
            size: fontSize,
            height: 0.001,
            curveSegments: 12,
        });
        geometry.computeBoundingBox();
        accumulatedWidth = geometry.boundingBox.max.x;
        // console.log(partialMessage + ": " + accumulatedWidth);
        geometry.dispose();
        accumulation.push(accumulatedWidth);
    }
    return accumulation;
}






function placeLetterOnCurve(char, distance) {
    const geometry = new TextGeometry(char, {
        font: font,
        size: fontSize,
        height: 0.001,
        curveSegments: 12,
    });
    // geometry.computeBoundingBox();

    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Use the new setPositionOnCurve function
    setPositionOnCurve(mesh, distance);

    // Add the mesh to the textMesh group
    textMesh.add(mesh);
}

function setPositionOnCurve(mesh, distance, offset = 0) {
    // mesh.geometry.computeBoundingBox(); // Compute the bounding box to get width
    // const charWidth = mesh.geometry.boundingBox.max.x - mesh.geometry.boundingBox.min.x;

    const totalCurveLength = curve.getLength();
    // Adjust distance by offset and wrap around the curve if necessary
    distance = (distance + offset) % totalCurveLength;

    // Calculate the position on the curve at the current distance
    const t = findTForDistance(distance, curve);
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    mesh.position.copy(position);
    mesh.lookAt(position.clone().add(tangent));
    mesh.rotateOnAxis(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    // mesh.translateX(-charWidth / 2); // Use the computed charWidth here
    mesh.translateX(-fontSize / 2); // Center the mesh
}







function findTForDistance(distance, curve) {
    let accumulatedDistance = 0;
    for (let i = 1; i < cachedSpacedPoints.length; i++) {
        accumulatedDistance += cachedSpacedPoints[i].distanceTo(cachedSpacedPoints[i - 1]);
        if (accumulatedDistance >= distance) {
            return (i - 1) / (cachedSpacedPoints.length - 1);
        }
    }
    return 1; // If the distance exceeds the curve length, return the end of the curve
}









function updateWord() {
    wordInput = params.wordInput;
    distributeText();
}

function updateFontSize() {
    fontSize = params.fontSize;
    distributeText();
}

function updateRepeats() {
    wordRepeats = params.wordRepeats;
    distributeText();
}

function updateFix() {
    isFixed = params.isFixed;
    distributeText();
}

window.updateWord = updateWord;
window.updateFontSize = updateFontSize;
window.updateRepeats = updateRepeats;
window.updateFix = updateFix;


function updateTickerOffset() {
    tickerOffset = params.tickerOffset;
}

function updateScaleTarget() {
    scaleTarget = params.scaleTarget;
}

function updateScaleDelayFactor() {
    scaleDelayFactor = params.scaleDelayFactor;
}

function updatePositionAmplitude() {
    positionAmplitude = params.positionAmplitude;
}

function updatePositionDelayFactor() {
    positionDelayFactor = params.positionDelayFactor;
}

window.updateTickerOffset = updateTickerOffset;
window.updateScaleTarget = updateScaleTarget;
window.updateScaleDelayFactor = updateScaleDelayFactor;
window.updatePositionAmplitude = updatePositionAmplitude;
window.updatePositionDelayFactor = updatePositionDelayFactor;




function updateArmParameters() {
    let redistributeTextNeeded = false;

    params.arms.forEach((control, index) => {
        const newLength = control.length;
        const newFrequency = control.frequency;

        // Check if length or frequency has changed
        if (arms[index].length !== newLength || arms[index].frequency !== newFrequency) {
            redistributeTextNeeded = true;
        }

        const rotationX = control.rotationX * Math.PI / 180;
        const rotationY = control.rotationY * Math.PI / 180;
        const rotationZ = control.rotationZ * Math.PI / 180;

        arms[index].length = newLength;
        arms[index].rotation = new THREE.Vector3(rotationX, rotationY, rotationZ);
        arms[index].frequency = newFrequency;
    });

    createGeometry(); // Always recreate geometry

    if (redistributeTextNeeded) {
        distributeText(); // Redistribute text only if needed
    }
}









function setArmsSliders() {
    arms.forEach((arm, index) => {
        params.arms[index].length = arm.length;
        params.arms[index].rotationX = arm.rotation.x * (180 / Math.PI); // Convert to degrees
        params.arms[index].rotationY = arm.rotation.y * (180 / Math.PI); // Convert to degrees
        params.arms[index].rotationZ = arm.rotation.z * (180 / Math.PI); // Convert to degrees
        params.arms[index].frequency = arm.frequency;

        // Update the GUI display
        armControllers[index].length.updateDisplay();
        armControllers[index].rotationX.updateDisplay();
        armControllers[index].rotationY.updateDisplay();
        armControllers[index].rotationZ.updateDisplay();
        armControllers[index].frequency.updateDisplay();
    });
}

function resetArms() {
    arms = [{
            length: 0.36,
            rotation: new THREE.Vector3(0, 0, 0),
            frequency: 1
        },
        {
            length: 0.43,
            rotation: new THREE.Vector3(1.66, 0, 0),
            frequency: 4
        },
        {
            length: 0.19,
            rotation: new THREE.Vector3(3.68, 1.54, 1.71),
            frequency: 5
        },
    ];
    setArmsSliders();
    createGeometry();
    distributeText();
}

function randomizeArms() {
    arms.forEach(arm => {
        arm.length = Math.random() * 0.5;
        arm.rotation.x = Math.random() * Math.PI;
        arm.rotation.y = Math.random() * Math.PI;
        arm.rotation.z = Math.random() * Math.PI;
        arm.frequency = Math.floor(Math.random() * 11);
    });

    setArmsSliders();
    createGeometry();
    distributeText();
}

function zeroArms() {
    arms = [{
            length: 0.5,
            rotation: new THREE.Vector3(0, 0, 0),
            frequency: 1
        },
        {
            length: 0,
            rotation: new THREE.Vector3(0, 0, 0),
            frequency: 0
        },
        {
            length: 0,
            rotation: new THREE.Vector3(0, 0, 0),
            frequency: 0
        },
    ];
    setArmsSliders();
    createGeometry();
    distributeText();
}






function animateArm3RotationZ() {
    if (params.animateRotationZ) {
        let rotationZValue = params.arms[2].rotationZ;
        params.arms[2].rotationZ += params.rotationZSpeed; // Use rotationZSpeed for increment
        if (params.arms[2].rotationZ >= 360) {
            params.arms[2].rotationZ -= 360; // Wrap around after a full rotation
        }

        armControllers[2].rotationZ.updateDisplay(); // Refresh GUI
        updateArmParameters();
        requestAnimationFrame(animateArm3RotationZ);
    }
}








function toggleGeometryVisibility() {
    if (currentCurveMesh) {
        currentCurveMesh.visible = params.showGeometry; // Toggle visibility
    }
}

function updateCameraPosition() {
    camera.position.set(params.cameraPositionX, params.cameraPositionY, params.cameraPositionZ);
}

function updateCameraRotation() {
    camera.rotation.set(params.cameraRotationX, params.cameraRotationY, params.cameraRotationZ);
}

// Event listener for the checkbox
// document.getElementById('toggleGeometry').addEventListener('change', toggleGeometryVisibility);











function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    controls.handleResize(); // for TrackballControls
}


function animate() {
    requestAnimationFrame(animate);

    // Update camera parameters based on current camera state
    params.cameraPositionX = camera.position.x;
    params.cameraPositionY = camera.position.y;
    params.cameraPositionZ = camera.position.z;
    params.cameraRotationX = camera.rotation.x;
    params.cameraRotationY = camera.rotation.y;
    params.cameraRotationZ = camera.rotation.z;

    // Update the GUI display
    gui.updateDisplay();

    // Ensure textMesh and curve are defined and have children
    if (textMesh && textMesh.children && textMesh.children.length > 0 && curve) {

        if (params.playTicker) {
            params.tickerOffset -= params.tickerSpeed * 0.001;
            const totalCurveLength = curve.getLength();
            if (params.tickerOffset < 0) {
                params.tickerOffset += totalCurveLength; // Wrap around the curve
            }
            tickerOffsetController.updateDisplay();
        }

        textMesh.children.forEach((mesh, i) => {
            // Ensure there is a corresponding distance value for this mesh
            if (typeof accumulationFinal[i] !== 'undefined') {
                // Update the position of each mesh along the curve
                setPositionOnCurve(mesh, accumulationFinal[i], params.tickerOffset);
            }

            // Scaling animation
            const scaleEffect = (Math.sin(Date.now() * 0.001 + i * scaleDelayFactor) + 1) * 0.5;
            const scale = (scaleTarget / 100) * (1 - scaleEffect) + scaleEffect;
            mesh.scale.set(scale, scale, scale);

            // Positional shift animation
            const positionEffect = Math.sin(Date.now() * 0.001 + i * positionDelayFactor);
            mesh.position.y += positionEffect * positionAmplitude;
        });
    }

    controls.update();
    renderer.render(scene, camera);
}