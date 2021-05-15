/** http://w3c.github.io/html-reference/input.color.html
 * 
 * sent events:
 * - mqtt_message
 * 
 * used events:
 * - mesh_click
 * - three_list
 */

import config from "../config.js";

var client,textBox;

var mqtt_in_use = false;
var mqtt_connected = false;

var mqtt_pending_topics = {};

function init(){

  if(localStorage.getItem("mqtt") === "in_use"){
    mqtt_in_use = true;
  }

  if(!mqtt_in_use){
    console.warn(`mqtt not in use, click on the mosquitto 3d model to init`);
  }
  else{
    mqtt_connect();
  }

  window.addEventListener( 'mesh_click', onMeshClick, false );
	window.addEventListener( 'three_list', onThreeList, false);
}

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

// called when the client connects
function onConnect() {
  localStorage.setItem("mqtt","in_use");
  mqtt_in_use = true;
  mqtt_connected = true;
  // Once a connection has been made, make a subscription and send a message.
  console.log("mqtt_app> onConnect() mqtt running, all good, 3d model will be hidden");
  send_custom_event("three_param",{name:"MQTT",visible:false});
  for(let topic in mqtt_pending_topics){
    client.subscribe(topic);
    console.log(`mqtt_app> - subscribed to ${topic}`);
  }
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
  mqtt_connected = false;
}

// called when a message arrives
function onMessageArrived(message) {
  //console.log(`mqtt_app> ${message.destinationName}	=> ${message.payloadString}`);
  send_custom_event("mqtt_message",{topic:message.destinationName,payload:JSON.parse(message.payloadString)});
}

function mqtt_connect(){
    // Create a client instance
    const client_name = window.location.hostname + '#3d_webapp';
    client = new Paho.MQTT.Client(config.mqtt.host, Number(config.mqtt.port), client_name);
    // set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // connect the client
    client.connect({onSuccess:onConnect});
}


function onMeshClick(event){
  if(event.detail.name == "MQTT"){
      if(mqtt_in_use){
          console.warn(`mqtt already registred, delete local storage to reset configuration`);
      }
      else{
        mqtt_connect();
      }
  }
}

function onThreeList(e){
	if(e.detail.type == "mqtt"){
    const mqtt_topics_map = e.detail.map;
    if(mqtt_connected){
      for(let topic in mqtt_topics_map){
        client.subscribe(topic);
      }
    }
    else{
      mqtt_pending_topics = mqtt_topics_map;
    }
	}
}

//----------------------------------------------------------------------------------
//example usage :  client.send("esp/curvy/panel",'{"action":"off"}');

export{init}
