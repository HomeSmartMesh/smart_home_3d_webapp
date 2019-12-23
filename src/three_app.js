import * as THREE from "../jsm/three/three.module.js";
import { OrbitControls } from "../jsm/three/OrbitControls.js";
import { GLTFLoader } from "../jsm/three/GLTFLoader.js";

var camera, scene, renderer;
var controls;

var anim_params = {};
var mqtt_map = {};

function setBulb_MeshState(light_mesh,state_name,value){
	if(state_name == "init"){
		if(value){
			var emit = new THREE.Color( 0, 0.2, 0.2 );
		}
		else{
			var emit = new THREE.Color( 0, 0, 0 );
		}
	}
	else if(state_name == "switch"){
		if(value){
			var emit = new THREE.Color( 0, 0.5, 0 );
		}
		else{
			var emit = new THREE.Color( 0, 0, 0 );
		}
	}
	else{
		if(state_name == "highlight"){
			if(value){
				var emit = new THREE.Color( 1, 0, 0 );
			}
			else{
				var emit = new THREE.Color( 0, 0, 0 );
			}
		}
		else{
			var emit = light_mesh.material.emissive;
		}
	}
		var material = new THREE.MeshPhongMaterial( {
			color: light_mesh.material.color,
			emissive: emit,
			side: light_mesh.material.side,
			flatShading: light_mesh.material.flatShading
		});
		light_mesh.material = material;
		//console.log(`${name} has emissive at ${emit.getHexString()}`);
}

function setBulb_LightState(light,state_name,value){
	if(value){
		//TODO custom Property for light does not appear on SpotLight object and child is Object3D without userData
		light.intensity = 10;
	}
	else{
		light.intensity = 0;
	}
}

function getLightState(name){
	const light_mesh = scene.getObjectByName(name);
	const light = light_mesh.children[0].children[0];
	if(light.intensity > 0){
		return true;
	}
	else{
		return false;
	}
}

function setBulbState(name,state_name,value){
	const light_mesh = scene.getObjectByName(name);
	setBulb_MeshState(light_mesh,state_name,value);

	if(state_name == "switch"){
			if(light_mesh.children[0].children[0] != "undefined"){
			const light = light_mesh.children[0].children[0];
			setBulb_LightState(light,state_name,value);
		}
		else{
			console.log(`light mesh ${name} has no grand child`);
		}
	}
}

/**
 * 
 * @param {*} name : the light group name
 * @return true, if any of the lights are on, otherwise false
 */
function getLightGroupState(name){
	const light_group_mesh = scene.getObjectByName(name);
	for(let mesh_id in light_group_mesh.children){
		const mesh = light_group_mesh.children[mesh_id];
		if(mesh.userData.type == "light"){
			if(getLightState(mesh.name)){
				return true;
			}
		}
	};
	return false;
}

function setBulbGroupState(name,state_name,value){
	const light_group_mesh = scene.getObjectByName(name);
	setBulb_MeshState(light_group_mesh,state_name,value);
	if(state_name == "switch"){
			setBulb_LightState(light_group_mesh,state_name,value);
	}

	light_group_mesh.children.forEach(mesh =>{
		if(mesh.userData.type == "light"){
			setBulbState(mesh.name,state_name,value);
		}
	});
}

