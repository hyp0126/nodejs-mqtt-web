
function onLoadChart() {
    var date = new Date()
    updateChart(date);
    $("#datepicker").val(`${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`)
}

function onChangeDate(){
    var date = $("#datepicker").val();
    updateChart(new Date(date));
}

function updateChart(date) {
    var tempDataPoints = [];
    tempDataPoints[0] = [];
    tempDataPoints[1] = [];

    // Get Temperature Date (room1, room2)
    $.ajax({
        type: "Post",
        url: '/temperature',
        data: { date: date },
        cache: false,
        success: function (result) {
            var splits;
            for (var tempMsg of result.tempMsgs) {
                splits = tempMsg.topic.split('/');
                if (splits[1] == 'room1') {
                    tempDataPoints[0].push({
                        x: new Date(tempMsg.date),
                        y: parseFloat(tempMsg.value)
                    });
                } else if (splits[1] == 'room2') {
                    tempDataPoints[1].push({
                        x: new Date(tempMsg.date),
                        y: parseFloat(tempMsg.value)
                    });
                }
            }
            $("#chartContainer").CanvasJSChart(options);
            if (result.tempMsgs.length == 0){
                $('#errors').html("No data on this date");
            } else {
                $('#errors').html("Data loading completed");
                console.log("Success: ", result);
            }
        },
        error: function (e) {
            $('#errors').html("<strong>Error</strong>");
            console.log("ERROR: ", e);
        }
    });

    var options = {
        animationEnabled: true,
        theme: "light2",
        title: {
            text: `Room Temperature (${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()})`
        },
        axisX: {
            valueFormatString: "HH:mm"
        },
        axisY: {
            title: "Degree",
            suffix: " C",
            minimum: 0
        },
        toolTip: {
            shared: true
        },
        legend: {
            cursor: "pointer",
            verticalAlign: "bottom",
            horizontalAlign: "left",
            dockInsidePlotArea: true,
            itemclick: toogleDataSeries
        },
        data: [{
            type: "line",
            showInLegend: true,
            name: "Room1",
            markerType: "square",
            xValueFormatString: "HH:mm",
            color: "#F08080",
            yValueFormatString: "#,##0",
            dataPoints: tempDataPoints[0]
        },
        {
            type: "line",
            showInLegend: true,
            name: "Room2",
            lineDashType: "dash",
            yValueFormatString: "#,##0",
            dataPoints: tempDataPoints[1]
        }]
    };

    function toogleDataSeries(e) {
        if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
            e.dataSeries.visible = false;
        } else {
            e.dataSeries.visible = true;
        }
        e.chart.render();
    }
}
