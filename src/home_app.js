import * as three from "./three_app.js";
import * as mouse from "./three_mouse.js";

var rooms_light_state = {};

var hue_mesh_name = {};

function init(){
	$.getJSON("home.json", function(home_data) {
		three.init(on_load,home_data.glTF_model);

		window.addEventListener( 'mesh_mouse_enter', onMeshMouseEnter, false );
		window.addEventListener( 'mesh_mouse_exit', onMeshMouseExit, false );
		//window.addEventListener( 'mesh_mouse_down', onMeshMouseDown, false );
		//window.addEventListener( 'mesh_touch_start', onMeshMouseDown, false );
		window.addEventListener( 'hue_lights_on_startup', onHueStartup, false );
		window.addEventListener( 'hue_light_state', onHueLightState, false );
	});
	
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
			//three.setBulbState(mesh.name,"switch",false);
			//three.setBulbState(mesh.name,"init",true);
		}
		else if(mesh.userData.type == "lightgroup"){
			three.setBulbState(mesh.name,"init",true);
		}
		else if(mesh.userData.type == "heating"){
			three.setHeatState(mesh.name,true);
		}
	});


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

function swap_light_state(name){
	if(typeof rooms_light_state[name] == "undefined"){
		rooms_light_state[name] = true;
	}
	else{
		rooms_light_state[name] = ! rooms_light_state[name];
	}
	return rooms_light_state[name];
}

function onMeshMouseDown(e){
	console.log(`Mesh Mouse Down on ${e.detail.name}`);
	if(e.detail.type == "light"){
		const current_state = three.getLightState(e.detail.name);
		three.setBulbState(e.detail.name,"switch",!current_state);
	}
	else if(e.detail.type == "lightgroup"){
		const current_state = three.getLightGroupState(e.detail.name);
		three.setBulbGroupState(e.detail.name,"switch",!current_state);
	}
	else if(e.detail.type == "heating"){
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

export{init};