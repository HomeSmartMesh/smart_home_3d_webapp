//http://w3c.github.io/html-reference/input.color.html

var client,textBox;

var mqtt_host = "10.0.0.42";
var mqtt_port = 1884;

function send_custom_event(event_name,data){
	var event = new CustomEvent(event_name, {detail:data});
	window.dispatchEvent(event);
}

// called when the client connects
function onConnect() {
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

function init(){
  // Create a client instance
  const client_name = window.location.hostname + '#3d_webapp';
  client = new Paho.MQTT.Client(mqtt_host, Number(mqtt_port), client_name);
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});

}

//----------------------------------------------------------------------------------
//example usage :  client.send("esp/curvy/panel",'{"action":"off"}');

export{init}
