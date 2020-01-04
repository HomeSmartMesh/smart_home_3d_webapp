/**
 * https://github.com/blargoner/jshue
 * 
 * sent events :
 * - hue_all_lights
 * - hue_light_state
 * 
 * used events :
 * - mesh_click
 * 
 */
let hue = jsHue();
let user;
let lights;
let groups;
let light_ids;
let group_ids;
let hue_available = false;
let hue_registred = false;

function init(){

    if (localStorage.getItem("username") === null){
        console.warn(`hue_app> hue not registred, click on hue gateway to start`);
    }
    else{
        console.log(`hue_app> init() hue registred`);
        hue_registred = true;
    }

    if(hue_registred){
        discover();
    }
            
    window.addEventListener( 'mesh_click', onMeshClick, false );

}

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function get_lights(){
    console.log("hue_app> get_lights()")
    user.getLights().then(data => {
        console.log("hue_app> getLights response");
        lights = data;
        hue_available = true;
        send_custom_event('hue_all_lights',lights);
        light_ids = {};
        for (const [light_id,light] of Object.entries(lights)) {
            light_ids[light.name] = light_id;
        }
    });
}

function get_groups(){
    console.log("hue_app> get_groups()")
    user.getGroups().then(data => {
        console.log("hue_app> getGroups response");
        groups = data;
        group_ids = {};
        for (const [group_id,group] of Object.entries(groups)) {
            group_ids[group.name] = group_id;
        }
    });
}

function create_user(bridge_ip){
    let bridge = hue.bridge(bridge_ip);
    //check connection
    let hue_user_identifier = window.location.hostname + '#3d_webapp';
    bridge.createUser(hue_user_identifier).then(data => {
        console.log(data);
        if(typeof(data[0].success) != "undefined"){
            let username = data[0].success.username;
            console.log('New username:', username);
            localStorage.setItem("username",username);
            user = bridge.user(username);
            hue_registred = true;
            get_lights();
        }
        else if(typeof(data[0].error) != "undefined"){
            console.error(data[0].error);
        }
    });
}

function discover(){
    hue.discover().then(bridges => {
        if(bridges.length === 0) {
            console.log('No bridges found. :(');
        }
        else if(bridges.length == 1){
            let bridge_ip = bridges[0].internalipaddress;
            if (localStorage.getItem("username") === null) {
                alert("First time usage, creating user, make sure the hue gateway button is pressed to authorise");
                console.log(`using bridge at ip (${bridge_ip})`);
                create_user(bridge_ip);
                //create_server_bound_user(bridge_ip);
            }
            else{
                let username = localStorage.getItem("username");
                console.log(`using username from browser's local storage`);
                let bridge = hue.bridge(bridge_ip);
                user = bridge.user(username);
                hue_registred = true;
                get_lights();
                get_groups();
            }
        }
        else{
            bridges.forEach(b => console.log('Bridge found at IP address %s.', b.internalipaddress));
            console.error(`${bridges.length} bridges found - not supported`);
        }
    }).catch(e => console.log('Error finding bridges', e));
}

function hueLightClick(name,hue_name){
    console.log(`hue_app> Mesh Light click on '${name}' with hue = '${hue_name}'`);
    if(!hue_available){
        console.warn(`hue not available`);
        return;
    }
    var l_id = light_ids[hue_name];
    user.getLight(l_id).then(data => {
        if(typeof(data[0]) != "undefined"){
            console.warn(`hue_app> hue light '${hue_name}' unreachable`);
            console.warn(data[0].error);
            send_custom_event("hue_light_state",{name:hue_name,reach:false});
        }
        else if(data.state.reachable == true) {
            const light_new_state = !data.state.on;
            user.setLightState(l_id, { on: light_new_state }).then(data => {
                send_custom_event("hue_light_state",{name:hue_name,on:light_new_state});
                console.log(`hue_app> set hue light '${hue_name}' to ${light_new_state}`);
            });
        }
    });
}

function hueLightGroupClick(name,hue_name){
    console.log(`hue_app> Mesh Light Group click on '${name}' with hue = '${hue_name}'`);
    if(!hue_available){
        console.warn(`hue not available`);
        return;
    }
    const l_id = group_ids[hue_name];
    user.getGroup(l_id).then(data => {
        if(typeof(data[0]) != "undefined"){
            console.warn(`hue_app> hue group '${hue_name}' unreachable`);
            console.warn(data[0].error);
            //send_custom_event("hue_light_state",{name:hue_name,reach:false});
        }
        else{
            let group_new_state;
            if(data.state.any_on == true){
                group_new_state = false;
            }
            else{
                group_new_state = true;
            }
            user.setGroupState(l_id, { on: group_new_state }).then(data => {
                console.log(`hue_app> set hue group '${hue_name}' to ${group_new_state}`);
                get_lights();
            });
        }
    });
}

function onMeshClick(event){
    const name = event.detail.name;
    const hue_name = event.detail.userData.hue;
    if(typeof(hue_name) != "undefined"){
        const obj_type = event.detail.userData.type;
        if(typeof(obj_type) != "undefined"){
            if(obj_type == "lightgroup"){
                hueLightGroupClick(name,hue_name);
            }
        }
        else{
            hueLightClick(name,hue_name);
        }
    }
    
    if((event.detail.name == "Hue Mesh_0") || (event.detail.name == "Hue Mesh_1")){
        if(hue_registred){
            console.warn(`hue already registred, delete local storage to reset registration`);
        }
        else{
            discover();
        }
	}
}
//----------------------------------------------------------------------------------
export{init};
