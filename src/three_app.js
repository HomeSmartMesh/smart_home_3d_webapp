/**
 * sent events:
 * - three_list
 * 
 * used events:
 * - resize
 * - three_param
 * - keypress
 * - mesh_mouse_down
 * - mesh_touch_start
 * - mesh_mouse_up
 * 
 */

import * as THREE 			from "./../jsm/three/three.module.js";
import { OrbitControls } 	from "./../jsm/three/OrbitControls.js";
import { GLTFLoader } 		from "./../jsm/three/GLTFLoader.js";
import { EffectComposer } 	from './../jsm/three/postprocessing/EffectComposer.js';
import { RenderPass } 		from './../jsm/three/postprocessing/RenderPass.js';
import { OutlinePass } 		from './../jsm/three/postprocessing/OutlinePass.js';
import { ShaderPass } 		from './../jsm/three/postprocessing/ShaderPass.js';
import { FXAAShader } 		from './../jsm/three/shaders/FXAAShader.js';
import { GUI } 				from './../jsm/dat.gui.module.js';
import { kelvinToRGB }		from './../jsm/kelvin2rgb.js';

import config from "./../config.js";

var camera, scene, renderer;
var composer,outlinePass, effectFXAA;
var orbit_control;

var anim_params = {};
var color_params = {};
var user_hue_to_name = {};

var is_stats;
var stats1,stats2,stats3;
var xPanel;

function defined(varName){
	return (typeof(varName) != "undefined")
}

