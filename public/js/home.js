// Get temperature from server
function getRoomData() {
    $.ajax({
        type : "GET",
        url: '/roomData',
        success: function(result){
            setGauge(result.roomData);
            console.log("Success: ", result);
        },
        error : function(e) {
            $('#errors').html("<strong>Error</strong>");
            console.log("ERROR: ", e);
        }
    })
}

var gauges = [];

function setGauge(roomData) {
    for (var i = 0; i < roomData.length; i++) {
        gauges[i * 3].refresh(parseFloat(roomData[i].temperature));
        gauges[i * 3 + 1].refresh(parseFloat(roomData[i].humidity));
        gauges[i * 3 + 2].refresh(parseFloat((1024 - roomData[i].brightness) / 10.24));
        var switchLed = '#switch' + i;
        if (roomData[i].ledState == '0') {
            $(switchLed).prop("checked", false);
        } else {
            $(switchLed).prop("checked", true);
        }
    }
}

function onLoadView(roomNum) {
    var refreshIntervalId = setInterval(getRoomData, 10000);
    //clearInterval(refreshIntervalId);

    for (var i = 0; i < roomNum * 3; i++){
        gauges.push(new JustGage({
            id: "gauge" + i, // the id of the html element
            value: 0,
            min: 0,
            max: 100,
            decimals: 2,
            gaugeWidthScale: 0.6
        }));
    }

    getRoomData();
}

function onSwitchClick(id) {
    $.ajax({
        type : "Post",
        url: '/led',
        cache: false,
        data: {id: id},
        success: function(result){
            console.log("Success: ", result);
        },
        error : function(e) {
            $('h1').html("<strong>Error</strong>");
            console.log("ERROR: ", e);
        }
    })
}