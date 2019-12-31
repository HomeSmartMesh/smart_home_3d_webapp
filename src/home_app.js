import * as three from "./three_app.js";
import * as mouse from "./three_mouse.js";
import * as control from "./three_control.js";

import config from "../config.js";

var hue_mesh_name = {};
var hue_light_states = {};

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
	
}


//in this callback, three is ready
function on_load(){
	mouse.init(three.getCamera());
	const mouse_mesh_list = three.getMouseMeshList();
	mouse.SetMeshList(mouse_mesh_list);

	mouse_mesh_list.forEach(mesh => {
		if(mesh.userData.hue != "undefined"){
			hue_mesh_name[mesh.userData.hue] = mesh.name;
			send_custom_event("three_param",{name:mesh.name, color:0, light:0, emissive:0});
		}
		else if(mesh.userData.type == "lightgroup"){
			send_custom_event("three_param",{name:mesh.name, color:0, light:0, emissive:0});		
		}
		else if(mesh.userData.type == "heating"){
			send_custom_event("three_param",{name:mesh.name, color:0});
		}
	});

	control.init(three.getScene(),three.getCamera(),three.getControl());
	//control.init(scene,camera,orbit_control);

	three.animate();

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
		const current_state = hue_light_states[e.detail.name];
		set_mesh_light(e.detail.name,!current_state);
	}
	else if(e.detail.type == "lightgroup"){
	}
	else if(e.detail.type == "heating"){
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
	const mesh_name = hue_mesh_name[e.detail.name];
	hue_light_states[mesh_name] = e.detail.on;
	set_mesh_light(mesh_name,e.detail.on);
}

function onHueStartup(e){
	for (const [light_id,light] of Object.entries(e.detail)) {
		if(light.name in hue_mesh_name){
			const mesh_name = hue_mesh_name[light.name];
			if(light.state.reachable){
				send_custom_event("three_param",{name:mesh_name, color:1});
				set_mesh_light(mesh_name,light.state.on);
				console.log(`home_app> - ${mesh_name} is ${light.state.on}`);
			}
			else{
				send_custom_event("three_param",{name:mesh_name, color:0});
				set_mesh_light(mesh_name,false);
				console.log(`home_app> - ${mesh_name} is not reachable`);
			}
		}
		else{
			console.warn(`home_app> hue light '${light.name}' does not exist as mesh`);
		}
	}

}

function onMqttMessage(e){
	const obj = three.mqtt_to_object(e.detail.topic);
	if(obj.userData.type == "heating"){
		const obj_name = obj.name;
		const heating_demand = e.detail.payload.pi_heating_demand;
		const ratio = heating_demand / 255;
		console.log(`home_app> heat mqtt : ${obj_name} ratio at ${ratio}`);
		send_custom_event('three_param',{name:obj_name,Cool:1-ratio,Hot:ratio});
	}
}

export{init};