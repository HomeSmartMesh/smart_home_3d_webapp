
var hue = jsHue();
var user;
var lights;
var light_ids;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

function get_lights_state(){
    console.log("hue_app> get_lights_state()")

    user.getLights().then(data => {
        console.log("getLights response");
        lights = data;
        send_custom_event('hue_lights_on_startup',lights);
        light_ids = {};
        for (const [light_id,light] of Object.entries(lights)) {
            light_ids[light.name] = light_id;
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
            get_lights_state();
        }
        else if(typeof(data[0].error) != "undefined"){
            console.error(data[0].error);
        }
    });
}

function init(){
    if (typeof(Storage) == "undefined") {
        console.error("local storage is not supported");
        return;
    }
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
                get_lights_state();
            }
        }
        else{
            bridges.forEach(b => console.log('Bridge found at IP address %s.', b.internalipaddress));
            console.error(`${bridges.length} bridges found - not supported`);
        }
    }).catch(e => console.log('Error finding bridges', e));
            
    window.addEventListener( 'mesh_mouse_down', onMeshMouseDown, false );
    window.addEventListener( 'mesh_touch_start', onMeshMouseDown, false );

}


function onMeshMouseDown(event){
    if(event.detail.type == "light"){
        console.log(`hue_app> Mesh Light Mouse Down Event on '${event.detail.name}'`);
        if(event.detail.type == "light"){
            if(typeof(light_ids) == "undefined"){
                console.log(`hue not authorised or or has no lights`);
                return;
            }
            var l_id = light_ids[event.detail.hue];
            user.getLight(l_id).then(data => {
                if(data.state.reachable == true) {
                    var light_set_state;
                    if(data.state.on == true){
                        light_set_state = false;
                    }
                    else{
                        light_set_state = true;
                    }
                    user.setLightState(l_id, { on: light_set_state }).then(data => {
                        console.log(`hue_app> set hue light '${event.detail.hue}' to ${light_set_state}`);
                    });
                    send_custom_event("hue_light_state",{name:event.detail.name,on:light_set_state});
                }
            });
        }
        else if(e.detail.type == "lightgroup"){
            //
        }
            
    }
}
//----------------------------------------------------------------------------------
export{init,create_user};
