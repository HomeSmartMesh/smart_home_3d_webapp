/**
 * sent events:
 * - three_param
 * 
 * used events:
 * - mesh_mouse_enter
 * - mesh_mouse_exit
 * - hue_all_lights
 * - hue_light_state
 * - mesh_control
 * - mesh_hold
 * - mqtt_message
 * - three_list
 */

import * as three from "./three_app.js";
import * as mouse from "./three_mouse.js";
import * as control from "./three_control.js";
import { GUI } 				from './../jsm/dat.gui.module.js';

import config from "../config.js";

let is_emulation = false;
let hue_mesh_name = {};
let mqtt_mesh_name = {};
let hue_light_list = [];
let hue_lights_on_startup_reached = false;
let hue_three_list_reached = false;

function init(){
	
	three.init(on_load,config.glTF_model);

	window.addEventListener( 'mesh_mouse_enter', onMeshMouseEnter, false );
	window.addEventListener( 'mesh_mouse_exit', onMeshMouseExit, false );
	window.addEventListener( 'hue_all_lights', onHueAllLights, false );
	window.addEventListener( 'hue_light_state', onHueLightState, false );
	window.addEventListener( 'mesh_control', onMeshControl, false );
	//window.addEventListener( 'mesh_hold', onMeshHold, false );
	window.addEventListener( 'mqtt_message', onMqttMessage, false);
	window.addEventListener( 'three_list', onThreeList, false);

	if(config.hue.test_hsl){
		test_hsl();
	}
	
}

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function test_hsl(){
	let params = {		h: 0.5,		s: 0.5,		l: 0.5,		ct:153,		lightness:0.5	};
	var gui = new GUI( { width: 300 } );
	gui.add( params, 'h'		, 0.0, 1.0 ).onChange(  value => {send_custom_event("three_param",{name:"Rooms", h:value,s:params.s,l:params.l})} );
	gui.add( params, 's'		, 0.0, 1.0 ).onChange(  value => {send_custom_event("three_param",{name:"Rooms", h:params.h,s:value,l:params.l})} );
	gui.add( params, 'l'		, 0.0, 1.0 ).onChange(  value => {send_custom_event("three_param",{name:"Rooms", h:params.h,s:params.s,l:value})} );
	gui.add( params, 'ct'		, 153, 454 ).onChange(  value => {send_custom_event("three_param",{name:"Rooms", color_temperature:value})} );
	gui.add( params, 'lightness', 0.0, 1.0 ).onChange(  value => {send_custom_event("three_param",{name:"Rooms", color_lightness:value})} );
}

//in this callback, three is ready
function on_load(){

	mouse.init(three.getCamera());

	control.init(three.getScene(),three.getCamera(),three.getControl());

}

function onThreeList(e){
	if(e.detail.type == "mqtt"){
		mqtt_mesh_name = e.detail.map;
	}

	if(e.detail.type == "hue"){
		hue_mesh_name = e.detail.map;
		for(let hue_name in hue_mesh_name){
			send_custom_event("three_param",{name:hue_mesh_name[hue_name], light:0});
		}
		hue_three_list_reached = true;
		if(hue_lights_on_startup_reached && hue_three_list_reached){
			apply_hue_on_three();
		}
	}
}

function onMeshMouseEnter(e){
	//console.log(`Mesh Mouse Enter in ${e.detail.name}`);
	document.getElementById('viewer').style.cursor = "pointer";
}

function onMeshMouseExit(e){
	//console.log(`Mesh Mouse Exit from ${e.detail.name}`)
	document.getElementById('viewer').style.cursor = "default";
}

function onMeshControl(e){
	//console.log(`home_app> onMeshControl() ${e.detail.name} has ${e.detail.config} at ${e.detail.val.toFixed(2)}`);
}

function onMeshHold(e){
	control.run(e.detail);
}

function onHueLightState(e){
	const light = e.detail;
	const mesh_name = hue_mesh_name[light.name];
	send_custom_event("three_param",{name:mesh_name, outline:light.state.reachable});
	const brightness = (light.state.on && light.state.reachable)?light.state.bri/255.0:0;
	send_custom_event("three_param",{name:mesh_name, light:brightness});

	let ct;
	if(typeof(light.state.ct) != "undefined"){
		ct = light.state.ct;
	}
	else{
		ct = get_ct_from_model_id(light.modelid);
	}
	send_custom_event("three_param",{name:mesh_name, color_temperature:ct, color_lightness:brightness});
}

function onHueAllLights(e){
	hue_light_list = e.detail;
	hue_lights_on_startup_reached = true;
	if(hue_lights_on_startup_reached && hue_three_list_reached){
		apply_hue_on_three();
	}
}

function get_ct_from_model_id(model_id){
	if(model_id == "LWB010"){
		return 1000000/2700;
	}
	else{
		return 1000000/2700;
	}
}

/**	
 * requires
 * - hue_light_list from 'hue_lights_on_startup'
 * - hue_mesh_name from 'three_list'
 */
function apply_hue_on_three(){
	//console.log(`home_app> apply_hue_on_three()`);
	for (const [light_id,light] of Object.entries(hue_light_list)) {
		if(light.name in hue_mesh_name){
			onHueLightState({detail:light});
		}
		else{
			console.warn(`home_app> no Object has hue property = '${light.name}'`);
		}
	}
}

function onMqttMessage(e){
	const obj_name = mqtt_mesh_name[e.detail.topic];
	const scene = three.getScene();
	if(typeof(scene) === "undefined"){
		console.warn(`home_app> mqtt message but scene not ready yet`);
		return
	}
	const obj = scene.getObjectByName(obj_name);
	if(obj.userData.type == "heating"){
		const heating_demand = e.detail.payload.pi_heating_demand;
		const ratio = heating_demand / 255;
		console.log(`home_app> mqtt heater : ${obj_name} ratio at ${ratio.toFixed(2)}`);
		send_custom_event('three_param',{name:obj_name,color_ratio:Math.sqrt(ratio)});
	}
	if(obj.userData.type == "temperature"){
		const temp = e.detail.payload.temperature;
		if(typeof(temp) != "undefined"){
			const ratio = (temp - (15.0)) / 28.0;
			console.log(`home_app> mqtt temperature : ${obj_name} ratio at ${ratio.toFixed(2)}`);
			send_custom_event('three_param',{name:obj_name,color_ratio:ratio});
		}
	}
	if(obj.userData.type == "uwb"){
		const position = e.detail.payload.position;
		if(typeof(position) != "undefined"){
			//console.log(`home_app> uwb : ${obj_name} ratio at ${position.x.toFixed(2)}`);
			send_custom_event('three_param',{name:obj_name,position:position});
		}
	}
}

export{init};