import * as THREE from "../../jsm/three/three.module.js";
import { GLTFLoader } from "../../jsm/three/GLTFLoader.js";

import * as mouse from "./three_mouse.js";
import config from "../config.js";

var scene;
var camera;
var orbit_control;
var isActive = false;
var active_name ="";
var current_val,start_val;
var last_screen_y;
var group,path,slider;
var is_bullet_centered = config.control.is_bullet_centered_not_slider;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function init(l_scene,l_camera,l_orbit_control){
    scene = l_scene;
    camera = l_camera;
    orbit_control = l_orbit_control;
	var loader = new GLTFLoader();
    loader.load(config.control.file,
        gltf => {
            path = gltf.scene.getObjectByName("path");
            //path.visible = false;
            slider = gltf.scene.getObjectByName(config.control.name);
            //slider.visible = false;
            group = new THREE.Group();
            group.add(slider);
            group.add(path);
            group.visible = false;
            scene.add(group);
        }
    );
    console.log("three_control> init()");
	window.addEventListener('mousemove', onMouseMove, false );
	window.addEventListener('touchmove', onTouchMove, false );
    window.addEventListener('mouseup', onMouseUp, false );
    window.addEventListener('touchend', onMouseUp, false );
        
}

function log_pos(obj){
    return `(${obj.position.x.toFixed(2)},${obj.position.y.toFixed(2)},${obj.position.z.toFixed(2)})`;
}

function run(l_name,clientY,l_start_val=0.5){
    start_val = l_start_val;
    last_screen_y = clientY;
    const target = scene.getObjectByName(l_name);
    console.log(`running ${config.control.name} control at (${start_val.toFixed(2)}) on ${l_name} at y = ${target.position.y.toFixed(2)}`);
    let place = new THREE.Vector3(0,0,0);
    const ratio = config.control.sliderPos_CamToObj_ratio;
    place.addScaledVector(camera.position,ratio);
    place.addScaledVector(target.position,1-ratio);
    group.position.set(place.x,place.y,place.z);
    if(is_bullet_centered)    {
        const range = config.control.space_range;
        path.position.y = (range/2) - start_val*range;
    }
    else{
        path.position.y = 0;
    }
    const box_target = new THREE.Box3().setFromObject(target);
    const box_slider = new THREE.Box3().setFromObject(path);
    const scale = (box_target.max.y - box_target.min.y) / (box_slider.max.y - box_slider.min.y);
    group.scale.set(scale,scale,scale);
    group.visible = true;
    document.getElementById('viewer').style.cursor = "none";
    mouse.suspend();
    orbit_control.saveState();
    orbit_control.enabled = false;
    isActive = true;
    active_name = l_name;
    set_control_pos(start_val);//using active_name
}

function set_control_pos(target_val){
    current_val = target_val;
    if(current_val < 0){
        current_val = 0;
    }
    else if(current_val > 1){
        current_val = 1;
    }
    const range = config.control.space_range;
    if(is_bullet_centered){
        slider.position.y = (current_val-start_val) * range;
    }
    else{
        slider.position.y = -(range/2) + current_val*range;
    }
    send_custom_event("mesh_control",{name:active_name,config:config.control.name,val:current_val});
}

function process_move(y){
    if(isActive){
        const shift_screen = y - last_screen_y;
        last_screen_y = y;
        const screen_sensitivity = config.control.screen_move_sensitivity;
        const shift_val = shift_screen/screen_sensitivity;
        set_control_pos(current_val - shift_val);
    }
}

function onMouseMove(e){
    process_move(e.clientY);
}

function onTouchMove(e){
    process_move(e.targetTouches[0].clientY);
}

function onMouseUp(e){
    if(isActive){
        group.scale.set(1,1,1);
        group.visible = false;
        document.getElementById('viewer').style.cursor = "default";
        mouse.resume();
        orbit_control.enabled = true;
        orbit_control.reset();
        isActive = false;
        const target = scene.getObjectByName(active_name);
        console.log(`releasing ${config.control.name} control at (${current_val.toFixed(2)}) from ${active_name} at y = ${target.position.y.toFixed(2)}`);
    }
}

function set_bullet_centered(val){
    is_bullet_centered = val;
}

function get_bullet_centered(val){
    return is_bullet_centered;
}

export{init,run,get_bullet_centered,set_bullet_centered};
