// @TODO configure this more formally based on a config file/system variable...
//const SERVER_URL = 'http://localhost:3000/services/oic';


const SERVER_URL = localConfig.SERVER_URL;
const CONSOLE_URL = localConfig.CONSOLE_URL;

window.onload = function () {

     console.log("SERVER_URLis [" + SERVER_URL + "], CONSOLE_URL is [" + CONSOLE_URL + "]");

    // Setting URLs:
    document.getElementById('consoleid').href = "javascript:window.open('" + CONSOLE_URL + "');";


    console.log("SERVER_URL is [" + SERVER_URL + "]");

    if (SERVER_URL == null || SERVER_URL == undefined) {
        alert("SERVER URL is not set properly.");
    }
}


function loadOICInstances() {

    $.getJSON(SERVER_URL, function (result) {
        console.log("Result is [" + JSON.stringify(result) + "]");
        var rowHtml = "";
        for (var i = 0; i < result.services.length; ++i) {

            name = result.services[i].name;
            state = result.services[i].state;
            dbName = result.services[i].dbName;
            dbState = result.services[i].dbState;
            isDisabled = (state.toUpperCase() != "STOPPED" && state.toUpperCase() != "AVAILABLE") || (dbState.toUpperCase() != "STOPPED" &&
                dbState.toUpperCase() != "AVAILABLE") ? "disabled" : "";
            isChecked = state.toUpperCase() == "STARTING" || state.toUpperCase() == "AVAILABLE" || dbState.toUpperCase() == "STARTING" ||
                dbState.toUpperCase() == "AVAILABLE" ? "checked" : "";

            console.log("Setting nEnv" + i + "to [" + name + "]");
            console.log("Setting sEnv" + i + "to [" + state + "]");
            console.log("Setting dbName" + i + "to [" + dbName + "]");
            console.log("Setting dbState" + i + "to [" + dbState + "]");

            // document.getElementById('nEnv' + i).innerText = result.services[i].name;
            // document.getElementById('sEnv' + i).innerText = result.services[i].state;

            if (i == 0) {
                rowHtml = '<tr><th><center>Service Name</center></th><th><center>State</center></th></tr>';
            }

            rowHtml += '<input type="hidden" id="dbName' + i + '" value="' + dbName + '"/><input type="hidden" id="dbState' + i + '" value="' + dbState + '"/><tr><td id="nEnv' + i + '">' + name + '</td><td><center><label class="switch"><input id="s' + i + '" type="checkbox" onchange="changeState(' + i + ');" ' + isDisabled + ' ' + isChecked + '><span class="slider round"></span></label><br><label id="sEnv' + i + '">' + state + '</label></center></td></tr>';
        }

        document.getElementById('services').innerHTML = rowHtml;



    })
}

function cleanTable() {
    document.getElementById('services').innerHTML = '<tr><th><center>Service Name</center></th><th><center>State</center></th></tr>';
}

function goHome() {
    document.getElementById('services').innerHTML = '';
}



function changeState(id) {

    var s = document.getElementById('s' + id).checked,
        fullURL, nEnv, dbName;
    // console.log("Toggle switch changed to [" + s + id + "]");

    // var uri = getAPISpec();

    switch (s) {

        case true:

            document.getElementById('sEnv' + id).innerText = "STARTING";
            document.getElementById('s' + id).disabled = true;

            nEnv = document.getElementById("nEnv" + id).innerText;
            dbName = document.getElementById("dbName" + id).value;
            fullURL = SERVER_URL + "/" + nEnv + "?dbName=" + dbName + "&action=start";
            console.log("Invoking URL [" + fullURL + "]");

            postAPI(fullURL, {});

            break;

        case false:

            document.getElementById('sEnv' + id).innerText = "STOPPING";
            document.getElementById('switch' + id).disabled = true;

            nEnv = document.getElementById("nEnv" + id).innerText;
            dbName = document.getElementById("dbName" + id).value;
            fullURL = SERVER_URL + "/" + nEnv + "?dbName=" + dbName + "&action=stop";
            console.log("Invoking URL [" + fullURL + "]");

            postAPI(fullURL, {});
            break;
    }
}

function postAPI(url, data) {

    $.post(url, data, function (data, status) {
        console.log(`Respone from POST API is [${data}] and status is [${status}]`);
    });
}