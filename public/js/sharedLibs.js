const url = 'http://localhost:3000/services/oic';

function loadOICInstances() {

    $.getJSON(url, function (result) {
        console.log("Result is [" + JSON.stringify(result) + "]");
        var rowHtml = "";
        for (var i = 0; i < result.services.length; ++i) {

            console.log("Setting nEnv" + i + "to [" + result.services[i].name + "]");
            console.log("Setting sEnv" + i + "to [" + result.services[i].state + "]");
            console.log("Setting dbName" + i + "to [" + result.services[i].dbName + "]");

            // document.getElementById('nEnv' + i).innerText = result.services[i].name;
            // document.getElementById('sEnv' + i).innerText = result.services[i].state;

            if (i == 0) {
                rowHtml = '<tr><th><center>Service Name</center></th><th><center>State</center></th></tr>';
            }

            rowHtml += '<tr><td id="nEnv' + i + '">' + result.services[i].name + '</td><td><center><label class="switch"><input id="s' + i + '" type="checkbox" onchange="changeState(' + i + ');"><span class="slider round"></span></label><br><label id="sEnv' + i + '">' + result.services[i].state + '</label></center></td></tr>';
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

    var s = document.getElementById('s' + id).checked;
    // console.log("Toggle switch changed to [" + s + id + "]");

    // var uri = getAPISpec();

    switch (s) {

        case true:

            document.getElementById('sEnv' + id).innerText = "STARTING";
            break;

        case false:

            document.getElementById('sEnv' + id).innerText = "STOPPING";
            break;
    }
}