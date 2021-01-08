// Get temperature from server
function getTemperature() {
    $.ajax({
        type : "GET",
        url: '/temperature',
        success: function(result){
            $('h1').html(result.temperature);
            console.log("Success: ", result);
        },
        error : function(e) {
            $('h1').html("<strong>Error</strong>");
            console.log("ERROR: ", e);
        }
    })
}

var refreshIntervalId = setInterval(getTemperature, 10000);
//clearInterval(refreshIntervalId);