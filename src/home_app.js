import * as three from "./three_app.js";
import * as mouse from "./three_mouse.js";

var rooms_light_state = {};

var hue_mesh_name = {};

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function init(){
	three.init(on_load,"3d_models/home.gltf");// ""../"" fail "./" fail

	window.addEventListener( 'mesh_mouse_enter', onMeshMouseEnter, false );
	window.addEventListener( 'mesh_mouse_exit', onMeshMouseExit, false );
	window.addEventListener( 'hue_lights_on_startup', onHueStartup, false );
	window.addEventListener( 'hue_light_state', onHueLightState, false );
	window.addEventListener( 'mqtt_message', onMqttMessage, false );
}

function on_load(){
	mouse.init(three.getCamera());
	const mouse_mesh_list = three.getMouseMeshList();
	mouse.SetMeshList(mouse_mesh_list);

	mouse_mesh_list.forEach(mesh => {
		if(mesh.userData.type == "light"){
			if(mesh.userData.hue != "undefined"){
				hue_mesh_name[mesh.userData.hue] = mesh.name;
			}
		}
		else if(mesh.userData.type == "lightgroup"){
			three.setBulbState(mesh.name,"init",true);
		}
		else if(mesh.userData.type == "heating"){
			
		}
	});

	console.log("home_app> ===> on_load()");
	three.animate();
}

function onMeshMouseEnter(e){
	document.getElementById('viewer').style.cursor = "pointer";
}

function onMeshMouseExit(e){
	document.getElementById('viewer').style.cursor = "default";
}

function onMeshMouseDown(e){
	console.log(`Mesh Mouse Down on ${e.detail.name}`);
	if(e.detail.type == "heating"){
		const current_state = three.getHeatState(e.detail.name);
		three.setHeatState(e.detail.name,!current_state);
	}
}
function onHueLightState(e){

	three.setBulbState(e.detail.name,"switch",e.detail.on);

}

function onHueStartup(e){
	for (const [light_id,light] of Object.entries(e.detail)) {
		if(light.name in hue_mesh_name){
			if(light.state.reachable){
				three.setBulbState(hue_mesh_name[light.name],"highlight",true);
				console.log(`home_app> - ${light.name} is ${light.state.on}`);
				three.setBulbState(hue_mesh_name[light.name],"switch",light.state.on);
			}
			else{
				console.log(`home_app> - ${light.name} is not reachable`);
				three.setBulbState(hue_mesh_name[light.name],"highlight",false);
				three.setBulbState(hue_mesh_name[light.name],"switch",false);
			}

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