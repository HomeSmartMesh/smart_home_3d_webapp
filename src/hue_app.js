/**
 * https://github.com/blargoner/jshue
 * 
 * sent events :
 * - hue_all_lights
 * - hue_light_state
 * - hue_group_state
 * 
 * used events :
 * - mesh_click
 * - mesh_control
 * 
 */
import * as control from "./three_control.js";
import config from "../config.js";

let hue = jsHue();
let user;
let lights;
let groups;
let light_ids;
let group_ids;
let hue_available = false;
let hue_registred = false;
let dimm = {
    active:false
};

async function init(){

    try {
            let response = await fetch("../user.json")
            let secret = await response.json()
            localStorage.setItem("username",secret.username);
            hue_registred = true;
        } catch(err) {
            if (localStorage.getItem("username") === null){
                console.warn(`hue_app> hue not registred, click on hue gateway to start`);
            }
            else{
                console.log(`hue_app> init() hue registred`);
                hue_registred = true;
            }
        }

    if(hue_registred){
        //discover();
        start_using_bridge(config.hue.ip);
    }
            
    window.addEventListener( 'mesh_click', onMeshClick, false );
    window.addEventListener( 'mesh_control', onMeshControl, false );
    window.addEventListener( 'mesh_hold', onMeshHold, false );

}

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function get_hue_type(userData){
    const hue_name = userData.hue;
    let res = "";
    if(typeof(hue_name) != "undefined"){
        const obj_type = event.detail.userData.type;
        if(typeof(obj_type) != "undefined"){
            if(obj_type == "lightgroup"){
                res = "lightgroup";
            }
        }
        else{
            res = "light";
        }
    }
    return res;
}

function check_light_data(hue_name,data){
    if((Array.isArray(data)) && (data.length > 0)){
        console.warn(`hue_app> hue light '${hue_name}' unreachable`);
        console.warn(data[0].error);
        send_custom_event("hue_light_state",{name:hue_name,state:{reachable:false}});
        return false;
    }
    else if(typeof(data.state.reachable) != "undefined"){
        return data.state.reachable;
    }
    else if(Array.isArray(data.lights)){
        return true;
    }
}
function onMeshHold(event){
    const hue_type = get_hue_type(event.detail.userData);
    if(hue_type === "light"){
        const hue_name = event.detail.userData.hue;
        user.getLight(light_ids[hue_name]).then(data => {
            if(check_light_data(hue_name,data)){
                let initial_val = data.state.bri / 255.0;
                if(data.state.on == false){
                    initial_val = 0;
                }
                control.run(event.detail,initial_val);
            }
        });
    }
    else if(hue_type === "lightgroup"){
        const hue_name = event.detail.userData.hue;
        user.getGroup(group_ids[hue_name]).then(data => {
            if(check_light_data(hue_name,data)){
                let initial_val = data.action.bri / 255.0;
                if(data.state.any_on == false){
                    initial_val = 0;
                }
                control.run(event.detail,initial_val);
            }
        });
    }
}

function get_lights(){
    if(!hue_registred){
        return;
    }
    //console.log("hue_app> get_lights()")
    user.getLights().then(data => {
        //console.log("hue_app> getLights response");
        if(!hue_available){
            //first time execution only, after success of first call
            //only way to keep lights in sync when used from outside this app
            setInterval(get_lights,config.hue.poll_interval_ms);
            hue_available = true;
            console.log("hue_app> get_lights(), hue available, all good, 3d model will be hidden");
            send_custom_event("three_param",{name:"Hue",visible:false});
        }
        if(JSON.stringify(data) != JSON.stringify(lights)){
            lights = data;
            send_custom_event('hue_all_lights',lights);
            light_ids = {};
            for (const [light_id,light] of Object.entries(lights)) {
                light_ids[light.name] = light_id;
            }
        }
    });
}

function get_groups(){
    //console.log("hue_app> get_groups()");
    user.getGroups().then(data => {
        //console.log("hue_app> getGroups response");
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

function start_using_bridge(bridge_ip){
    let username = localStorage.getItem("username");
    console.log(`using username from browser's local storage`);
    let bridge = hue.bridge(bridge_ip);
    user = bridge.user(username);
    hue_registred = true;
    get_lights();
    get_groups();
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
                start_using_bridge(bridge_ip);
            }
        }
        else{
            bridges.forEach(b => console.log('Bridge found at IP address %s.', b.internalipaddress));
            console.error(`${bridges.length} bridges found - not supported`);
        }
    }).catch(e => console.log('Error finding bridges', e));
}

