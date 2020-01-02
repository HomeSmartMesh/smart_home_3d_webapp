import * as THREE from "./../jsm/three/three.module.js";
import { OrbitControls } from "./../jsm/three/OrbitControls.js";
import { GLTFLoader } from "./../jsm/three/GLTFLoader.js";

import config from "./../config.js";

var camera, scene, renderer;
var orbit_control;

var anim_params = {};
var color_params = {};
var user_hue_to_name = {};

var is_stats;
var stats1,stats2,stats3;
var xPanel;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function create_camera(gltf){
	let res_cam;
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	const scene_cam = gltf.scene.getObjectByName("Camera");
	if(typeof(scene_cam) != "undefined"){
		const gltf_cam = gltf.cameras[0];
		if(gltf_cam.type == "PerspectiveCamera"){
			//issue assigning the camera does not succeed, so mapping params on creation
			res_cam = new THREE.PerspectiveCamera( gltf_cam.fov, w / h, gltf_cam.near, gltf_cam.far );
			//console.log(`three_app> create_camera()`);
			res_cam.position.copy(scene_cam.position);
			res_cam.rotation.copy(scene_cam.rotation);
		}
	}

	if(typeof(res_cam) == "undefined"){
		res_cam = new THREE.PerspectiveCamera( cam.fov, w / h, 0.01, 50 );
		//console.log(`three_app> create_camera()`);
		//console.log(cam.position);
		res_cam.position.setX(0);
		res_cam.position.setY(5);
		res_cam.position.setz(5);
	}

	return res_cam;
}

function create_renderer(){
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	

	renderer = new THREE.WebGLRenderer( { antialias: true,alpha:true } );
	renderer.setSize( w, h );
	renderer.setClearColor( 0x000000, 0.0 );
	renderer.physicallyCorrectLights = true;

	renderer.shadowMap.enabled = true;
	//ShadowMapSoft
	renderer.shadowMap.type = THREE.PCFShadowMap; // default
	//renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

	container.appendChild(renderer.domElement);
	return renderer;
}

function add_view_orbit(camera,renderer){
	orbit_control = new OrbitControls( camera, renderer.domElement );

	//orbit_control.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

	orbit_control.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	orbit_control.dampingFactor = 1.5;//0.1:too rolly, 1: smooth, 2 unstable

	orbit_control.screenSpacePanning = false;

	orbit_control.minDistance = 5;
	orbit_control.maxDistance = camera.far;

	orbit_control.minPolarAngle =  30 * Math.PI / 180;
	orbit_control.maxPolarAngle =  80 * Math.PI / 180;

	orbit_control.rotateSpeed = 0.7;
	return orbit_control;
}

function onWindowResize() {
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );
}

function add_ambient_light(){

	var plight = new THREE.PointLight( 0xffffff, 2, 0,0 );
	plight.position.set( 0, 4, 5 );
	scene.add( plight );
	var hlight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 2 );
	scene.add( hlight );

	var light = new THREE.AmbientLight( 0xB0B0B0 );
	scene.add( light );
}

function get_scene_box(scene){
	let first = true;
	var box;
	scene.traverse(obj =>{
		if(obj.type == "Mesh"){
			if(first){
				box = new THREE.Box3().setFromObject(obj);
				first = false;
			}else{
				box.expandByObject(obj)
			}
		}
	} );
	return box;
}

function center_scene(scene){
	console.log(`centering the scene`);
	var box = get_scene_box(scene);
	var s = box.getSize();
	console.log(`scene boxed from (${box.min.x},${box.min.y},${box.min.z}) to (${box.max.x},${box.max.y},${box.max.z}) with size (${s.x},${s.y},${s.z})`);
	const center_x = (box.max.x - box.min.x)/2;
	const center_y = (box.max.y - box.min.y)/2;
	console.log(`shifting the scene by x = ${-center_x} , y = ${-center_y}`);
	//scene.position.set(scene.position.x - center_x, scene.position.y - center_y, scene.position.z);
	scene.traverse(obj =>{
		//though only meshes are taken as input, here everything is shifted as lights shall shift too
		//hierarchical structure does move end leaves multiple times, so selection of meshes only moved as workaround
		if(obj.type == "Mesh"){
			obj.position.set(obj.position.x + center_x, obj.position.y - center_y,obj.position.z);
		}
	} );
	box = get_scene_box(scene);
	s = box.getSize();
	console.log(`now scene boxed from (${box.min.x},${box.min.y},${box.min.z}) to (${box.max.x},${box.max.y},${box.max.z}) with size (${s.x},${s.y},${s.z})`);
}

