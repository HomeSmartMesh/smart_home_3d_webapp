import * as THREE from "../../jsm/three/three.module.js";
import { OrbitControls } from "../../jsm/three/OrbitControls.js";
import { GLTFLoader } from "../../jsm/three/GLTFLoader.js";

var camera, scene, renderer;
var orbit_control;

var anim_params = {};
var color_params = {};
var user_hue_to_name = {};

function create_camera(){
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	camera = new THREE.PerspectiveCamera( 45, w / h, 0.01, 50 );
	const imported_camera = scene.getObjectByName("Camera");
	//camera.position = imported_camera.position;
	//camera.rotation = imported_camera.rotation;
	camera.position.y = 5;	camera.position.x = 0;	camera.position.z = 5;
	return camera;
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

	orbit_control.minDistance = 0.10;
	orbit_control.maxDistance = 30;

	orbit_control.minPolarAngle =  10 * Math.PI / 180;
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
			console.log(`${obj.name} can mutate color from ${obj.material.color.getHexString()} to ${obj.userData.mutateColor}`);
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
	var loader = new GLTFLoader();
	loader.load(gltf_filename,
		// called when the resource is loaded
		gltf => {
			scene = gltf.scene;
			init_custom_visibility(scene);
			init_custom_animations(gltf,scene);
			init_custom_colors(scene);
			init_custom_names(scene);
			init_shadows(scene);
			add_ambient_light();
			camera = create_camera(scene);
			renderer = create_renderer();
			orbit_control = add_view_orbit(camera,renderer);
			user_on_load();
			//setParam("Axis","pull",4);
		},
		// called while loading is progressing
		xhr => console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ),
		// called when loading has errors
		error => console.log( 'An error happened',error )
	);
}

function init(on_load,glTF_filename){
	console.log("three_app> init()");

	load_scene(on_load,glTF_filename);

	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'three_param', onParamUpdate, false );
}

function animate() {
	requestAnimationFrame( animate );

	orbit_control.update(); // only required if orbit_control.enableDamping = true, or if orbit_control.autoRotate = true

	renderer.render( scene, camera );
}

function getMouseMeshList(){
	var mesh_list = [];
	scene.traverse(obj => {
		if((obj.type == "Mesh")&&(obj.userData.mouseEvent == 'true')){
			mesh_list.push(obj);
			//console.log(`three_app> mesh '${obj.name}' with mouseEvent`);
		}
	});
	return mesh_list;
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
		getMouseMeshList,
		getCamera,
		getScene,
		getControl
	};