function init(on_load,glTF_filename){

	console.log("three_app> init()");

	init_stats();

	load_scene(on_load,glTF_filename);

	//offered services
	window.addEventListener( 'three_param', onParamUpdate, false );

	//used services
	window.addEventListener( 'resize', onWindowResize, false );
	window.addEventListener( 'keypress', onKeyPress, false );
	window.addEventListener( 'mesh_mouse_down', onMeshMouseDown, false );
	window.addEventListener( 'mesh_touch_start', onMeshMouseDown, false );
	window.addEventListener( 'mesh_mouse_up',  onMeshMouseUp, false );
}

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function create_camera(gltf){
	let res_cam;
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	const scene_cam = gltf.scene.getObjectByName("MainCamera");
	if(typeof(scene_cam) != "undefined"){
		const gltf_cam = gltf.cameras[0];
		if(gltf_cam.type == "PerspectiveCamera"){
			//issue assigning the camera does not succeed, so mapping params on creation
			res_cam = new THREE.PerspectiveCamera( 45, w / h, gltf_cam.near, gltf_cam.far );
			console.log(`three_app> create_camera() '${res_cam.name}' with fov: ${res_cam.fov}`);
			res_cam.position.copy(scene_cam.position);
			res_cam.rotation.copy(scene_cam.rotation);
		}
	}

	if(typeof(res_cam) == "undefined"){
		res_cam = new THREE.PerspectiveCamera( 45, w / h, 0.01, 50 );
		console.log(`three_app> create_camera() Fallback camera`);
		//console.log(cam.position);
		res_cam.position.set(0,5,5);
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

function add_ambient_light(){

	var hlight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 2 );
	scene.add( hlight );

	//var rectLight = new THREE.RectAreaLight( 0xffffff, 10,  1, 1 );
	//rectLight.position.set( 0, 5, 0 );
	//rectLight.lookAt( 0, 0, 0 );
	//scene.add( rectLight )
	
	//rectLightHelper = new THREE.RectAreaLightHelper( rectLight );
	//rectLight.add( rectLightHelper );
	//var light = new THREE.AmbientLight( 0xB0B0B0 );
	//scene.add( light );
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

function apply_toon_material(scene){

	let alpha = 1;
	let beta = 0.5;
	let gamma = 1;
	let diffuseColor = new THREE.Color().setHSL( alpha, 0.5, gamma * 0.5 + 0.1 ).multiplyScalar( 1 - beta * 0.2 );
	let specularColor = new THREE.Color( beta * 0.2, beta * 0.2, beta * 0.2 );
	let specularShininess = Math.pow( 2, alpha * 10 );
	scene.traverse(obj =>{
		if(typeof(obj.userData.hue) != "undefined"){
			obj.material = new THREE.MeshToonMaterial( {
				bumpScale: 1,
				color: obj.material.color,
				specular: specularColor,
				shininess: specularShininess,
			} );
			//console.log(`${obj.name} can mutate color from ${obj.material.color.getHexString()} to ${obj.userData.mutateColor}`);
		}
	});
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
				directionalLight.position.set( 1, 1, 1 ).normalize();
	//scene.add( directionalLight );
}

function init_shadows(scene){
	scene.traverse(obj =>{
		if(obj.type == "Mesh"){
			if(obj.userData.type == "wall"){
				obj.castShadow = true;
			}
			else if(typeof(obj.userData.floor) != "undefined"){
				obj.receiveShadow = true;
			}
			else if(typeof(obj.userData.hue) != "undefined"){
				obj.receiveShadow = true;
			}
		}
		else if(obj.type == "PointLight"){
			obj.castShadow = true;
		}else if(obj.type == "SpotLight"){
			obj.castShadow = false;
		}else if(obj.type == "DirectionalLight"){
			obj.castShadow = true;
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

function init_effects_gui(outlinePass){
	let params = {
		edgeStrength: 4.0,
		edgeGlow: 0.5,
		edgeThickness: 1.0,
		pulsePeriod: 0,
		rotate: false,
		usePatternTexture: false
	};

	var gui = new GUI( { width: 300 } );
	gui.add( params, 'edgeStrength', 0.01, 10 ).onChange(  value => {outlinePass.edgeStrength = Number( value );} );
	gui.add( params, 'edgeGlow', 0.0, 1 ).onChange( value => {outlinePass.edgeGlow = Number( value );} );
	gui.add( params, 'edgeThickness', 1, 4 ).onChange( value => {outlinePass.edgeThickness = Number( value );} );
	gui.add( params, 'pulsePeriod', 0.0, 5 ).onChange( value => {outlinePass.pulsePeriod = Number( value );} );
	var Configuration = function () {
		this.visibleEdgeColor = config.effects.outline.visibleEdgeColor;
		this.hiddenEdgeColor = config.effects.outline.hiddenEdgeColor;
	};
	var conf = new Configuration();
	gui.addColor( conf, 'visibleEdgeColor' ).onChange( value => {outlinePass.visibleEdgeColor.set( value );} );
	gui.addColor( conf, 'hiddenEdgeColor' ).onChange( value => {outlinePass.hiddenEdgeColor.set( value );} );
}

function init_effects(scene,renderer,camera){
	composer = new EffectComposer( renderer );

	var renderPass = new RenderPass( scene, camera );
	composer.addPass( renderPass );

	outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );


	outlinePass.selectedObjects = [];
	outlinePass.visibleEdgeColor.set(config.effects.outline.visibleEdgeColor);
	outlinePass.hiddenEdgeColor.set(config.effects.outline.hiddenEdgeColor);
	composer.addPass( outlinePass );

	if(config.effects.outline.show_gui){
		init_effects_gui(outlinePass);
	}

	//anti aliasing
	effectFXAA = new ShaderPass( FXAAShader );
	effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );
	composer.addPass( effectFXAA );

}

function self_on_load(scene,camera){
	init_custom_visibility(scene);
	init_custom_colors(scene);
	if(config.effects.lights_toon_material){
		apply_toon_material(scene);
	}
	init_custom_names(scene);
	init_shadows(scene);
	add_ambient_light();
	renderer = create_renderer();
	if(config.effects.outline.enabled){
		init_effects(scene,renderer,camera);
	}
	orbit_control = add_view_orbit(camera,renderer);
	scene.background = new THREE.Color(parseInt(config.scene.background,16));
}

function load_scene(user_on_load,gltf_filename){
	var loader = new GLTFLoader();
	loader.load(gltf_filename,
		// called when the resource is loaded
		gltf => {
			scene = gltf.scene;
			camera = create_camera(gltf);
			init_custom_animations(gltf,scene);
			self_on_load(scene,camera);
			user_on_load();
			//after the user on load so that the user can make use of it
			sendMeshLists();
			animate();
		},
		// called while loading is progressing
		xhr => {
			var elem = document.getElementById("myBar");
			const percent = xhr.loaded / xhr.total * 100;
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
		if(!config.effects.outline.enabled){//otherwise wrong number of triangles shown
			stats3.showPanel(3);
		}
		else{
			stats3.showPanel();
		}
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

function onKeyPress(e){
	if(String.fromCharCode(event.which) === 's'){
		const new_is_stats = ! is_stats;
		set_stats_view(new_is_stats);
		localStorage.setItem("stats",new_is_stats);
	}
}

function onWindowResize() {
	var container = document.getElementById('viewer');
	var w = container.clientWidth;
	var h = container.clientHeight;
	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );
	if(config.effects.outline.enabled){
		composer.setSize( w, h );
	}
}

function animate() {

	if(is_stats){
		stats1.begin();
		stats2.begin();
	}

	orbit_control.update(); // only required if orbit_control.enableDamping = true, or if orbit_control.autoRotate = true
	if(config.effects.outline.enabled){
		composer.render( scene, camera );
	}
	else{
		renderer.render(scene, camera);
	}

	if(is_stats){
		stats1.end();
		stats2.end();
		if(!config.effects.outline.enabled){//otherwise wrong number of triangles shown
			xPanel.update( renderer.info.render.triangles , 10000);
		}
	}

	requestAnimationFrame( animate );

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
			const maxLight = (typeof(parent.userData.maxLight) == "undefined")?50:parent.userData.maxLight;
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
	const obj = scene.getObjectByName(params.name);
	obj.material.color = new THREE.Color(params.color);
}

function update_color_temperature(params){
	const obj = scene.getObjectByName(params.name);
	const col = kelvinToRGB(1000000.0/params.color_temperature);
	obj.material.color = new THREE.Color(col.r/255.0,col.g/255.0,col.b/255.0);
}

function update_color_lightness(params){
	const obj = scene.getObjectByName(params.name);
	let mat_hsl={};obj.material.color.getHSL(mat_hsl);
	const lightness = params.color_lightness * 0.6 + 0.2;
	obj.material.color.setHSL(mat_hsl.h,mat_hsl.s,lightness);
	//console.log(`light>>>${obj.name} ${mat_hsl.h.toFixed(2)} ${mat_hsl.s.toFixed(2)} ${params.color_lightness.toFixed(2)}`);
}

function update_color_hsl(params){
	const obj = scene.getObjectByName(params.name);
	obj.material.color.setHSL(params.h,params.s,params.l);
}

function update_color_ratio(params){
	const obj_name = params.name;
	console.log(`${obj_name} color update`);
	if(typeof(color_params[obj_name]) != "undefined"){
		const val = params.color_ratio;
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

function update_outline(params){
	if(!config.effects.outline.enabled){
		return;
	}
	if(params.outline){
		const obj = scene.getObjectByName(params.name);
		if(obj.parent.type == "Mesh"){
			outlinePass.selectedObjects.push(obj.parent);
			//console.log(`${obj.parent.name} parent of ${obj.name} is a mesh`);
		}
		else{
			outlinePass.selectedObjects.push(obj);
		}
	}
	else{
		const obj_id = outlinePass.selectedObjects.findIndex(obj => {
			return (obj.name == params.name);
		});
		if(obj_id != -1){
			outlinePass.selectedObjects.splice(obj_id,1);
			//TODO: if no more siblings in the list, then remove the parent
		}
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
}

function onParamUpdate(e){
	const params = e.detail;
	if(typeof(params.color_ratio) != "undefined"){
		update_color_ratio(params);
	}
	if(typeof(params.color_temperature) != "undefined"){
		update_color_temperature(params);
	}
	if(typeof(params.color_lightness) != "undefined"){
		update_color_lightness(params);
	}
	if(typeof(params.h) != "undefined"){
		update_color_hsl(params);
	}
	if(typeof(params.emissive) != "undefined"){
		update_emissive(params);
	}
	if(typeof(params.light) != "undefined"){
		update_light(params);
	}
	if(typeof(params.outline) != "undefined"){
		update_outline(params);
	}
	if(typeof(params.visible) != "undefined"){
		if(defined(scene)){
			scene.getObjectByName(params.name).visible = params.visible;
		}
	}
	if(typeof(params.position) != "undefined"){
		if(defined(scene)){
			const p = params.position;
			scene.getObjectByName(params.name).position.set(
				//-p.x+6,0,1
				-p.x+6,1-p.z,p.y
				);
		}
	}
	//check_update_anim(params);
}

function onMeshMouseDown(e){
	orbit_control.enabled = false;
}

function onMeshMouseUp(e){
	orbit_control.enabled = true;
}

export{
		init,
		animate,
		getCamera,
		getScene,
		getControl
	};