function hueLightClick(hue_name){
    console.log(`hue_app> Mesh Light click on hue '${hue_name}'`);
    if(!hue_available){
        console.warn(`hue not available`);
        return;
    }
    const l_id = light_ids[hue_name];
    user.getLight(l_id).then(data => {
        if(check_light_data(hue_name,data)){
            const light_new_state = !data.state.on;
            const old_bri_val = data.state.bri;
            user.setLightState(l_id, { on: light_new_state }).then(data => {
                send_custom_event("hue_light_state",{name:hue_name,state:{on:light_new_state,bri:old_bri_val}});
                console.log(`hue_app> set hue light '${hue_name}' to ${light_new_state}`);
            });
        }
    });
}

function hueLightGroupClick(hue_name){
    console.log(`hue_app> Mesh Light Group click on hue = '${hue_name}'`);
    if(!hue_available){
        console.warn(`hue not available`);
        return;
    }
    const l_id = group_ids[hue_name];
    user.getGroup(l_id).then(data => {
        console.log(data);
        if(check_light_data(hue_name,data)){
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
    const hue_type = get_hue_type(event.detail.userData);
    if(hue_type === "light"){
        const hue_name = event.detail.userData.hue;
        hueLightClick(hue_name);
    }else if(hue_type === "lightgroup"){
        const hue_name = event.detail.userData.hue;
        hueLightGroupClick(hue_name);
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

function extract_hue_params(data,init={}){
    let resData = init;
    data.forEach(info => {
        if(typeof(info.success) != "undefined"){
            for(let topic in info.success){
                const res_array = topic.split('/');
                const param = res_array[res_array.length-1];
                resData[param] = info.success[topic];
                //console.log(`topic ${param} = ${resData[param]}`);
            }
        }
    });
    return resData;
}

function hueLightDimm(){
    const name = dimm["name"];
    const hue_name = dimm["hume_name"];
    const val = dimm["val"];

    var l_id = light_ids[hue_name];
    const light_new_state = (val==0)?false:true;
    const bri = Math.trunc(val*255.0);
    const start_time = Date.now();
    user.setLightState(l_id, {on:light_new_state, bri:bri }).then(data => {
        const resData = extract_hue_params(data);
        send_custom_event("hue_light_state",{name:hue_name,state:resData});
        console.log(`hue_app> ${dimm.active?"":"(final)"} set light '${hue_name}' to ${light_new_state} at brightness ${bri} in ${Date.now()-start_time} ms`);
    });
    //clear request executed from the timer itself not to skipp a last pending call
    if(!dimm.active){
        clearInterval(dimm.timer);
    }
}

function hueLightDimm_request(name,hue_name,val){
    dimm["name"] = name;
    dimm["hume_name"] = hue_name;
    dimm["val"] = val;
    if(!dimm.active){
        dimm.active = true;
        dimm["timer"] = setInterval(hueLightDimm,config.hue.slider_timer_ms);
    }
}

function hueLightGroupDimm(){
    const name = dimm["name"];
    const hue_name = dimm["hume_name"];
    const val = dimm["val"];

    var l_id = group_ids[hue_name];
    const light_new_state = (val==0)?false:true;
    const bri = Math.trunc(val*255);
    user.setGroupState(l_id, { on:light_new_state, bri:bri }).then(data => {
        const resData = extract_hue_params(data,{name:hue_name});
        send_custom_event("hue_group_state",resData);
        console.log(`hue_app> ${dimm.active?"":"(final)"} set hue group '${hue_name}' to ${light_new_state} at brightness ${bri}`);
    });
    //clear request executed from the timer itself not to skipp a last pending call
    if(!dimm.active){
        clearInterval(dimm.timer);
        get_lights();
    }
}

function hueLightGroupDimm_request(name,hue_name,val){
    dimm["name"] = name;
    dimm["hume_name"] = hue_name;
    dimm["val"] = val;
    if(!dimm.active){
        dimm.active = true;
        dimm["timer"] = setInterval(hueLightGroupDimm,config.hue.slider_timer_ms);
    }
}

function onMeshControl(event){
    const hue_name = event.detail.userData.hue;
    const hue_type = get_hue_type(event.detail.userData);
    if(hue_type != ""){
        //console.log(`hue_app> hue ${hue_type} Dimm on '${hue_name}'`);
        if(!hue_available){
            console.warn(`hue not available`);
            return;
        }
        if(hue_type === "light"){
            const name = event.detail.name;
            hueLightDimm_request(name,hue_name,event.detail.val);
        }
        else if(hue_type === "lightgroup"){
            const name = event.detail.name;
            hueLightGroupDimm_request(name,hue_name,event.detail.val);
        }
        //let the timer stop itself after handling next and last value
        if(typeof(event.detail.mouseUp) != "undefined"){
            dimm.active = false;
        }
    }
}
//----------------------------------------------------------------------------------
export{init};
