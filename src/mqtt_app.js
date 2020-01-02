//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

var mqtt_in_use = false;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

// called when the client connects
function onConnect() {
  localStorage.setItem("mqtt","in_use");
  mqtt_in_use = true;
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("lzig/office heat");
  client.subscribe("lzig/bathroom heat");
  client.subscribe("lzig/living heat");
  client.subscribe("lzig/bedroom heat");
  client.subscribe("lzig/kitchen heat");
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
}

// called when a message arrives
function onMessageArrived(message) {
  //console.log(`mqtt_app> ${message.destinationName}	=> ${message.payloadString}`);
  send_custom_event("mqtt_message",{topic:message.destinationName,payload:JSON.parse(message.payloadString)});
}

function mqtt_connect(){
    // Create a client instance
    const client_name = window.location.hostname + '#3d_webapp';
    client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), client_name);
    // set callback handlers
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    // connect the client
    client.connect({onSuccess:onConnect});
}

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

//----------------------------------------------------------------------------------
//example usage :  client.send("esp/curvy/panel",'{"action":"off"}');

export{init}
