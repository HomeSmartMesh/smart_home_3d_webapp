import {
	Raycaster,
	Vector2
} from "../jsm/three/three.module.js";


var camera;

var raycaster;
var mouse = {
	"is_inside_object":false,
	"object":""
};

var mesh_list = [];

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function get_mesh_intersect(l_x,l_y){
	const container = document.getElementById('viewer');
	var rect = container.getBoundingClientRect();
	var vect2 = new Vector2();
	vect2.x = ( ( l_x - rect.left ) / rect.width ) * 2 - 1;
	vect2.y = - ( ( l_y - rect.top ) / rect.height ) * 2 + 1;

	let result = "";
	raycaster.setFromCamera( vect2, camera );
	var intersects = raycaster.intersectObjects( mesh_list, true );
	if(intersects.length > 0){
		result = intersects[ 0 ].object;
	}
	return result;
}

function send_custom_object_event(event_name,object_name,obj){
	if(obj.userData.type == "light"){
		send_custom_event(event_name,{ type: obj.userData.type, name: object_name, hue:obj.userData.hue});
	}
	else{
		send_custom_event(event_name,{ type: obj.userData.type, name: object_name});
	}
}


function process_mouse_event(event_name, event){
	event.preventDefault();

	const obj = get_mesh_intersect(event.clientX,event.clientY);

	if ( obj != "") {
		if((mouse.object != "")&&(mouse.object != obj.name)){
			//jump from object to object, exist last one
			send_custom_event("mesh_mouse_enter",{ type: obj.userData.type, name: mouse.object});
			mouse.is_inside_object = false;
		}
		mouse.object = obj.name;
		if(!mouse.is_inside_object){
			send_custom_event("mesh_mouse_enter",{ type: obj.userData.type, name: mouse.object});
		}
		mouse.is_inside_object = true;
		send_custom_object_event(event_name,mouse.object,obj);
	}
	else{
		if(mouse.is_inside_object){
			mouse.is_inside_object = false;
			send_custom_event("mesh_mouse_exit",{ name: mouse.object});
		}
	}
}

function onTouch(event){
	event.preventDefault();
	console.log("onTouch",event);
	if(event.type == "touchstart"){
		var obj = get_mesh_intersect(event.targetTouches[0].clientX,event.targetTouches[0].clientY);
		if ( obj != "") {
			send_custom_object_event("mesh_touch_start",obj.name,obj);
		}
	}
}

function onMouseDown(event){
	process_mouse_event("mesh_mouse_down",event)
}

function onMouseMove(event){
	process_mouse_event("mesh_mouse_move",event)
}


function init(l_camera) {
	camera = l_camera;
	const container = document.getElementById('viewer');
    console.log("three_mouse> init()");

	raycaster = new Raycaster();
	container.addEventListener( 'mousemove', onMouseMove, false );
	container.addEventListener( 'mousedown', onMouseDown, false );
	container.addEventListener( 'touchstart', onTouch, false );
}

function SetMeshList(l_mesh_list){
	mesh_list = l_mesh_list;
	mesh_list.forEach(mesh =>{
		//console.log(`three_mouse> added mouseEvent to mesh ${mesh.name}`);
	})
}

export{init,SetMeshList};
