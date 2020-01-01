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
	
}


//in this callback, three is ready
function on_load(){
	mouse.init(three.getCamera());
	const mouse_mesh_list = three.getMouseMeshList();
	mouse.SetMeshList(mouse_mesh_list);

	mouse_mesh_list.forEach(mesh => {

		if(typeof(mesh.userData.mqtt) != "undefined"){
			mqtt_mesh_name[mesh.userData.mqtt] = mesh.name;
		}

		if(typeof(mesh.userData.hue) != "undefined"){
			hue_mesh_name[mesh.userData.hue] = mesh.name;
			send_custom_event("three_param",{name:mesh.name, color:0, light:0, emissive:0});
		}

		if(mesh.userData.type == "lightgroup"){
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
	//console.log(`home_app> mesh_click on ${e.detail.name}`);
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
				console.log(`home_app> - ${mesh_name} is ${light.state.on}`);
			}
			else{
				send_custom_event("three_param",{name:mesh_name, color:0});
				set_mesh_light(mesh_name,false);
				console.log(`home_app> - ${mesh_name} is not reachable`);
			}
		}
		else{
			console.warn(`home_app> no Object has hue property = '${light.name}'`);
		}
	}

}

function onMqttMessage(e){
	const obj_name = mqtt_mesh_name[e.detail.topic];
	const obj = three.getScene().getObjectByName(obj_name);
	if(obj.userData.type == "heating"){
		const heating_demand = e.detail.payload.pi_heating_demand;
		const ratio = heating_demand / 255;
		console.log(`home_app> heat mqtt : ${obj_name} ratio at ${ratio}`);
		send_custom_event('three_param',{name:obj_name,color:Math.sqrt(ratio)});
	}
}

export{init};