function create_camera(){
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	camera = new THREE.PerspectiveCamera( 45, w / h, 0.01, 50 );
	camera.position.y = 5;
	camera.position.x = 0;
	camera.position.z = 5;
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
	controls = new OrbitControls( camera, renderer.domElement );

	//controls.addEventListener( 'change', render ); // call this only in static scenes (i.e., if there is no animation loop)

	controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 1.5;//0.1:too rolly, 1: smooth, 2 unstable

	controls.screenSpacePanning = false;

	controls.minDistance = 0.10;
	controls.maxDistance = 30;

	controls.minPolarAngle =  10 * Math.PI / 180;
	controls.maxPolarAngle =  80 * Math.PI / 180;

	controls.rotateSpeed = 0.7;
	return controls;
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

	var light = new THREE.PointLight( 0xffffff, 10, 100 );
	light.position.set( 0, 10, 0 );
	scene.add( light );

	var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
	dirLight.position.set( 0, 1.5, 0 );
	dirLight.castShadow = false;

	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;
	var d = 6;
	dirLight.shadow.camera.left = - d;
	dirLight.shadow.camera.right = d;
	dirLight.shadow.camera.top = d;
	dirLight.shadow.camera.bottom = - d;
	dirLight.shadow.camera.far = 7;
	dirLight.shadow.bias = - 0.01;

	//scene.add( dirLight );
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

function apply_custom_visibility(scene){
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

function set_obj_color(anim_obj,target_coeffs){
	let sum_Color = new THREE.Color(0,0,0);
	for(const name in anim_obj.ref_colors){
		const ref_color = anim_obj.ref_colors[name];
		//console.log(`  - ref color of '${name}' (${ref_color.r},${ref_color.g},${ref_color.b}) has coeff : ${target_coeffs[name]}`);
		let part_color = ref_color.clone();
		part_color.multiplyScalar(target_coeffs[name]);
		sum_Color.add(part_color);
	}
	const obj = anim_obj.object
	obj.material.color = sum_Color;
	//console.log(`three_app> set_obj_color() ${obj.name} to (${sum_Color.r},${sum_Color.g},${sum_Color.b})`);
}

function init_obj_color(anim_obj){
	const obj = anim_obj["object"];
	anim_obj.ref_colors = {};
	anim_obj.coeffs = {};
	obj.children.forEach(child =>{
		anim_obj.ref_colors[child.name] = child.material.color;
		anim_obj.coeffs[child.name] = obj.userData[child.name];
		//child.visible = false;
	});
	//obj.children[0].visible = true;
	set_obj_color(anim_obj,anim_obj.coeffs);
}

function apply_custom_view(scene){
	scene.traverse(obj =>{
		if(typeof obj.userData.state != "undefined"){
			console.log(`${obj.name} has ${obj.children.length} states :`);
			set_obj_state(obj,obj.userData.state);
			anim_params[obj.name] = {};
			anim_params[obj.name]["type"] = "state";
			anim_params[obj.name]["object"] = obj;
			anim_params[obj.name]["state"] = obj.userData.state;
		}
		if(typeof obj.userData.colorParams != "undefined"){
			if(obj.userData.colorParams == "true"){
				console.log(`${obj.name} has ${obj.children.length} child colors :`);
				anim_params[obj.name] = {};
				anim_params[obj.name]["type"] = "color";
				anim_params[obj.name]["object"] = obj;
				init_obj_color(anim_params[obj.name]);
			}
		}
	} );
}

function apply_mqtt_map(scene){
	scene.traverse(obj =>{
		if(typeof obj.userData.mqtt != "undefined"){
			console.log(`${obj.name} has mqtt : ${obj.userData.mqtt}`);
			mqtt_map[obj.userData.mqtt] = obj;
		}
	} );
}

function apply_lights_shadows_setup(scene){
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
			obj.intensity = 0;
		}else if(obj.type == "SpotLight"){
			obj.castShadow = false;
			obj.intensity = 0;
		}
	});
}

function back(){

	gltf.animations.forEach(clip =>{

		console.log(`clip '${clip.name}' :`);
		clip.tracks.forEach(track =>{
			console.log(` - KeyframeTrack '${track.name}' with ${track.times.length} times`);
		});
		const obj_mixer = new THREE.AnimationMixer(scene.getObjectByName("Axis"));
		const animAction = obj_mixer.clipAction(clip);
		animAction.play();
		obj_mixer.setTime(2);

	});
}

function apply_param_animations(gltf,scene){
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

function load_scene(user_on_load,gltf_filename){
	var loader = new GLTFLoader();
	loader.load(gltf_filename,
		// called when the resource is loaded
		gltf => {
			scene = gltf.scene;
			apply_custom_visibility(scene);
			apply_param_animations(gltf,scene);
			apply_custom_view(scene);
			apply_mqtt_map(scene);
			apply_lights_shadows_setup(scene);
			add_ambient_light();
			camera = create_camera();
			renderer = create_renderer();
			controls = add_view_orbit(camera,renderer);
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

	controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

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

function onParamUpdate(e){

	const obj_name = e.detail.name;
	if(!(obj_name in anim_params)){
		console.warn(`${obj_name} has no animation paramter`);
		return;
	}
	if(anim_params[obj_name].type == "mixer"){
		const val = e.detail.val;
		const param_name = e.detail.param;
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
		const val = e.detail.val;
		const obj = anim_params[obj_name].object;
		set_obj_state(obj,val);
	}
	else if(anim_params[obj_name].type == "color"){
		set_obj_color(anim_params[obj_name],e.detail);
	}
}

function mqtt_to_object(topic){
	return mqtt_map[topic];
}

export{
		init,
		animate,
		getMouseMeshList,
		setBulbState,
		setBulbGroupState,
		getLightState,
		getLightGroupState,
		getCamera,
		get_obj_states,
		mqtt_to_object
	};
