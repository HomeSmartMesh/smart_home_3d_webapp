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
	
}

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
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
			set_hue_light(hue_mesh_name[hue_name], 0);
			//set_hue_reach(hue_mesh_name[hue_name], 0);
			send_custom_event("three_param",{name:hue_mesh_name[hue_name], outline:true});

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
	//send_custom_event("three_param",{name:e.detail.name, outline:true});
}

function onMeshMouseExit(e){
	//console.log(`Mesh Mouse Exit from ${e.detail.name}`)
	document.getElementById('viewer').style.cursor = "default";
	//send_custom_event("three_param",{name:e.detail.name, outline:false});
}

function onMeshControl(e){
	//console.log(`home_app> onMeshControl() ${e.detail.name} has ${e.detail.config} at ${e.detail.val.toFixed(2)}`);
}

function onMeshHold(e){
	control.run(e.detail);
}

function set_hue_light(name,state_on,state_bri){
	//console.log(`${name} set to ${bri.toFixed(2)}`);
	const brightness = (state_on===true)?state_bri/255.0:0;
	send_custom_event("three_param",{name:name, light:brightness, emissive:brightness*0.5});
}

function set_hue_reach(name,color){
	//console.log(`${name} reach set to ${color}`);
	//send_custom_event("three_param",{name:name, color:color, outline:(color==1)?true:false});
	send_custom_event("three_param",{name:name, color:color});
}

function onHueLightState(e){
	if(typeof(e.detail.reach) != "undefined"){
		const mesh_name = hue_mesh_name[e.detail.name];
		set_hue_light(mesh_name,0);
		set_hue_reach(mesh_name, 1);
	}
	else{
		const mesh_name = hue_mesh_name[e.detail.name];
		set_hue_light(mesh_name,e.detail.on,e.detail.bri);
	}
}

function onHueAllLights(e){
	hue_light_list = e.detail;
	hue_lights_on_startup_reached = true;
	if(hue_lights_on_startup_reached && hue_three_list_reached){
		apply_hue_on_three();
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
			const mesh_name = hue_mesh_name[light.name];
			if(light.state.reachable){
				set_hue_reach(mesh_name, 1);
				set_hue_light(mesh_name,light.state.on,light.state.bri);
				console.log(`home_app> - '${light.name}' is ${(light.state.on==true)?"on at "+light.state.bri:"off"}`);
			}
			else{
				set_hue_reach(mesh_name, 0);
				set_hue_light(mesh_name,0);
				console.log(`home_app> - '${light.name}' is not reachable`);
			}
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
		send_custom_event('three_param',{name:obj_name,color:Math.sqrt(ratio)});
	}
	if(obj.userData.type == "temperature"){
		const temp = e.detail.payload.temperature;
		if(typeof(temp) != "undefined"){
			const ratio = (temp - (15.0)) / 28.0;
			console.log(`home_app> mqtt temperature : ${obj_name} ratio at ${ratio.toFixed(2)}`);
			send_custom_event('three_param',{name:obj_name,color:ratio});
		}
	}
}

export{init};