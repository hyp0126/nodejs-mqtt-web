// Get temperature from server
function getRoomData() {
    $.ajax({
        type : "GET",
        url: '/roomData',
        success: function(result){
            $('#temperature').html(result.roomData.temperature);
            $('#humidity').html(result.roomData.humidity);
            $('#brightness').html(result.roomData.brightness);
            $('#ledState').html(result.roomData.ledState);
            console.log("Success: ", result);
        },
        error : function(e) {
            $('h1').html("<strong>Error</strong>");
            console.log("ERROR: ", e);
        }
    })
}

var refreshIntervalId = setInterval(getRoomData, 10000);
//clearInterval(refreshIntervalId);

function toggleLed() {
    $.ajax({
        type : "GET",
        url: '/led',
        success: function(result){
            console.log("Success: ", result);
        },
        error : function(e) {
            $('h1').html("<strong>Error</strong>");
            console.log("ERROR: ", e);
        }
    })
}