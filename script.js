import {Drone} from './drone.js'
import {GUI} from "./three.js-master/examples/jsm/libs/dat.gui.module.js"

let scene, controls, camera;
let renderer, labelRenderer, stats;
let drones = [];
let clock = new THREE.Clock();
let group_drones = new THREE.Group();
let trajectoires = new THREE.Group();
let labels = new THREE.Group();
let spheres = new THREE.Group();
let settings;
let gridHelper, axesHelper;

let frame = 0;

let lines_to_plan = new THREE.Group();
let timer = 0;
let running = true;
let speedmax = 10;
let radius = 2;
let duration = 0;

init();



function init() {

    // création de la scène
    scene = new THREE.Scene();

    // création de la skybox
    let textures_skybox = [
        "assets/skybox/corona_ft.png", "assets/skybox/corona_bk.png",
        "assets/skybox/corona_up.png", "assets/skybox/corona_dn.png",
        "assets/skybox/corona_rt.png", "assets/skybox/corona_lf.png",
    ];
    scene.background = new THREE.CubeTextureLoader().load( textures_skybox );

    //scene.fog = new THREE.Fog( 0xaaaaaa, 50, 100 );

    // sol
    let texture = new THREE.TextureLoader().load( 'assets/ground/black-grass.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 5, 5 );
    let geometry = new THREE.PlaneGeometry( 500, 500, 32 );
    let material = new THREE.MeshPhongMaterial( { color: 0x00ff00, map: texture } );
    let plane = new THREE.Mesh( geometry, material );
    scene.add( plane );
    plane.rotation.set(-Math.PI / 2, 0, 0);

    // création de la caméra
    camera = new THREE.PerspectiveCamera( 45,window.innerWidth/window.innerHeight, 0.1, 5000 );

    camera.position.set( 0, 50, 50 );
    renderer = new THREE.WebGLRenderer( {antialias: true} );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );


    labelRenderer = new THREE.CSS2DRenderer();
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.body.appendChild( labelRenderer.domElement );

    controls = new THREE.OrbitControls( camera, labelRenderer.domElement );

    // création des aides
    gridHelper = new THREE.GridHelper( 500, 50 );
    scene.add( gridHelper );

    axesHelper = new THREE.AxesHelper( 10 );
    scene.add( axesHelper );

    let lumiere = new THREE.HemisphereLight(
        0xddeeff, // couleur du ciel
        0x050505, // couleur du sol
        1 // intensité
    );
    scene.add( lumiere );

    stats = new Stats();
    document.body.appendChild( stats.dom );

    // Chargement des données et création des drones
    fetch("json/waypoints.json")
        .then( response => response.json())
        .then(json => {
            let mtlLoader = new THREE.MTLLoader();
            mtlLoader.setPath('objets/drone/');
            mtlLoader.load("dji600.mtl", function (materials) {
                materials.preload();
                let objLoader = new THREE.OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.setPath('objets/drone/');
                objLoader.load('dji600.obj', function (object) {
                        createDrones(object, json);
                    }, function (xhr) {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    function (error) {
                        console.error("Erreur de chargement");
                    });

            });
            duration = findMaxTime(json);
            console.log(duration);
            createPanel();
        }
    )
}

function findMaxTime(json){
    let time_max = 0;
    for(let i = 0; i < json["drones"].length; i++){
        for(let j = 0; j < json["drones"][i]["waypoints"].length; j++){
            let time = json["drones"][i]["waypoints"][j]["frame"]/30;
            if(time > time_max){
                time_max = time
            }
        }
    }
    return time_max
}


function createPanel() {
    const panel = new GUI({width: 310});
    const folder1 = panel.addFolder( 'Aides' );
    const folder2 = panel.addFolder( 'Timeline' );
    const folder3 = panel.addFolder( 'Vitesse et collision' );

    settings = {
        'grille': true,
        'axes': true,
        'trajectoires des drones': true,
        'ligne entre le drone et le sol': true,
        'spheres englobantes': true,
        'noms des drones': true,
        'pause': false,
        'timeline': timer,
        'restart': function () {

            updateTimer(0);

        },
        'vitesse maximale': 10,
        'rayon des spheres englobantes': 2,
        'effacer les alertes collision': function () {

            eraseCollisions();

        },
        'effacer les alertes vitesse': eraseSpeed,
    };

    folder1.add( settings, 'grille' ).onChange( showGrid );
    folder1.add( settings, 'axes' ).onChange( showAxis );
    folder1.add( settings, 'trajectoires des drones' ).onChange( showPath );
    folder1.add( settings, 'ligne entre le drone et le sol' ).onChange( showLines );
    folder1.add( settings, 'spheres englobantes' ).onChange( showSpheres );
    folder1.add( settings, 'noms des drones' ).onChange( showLabels );
    folder2.add( settings, 'timeline', 0, duration, 0.01 ).listen().onChange( updateTimer );
    folder2.add( settings, 'pause' ).listen().onChange( pause );
    folder2.add( settings, 'restart' );
    folder3.add( settings, 'vitesse maximale', 0, 100, 0.01 ).onChange( updateSpeed );
    folder3.add( settings, 'rayon des spheres englobantes', 0, 10, 0.01 ).onChange( changeSphere );
    folder3.add( settings, 'effacer les alertes collision' );
    folder3.add( settings, 'effacer les alertes vitesse' );
}


function showGrid(visibility){
    gridHelper.visible = visibility;
}
function showAxis(visibility){
    axesHelper.visible = visibility;
}
function showPath(visibility){
    trajectoires.visible = visibility;
}
function showLines(visibility){
    lines_to_plan.visible = visibility;
}
function showSpheres(visibility){
    spheres.visible = visibility;
}
function showLabels(visibility){
    labels.visible = visibility;
    for(let i = 0; i < drones.length; i++){
        if(visibility){
            drones[i].label.element.textContent = drones[i].id;
            drones[i].label.element.className = 'label';
            labels.children[i] = drones[i].label;
        } else {
            drones[i].label.element.textContent = '';
            drones[i].label.element.className = '';
            labels.children[i] = drones[i].label;
        }
    }
}

function pause(){
    if ( running ) {
        clock.stop();
    }
    else {
        clock.start();
    }
    running = !running;
    settings.pause = !running;
    console.log(settings.pause);
}

function updateTimer(newtime) {
    for(let i = 0; i < drones.length; i++) {
        timer = newtime;
        settings.timeline = timer;
        drones[i].update_position(timer, 0);
        drones[i].update_label();
        drones[i].update_line();
        drones[i].update_sphere(radius);
        spheres.children[i] = drones[i].show_sphere;
        lines_to_plan.children[i] = drones[i].line;
        labels.children[i] = drones[i].label;
    }
}

function updateSpeed(newspeed) {
    speedmax = newspeed;
}

function changeSphere(newradius) {
    radius = newradius;
    for(let i = 0; i < drones.length; i++){
        drones[i].update_sphere(radius);
        spheres.children[i] = drones[i].show_sphere;
    }
}

function eraseCollisions() {
    let collisions_alerts = document.getElementById('collision');
    collisions_alerts.innerHTML = '<h5>Alerte collision</h5>';
}

function eraseSpeed() {
    let speed_alerts = document.getElementById('speed');
    speed_alerts.innerHTML = '<h5>Alerte vitesse</h5>';
}




// pour redimensionner le zone d'affichage 3D quand le fenetre change de taille

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    labelRenderer.setSize( window.innerWidth, window.innerHeight );
}
window.addEventListener( 'resize', onWindowResize, false );

