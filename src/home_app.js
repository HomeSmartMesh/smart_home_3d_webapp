import * as three from "./three_app.js";
import * as mouse from "./three_mouse.js";
import * as control from "./three_control.js";

import config from "../config.js";

let is_emulation = false;
let hue_mesh_name = {};
let mqtt_mesh_name = {};
let hue_light_states = {};

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function init(){
	three.init(on_load,config.glTF_model);

	window.addEventListener( 'mesh_mouse_enter', onMeshMouseEnter, false );
	window.addEventListener( 'mesh_mouse_exit', onMeshMouseExit, false );
	window.addEventListener( 'hue_lights_on_startup', onHueStartup, false );
	window.addEventListener( 'hue_light_state', onHueLightState, false );
	window.addEventListener( 'mesh_control', onMeshControl, false );
	window.addEventListener( 'mesh_click', onMeshClick, false );
	window.addEventListener( 'mesh_hold', onMeshHold, false );
	window.addEventListener( 'mqtt_message', onMqttMessage, false);
	window.addEventListener( 'three_list', onThreeList, false);
	
}


//in this callback, three is ready
function on_load(){

	document.getElementById("three_bar").innerHTML = "on_load()";
	document.getElementById("three_bar").style.width = "10%";
	mouse.init(three.getCamera());

	document.getElementById("three_bar").style.width = "70%";
	control.init(three.getScene(),three.getCamera(),three.getControl());
	//control.init(scene,camera,orbit_control);

	document.getElementById("three_bar").style.width = "90%";
	three.animate();

	document.getElementById("three_bar").style.width = "100%";
	document.getElementById("three_bar").style.display = "none";


}

function onThreeList(e){
	if(e.detail.type == "mqtt"){
		mqtt_mesh_name = e.detail.map;
	}

	if(e.detail.type == "hue"){
		hue_mesh_name = e.detail.map;
		for(let hue_name in hue_mesh_name){
			send_custom_event("three_param",{name:hue_mesh_name[hue_name], color:0, light:0, emissive:0});
		}
	}

}

function onMeshMouseEnter(e){
	//console.log(`Mesh Mouse Enter in ${e.detail.name}`);
	document.getElementById('viewer').style.cursor = "pointer";
	//three.setBulbState(e.detail.name,"highlight",true);
}

function onMeshMouseExit(e){
	//console.log(`Mesh Mouse Exit out of ${e.detail.name}`)
	document.getElementById('viewer').style.cursor = "default";
	//three.setBulbState(e.detail.name,"highlight",false);
}

function onMeshMouseDown(e){
}

function onMeshControl(e){
	//console.log(`home_app> onMeshControl() ${e.detail.name} has ${e.detail.config} at ${e.detail.val.toFixed(2)}`);
	if(e.detail.name === "Kitchen"){
		if(e.detail.config == "slider"){
			items_anim[e.detail.name] = e.detail.val;
			items_anim.Emissive = e.detail.val*0.5;
			items_anim.Light = e.detail.val*0.8;
			items_anim.Color = e.detail.val;
			send_custom_event("three_param",{name:"Kitchen", emissive:items_anim.Emissive});
			send_custom_event("three_param",{name:"Kitchen", light:items_anim.Light});
			send_custom_event("three_param",{name:"Kitchen", color:items_anim.Color});
		}
	}
}

function onMeshClick(e){
	console.log(`home_app> mesh_click on ${e.detail.name}`);
	if(e.detail.userData.type == "light"){
		if(is_emulation){
			const current_state = hue_light_states[e.detail.name];
			set_mesh_light(e.detail.name,!current_state);
		}
	}
	else if(e.detail.userData.type == "lightgroup"){
	}
	else if(e.detail.userData.type == "heating"){
	}
}

function onMeshHold(e){
	control.run(e.detail.name,e.detail.y);
}

function set_mesh_light(name,state){
	const var_light = (state === true)? 1 : 0;
	const var_emissive = (state === true)? 0.5 : 0;
	//console.log(`${name} has emissive set to ${var_emissive}`);
	send_custom_event("three_param",{name:name, light:var_light, emissive:var_emissive});
}

function onHueLightState(e){
	if(typeof(e.detail.reach) != "undefined"){
		const mesh_name = hue_mesh_name[e.detail.name];
		hue_light_states[mesh_name] = false;
		set_mesh_light(mesh_name,false);
		send_custom_event("three_param",{name:mesh_name, color:0});
	}
	else if(typeof(e.detail.on) != "undefined"){
		const mesh_name = hue_mesh_name[e.detail.name];
		hue_light_states[mesh_name] = e.detail.on;
		set_mesh_light(mesh_name,e.detail.on);
	}
}

function onHueStartup(e){
	for (const [light_id,light] of Object.entries(e.detail)) {
		if(light.name in hue_mesh_name){
			const mesh_name = hue_mesh_name[light.name];
			if(light.state.reachable){
				send_custom_event("three_param",{name:mesh_name, color:1});
				set_mesh_light(mesh_name,light.state.on);
				console.log(`home_app> - '${light.name}' is ${(light.state.on==true)?"on":"off"}`);
			}
			else{
				send_custom_event("three_param",{name:mesh_name, color:0});
				set_mesh_light(mesh_name,false);
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