function init_custom_visibility(scene){
	scene.traverse(obj =>{
		//though only meshes are taken as input, here everything is shifted as lights shall shift too
		//hierarchical structure does move end leaves multiple times, so selection of meshes only moved as workaround
		if(obj.type == "Mesh"){
			if(obj.userData.visible == "false"){
				obj.visible = false;
			}
		}
	} );
}

/**
 * To be deprecated
 * @param {*} obj 
 * @param {*} view_name 
 */
function set_obj_state(obj,view_name){
	console.log(`three_app> set_obj_state() ${obj.name} to : ${view_name}`);
	obj.userData.state = view_name;
	let view_set = false;
	obj.children.forEach(child => {
		//console.log(` - child : ${child.name}`);
		if(child.name == view_name){
			child.visible = true;
			view_set = true;
		}
		else{
			child.visible = false;
		}
	});
	if(!view_set){
		console.error(`${view_name} is not a view in ${obj.name}`);
	}
}

function get_obj_states(obj_name){
	const obj = scene.getObjectByName(obj_name);
	console.log(`three_app> get_obj_states() for ${obj.name}`);
	if(typeof obj.userData.state != "undefined"){
		let result = [];
		obj.children.forEach(child => {
			result.push(child.name);
		});
		return result;
	}
	else{
		console.error(`${obj.name} has no 'view' as custom property`);
		return [];
	}
}

function init_custom_colors(scene){
	scene.traverse(obj =>{
		if(typeof obj.userData.mutateColor != "undefined"){
			color_params[obj.name] = {};
			color_params[obj.name]["object"] = obj;
			color_params[obj.name]["color1"] = obj.material.color.getHexString();
			color_params[obj.name]["color2"] = obj.userData.mutateColor;
			//console.log(`${obj.name} can mutate color from ${obj.material.color.getHexString()} to ${obj.userData.mutateColor}`);
		}
	});
}

function init_shadows(scene){
	scene.traverse(obj =>{
		if(obj.type == "Mesh"){
			if(obj.userData.type == "wall"){
				obj.castShadow = true;
			}
			else if(obj.userData.type == "floor"){
				obj.receiveShadow = true;
			}
		}else if(obj.type == "PointLight"){
			obj.castShadow = true;
		}else if(obj.type == "SpotLight"){
			obj.castShadow = false;
		}
	});
}

function init_custom_animations(gltf,scene){
	scene.traverse(obj =>{
		if(obj.type == "Mesh"){
			if(typeof obj.userData.parameter != "undefined"){
				const clip_name = obj.userData.parameter;
				const clip = THREE.AnimationClip.findByName(gltf.animations,clip_name);
				if(typeof clip.name == "undefined"){console.error(`clip ${clip_name} does not exist`);}
				console.log(`Mesh '${obj.name}' has animation '${clip.name}'`);
				const obj_mixer = new THREE.AnimationMixer(obj);
				const animAction = obj_mixer.clipAction(clip);
				animAction.play();
				obj_mixer.setTime(0);
				anim_params[obj.name] = {};
				anim_params[obj.name]["type"] = "mixer";
				anim_params[obj.name][clip_name] = {};
				anim_params[obj.name][clip_name]["mixer"] = obj_mixer;
				anim_params[obj.name][clip_name]["duration"] = clip.duration;
			}
		}
	});
	
}

function init_custom_names(scene){
	scene.traverse(obj =>{
		if(typeof(obj.userData.hue) != "undefined"){
			user_hue_to_name[obj.userData.hue] = obj.name;
		}
	});
}