window.addEventListener("keydown", function (event) {
    switch (event.key) {
        case "a":
            axesHelper.visible = !axesHelper.visible;
            break;
        case "g":
            gridHelper.visible = !gridHelper.visible;
            break;
        case "t":
            trajectoires.visible = !trajectoires.visible;
            break;
        case "l":
            lines_to_plan.visible = !lines_to_plan.visible;
            break;
        case "s":
            spheres.visible = !spheres.visible;
            break;
        case "r":
            labels.visible = !labels.visible;
            for(let i = 0; i < drones.length; i++){
                if(labels.visible){
                    drones[i].label.element.textContent = drones[i].id;
                    drones[i].label.element.className = 'label';
                    labels.children[i] = drones[i].label;
                } else {
                    drones[i].label.element.textContent = '';
                    drones[i].label.element.className = '';
                    labels.children[i] = drones[i].label;
                }
            }
            break;
        default:
            return;
    }
    event.preventDefault(); // Pour que d'autres fonctions puissent traiter la touche
}, true);







let createDrones = function (object, json) {
    for(const drone in json.drones){
        let new_drone_obj = object.clone();
        let new_drone = new Drone(new_drone_obj, json.drones[drone])

        lines_to_plan.add(new_drone.line)
        group_drones.add(new_drone.object);
        trajectoires.add(new_drone.traj);
        drones.push(new_drone);
        scene.add( new_drone.light );
        labels.add( new_drone.label );
        spheres.add(new_drone.show_sphere)
    }
    scene.add(group_drones);
    scene.add(lines_to_plan);
    scene.add(trajectoires);
    scene.add(labels);
    scene.add(spheres);
    frame = 1;
}





function check_intersection(clocktime){
    for(let i = 0; i < drones.length; i++){
        for(let j = i+1; j < drones.length; j++){
            if(drones[i].sphere.intersectsSphere(drones[j].sphere)){
                let new_alert = document.createElement('p');
                new_alert.innerHTML = '<b>Temps : ' + clocktime.toFixed(2) + '</b> - Le drone ' + drones[i].id + ' et le drone ' + drones[j].id + ' sont entrés en collision !'
                let collision_alerts = document.getElementById('collision');
                collision_alerts.append(new_alert);
            }
        }
    }
}


let animate = function () {
    requestAnimationFrame( animate );

    let mixerUpdateDelta = clock.getDelta();

    if(frame > 0 && running){

        timer += mixerUpdateDelta;
        settings.timeline = timer;
        for(let i = 0; i < drones.length; i++){
            drones[i].update_position(timer, mixerUpdateDelta);
            drones[i].update_label();
            drones[i].update_line();
            drones[i].update_sphere(radius);
            drones[i].check_speed(speedmax, timer);
            spheres.children[i] = drones[i].show_sphere;
            lines_to_plan.children[i] = drones[i].line;
            labels.children[i] = drones[i].label;
        }
        check_intersection(timer);
        if(timer > duration){
            pause();
            updateTimer(duration);
        }

    }

    controls.update();
    renderer.render( scene, camera );
    labelRenderer.render( scene, camera );

    document.getElementById("info").innerHTML = "Triangles : " + renderer.info.render.triangles;
    stats.update();

};

animate();