function load_scene(user_on_load,gltf_filename){
	document.getElementById("three_bar").innerHTML = "glTF loading()";
	document.getElementById("three_bar").style.width = "0%";
	var loader = new GLTFLoader();
	loader.load(gltf_filename,
		// called when the resource is loaded
		gltf => {
			document.getElementById("three_bar").innerHTML = "glTF loaded()";
			document.getElementById("three_bar").style.width = "0%";
			scene = gltf.scene;
			init_custom_visibility(scene);
			init_custom_animations(gltf,scene);
			document.getElementById("three_bar").style.width = "10%";
			init_custom_colors(scene);
			init_custom_names(scene);
			document.getElementById("three_bar").style.width = "50%";
			init_shadows(scene);
			add_ambient_light();
			document.getElementById("three_bar").style.width = "70%";
			camera = create_camera(gltf);
			renderer = create_renderer();
			orbit_control = add_view_orbit(camera,renderer);
			document.getElementById("three_bar").style.width = "100%";
			user_on_load();
			//setParam("Axis","pull",4);
			sendMeshLists();
		},
		// called while loading is progressing
		xhr => {
			var elem = document.getElementById("myBar");
			const percent = xhr.loaded / xhr.total * 100;
			document.getElementById("three_bar").style.width = percent +"%";
			//elem.style.width = percent + "%";
			console.log( `three_app> model loading ${percent.toFixed(0)} %` )},
		// called when loading has errors
		error => console.log( 'An error happened',error )
	);
}

function set_stats_view(l_view){
	is_stats = l_view;
	console.log(`set_stats_view() to ${l_view}`);
	if(is_stats){
		stats1.showPanel(0); // Panel 0 = fps
		stats2.showPanel(1); // Panel 1 = ms
		stats3.showPanel(3);
	}
	else{
		stats1.showPanel();
		stats2.showPanel();
		stats3.showPanel();
	}
}

function init_stats(){
	stats1 = new Stats();
	stats1.domElement.style.cssText = 'position:absolute;top:0px;left:0px;';
	document.body.appendChild(stats1.domElement);
	
	stats2 = new Stats();
	stats2.domElement.style.cssText = 'position:absolute;top:0px;left:80px;';
	document.body.appendChild(stats2.domElement);

	stats3 = new Stats();
	stats3.domElement.style.cssText = 'position:absolute;top:0px;left:160px;';
	xPanel = stats3.addPanel( new Stats.Panel( 'tri', '#ff8', '#221' ) );
	document.body.appendChild(stats3.domElement);
	if(localStorage.getItem("stats") === null){
		is_stats = config.stats.enabled_by_default;
	}
	else{
		is_stats = (localStorage.getItem("stats") === "true");
		console.log(`using stats display config from storage : '${is_stats}'`);
	}
	set_stats_view(is_stats);
}

function init(on_load,glTF_filename){

	console.log("three_app> init()");

	init_stats();

	document.getElementById("three_bar").style.width = "0%";

	load_scene(on_load,glTF_filename);

	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'three_param', onParamUpdate, false );
	window.addEventListener( 'keypress', onKeyPress, false );
}

function onKeyPress(e){
	if(String.fromCharCode(event.which) === 's'){
		const new_is_stats = ! is_stats;
		set_stats_view(new_is_stats);
		localStorage.setItem("stats",new_is_stats);
	}
}

function animate() {

	if(is_stats){
		stats1.begin();
		stats2.begin();
	}

	orbit_control.update(); // only required if orbit_control.enableDamping = true, or if orbit_control.autoRotate = true
	renderer.render( scene, camera );
	requestAnimationFrame( animate );

	if(is_stats){
		stats1.end();
		stats2.end();
		xPanel.update( renderer.info.render.triangles , 10000);
	}

}

function sendMeshLists(){
	var mouse_events = [];
	var mqtt_topics_map = {};
	var hue_light_map = {};
	scene.traverse(obj => {
		if((obj.type == "Mesh")&&(obj.userData.mouseEvent == 'true')){
			mouse_events.push(obj);
			//console.log(`three_app> mesh '${obj.name}' with mouseEvent`);
		}
		if((obj.type == "Group")&&(obj.userData.mouseEvent == 'true')){
			mouse_events.push(obj);
			//console.log(`three_app> mesh '${obj.name}' with mouseEvent`);
		}
		if(typeof(obj.userData.mqtt) != "undefined"){
			mqtt_topics_map[obj.userData.mqtt] = obj.name;
		}
		if(typeof(obj.userData.hue) != "undefined"){
			hue_light_map[obj.userData.hue] = obj.name;
		}
	});
	send_custom_event("three_list",{type:"mouseEvent",list:mouse_events});
	send_custom_event("three_list",{type:"mqtt",map:mqtt_topics_map});
	send_custom_event("three_list",{type:"hue",map:hue_light_map});
}

function getCamera(){
	return camera;
}

function getScene(){
	return scene;
}

function getControl(){
	return orbit_control;	
}

function update_light(params){
	const parent = scene.getObjectByName(params.name);
	parent.traverse(obj =>{
		if(["PointLight","SpotLight","DirectionalLight"].includes(obj.type)){
			const maxLight = (typeof(obj.parent.userData.maxLight) == "undefined")?50:obj.parent.userData.maxLight;
			obj.intensity = params.light * maxLight;
			//console.log(`three_app> '${params.name}' has light '${obj.name}' set to ${obj.intensity}`);
		}
	});
}

function update_emissive(params){
	const obj = scene.getObjectByName(params.name);
	if(typeof(obj) != "undefined"){
		if(typeof(obj.material) != "undefined" ){
			obj.material.emissive = new THREE.Color(params.emissive,params.emissive,params.emissive);
		}
		else{
			console.warn(`${params.name} object has no material`);
		}
	}
	else{
		console.warn(`${params.name} does not exist in the scene`);
	}
}

function update_color(params){
	const obj_name = params.name;
	//console.log(`${obj_name} color update`);
	if(typeof(color_params[obj_name]) != "undefined"){
		const val = params.color;
		let weight_col1 = new THREE.Color(parseInt(color_params[obj_name].color1,16));
		let weight_col2 = new THREE.Color(parseInt(color_params[obj_name].color2,16));
		weight_col1.multiplyScalar(1-val);//0 gets full color 1
		weight_col2.multiplyScalar(val);
		let sum_color = new THREE.Color();
		sum_color.addColors(weight_col1,weight_col2);
		const obj = scene.getObjectByName(obj_name);
		obj.material.color = sum_color;
		//console.log(`setting ${obj_name} to color ${sum_color.getHexString()}`);
	}
}

function check_update_anim(params){
	const obj_name = params.name;
	const val = params.val;
	if(typeof(anim_params[obj_name]) == "undefined"){
		console.warn(`no anim params for ${obj_name}`);
		console.log(params);
		return;
	}
	if(anim_params[obj_name].type == "mixer"){
		const param_name = params.param;
		const mixer = anim_params[obj_name][param_name].mixer;
		const duration = anim_params[obj_name][param_name].duration;
		let time = val * duration;
		if(time<0){
			time = 0;
		}
		else if(time >=duration){
			time = duration -  0.00001;//This is a bug in THREE animation as duration value turns back animation to 0 and not clear how to set it at the end of the animation
		}
		mixer.setTime(time);
	}
	else if(anim_params[obj_name].type == "state"){
		const obj = anim_params[obj_name].object;
		set_obj_state(obj,val);
	}
	else if(anim_params[obj_name].type == "color"){
		set_obj_color(anim_params[obj_name],params);
	}
}

function onParamUpdate(e){
	const params = e.detail;
	if(typeof(params.color) != "undefined"){
		update_color(params);
	}
	if(typeof(params.emissive) != "undefined"){
		update_emissive(params);
	}
	if(typeof(params.light) != "undefined"){
		update_light(params);
	}
	//check_update_anim(params);
}

export{
		init,
		animate,
		getCamera,
		getScene,
		getControl
	};
