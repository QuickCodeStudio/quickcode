"use strict";
var sessionId = window.localStorage.getItem('SignalRSessionId', );
var connection = new signalR.HubConnectionBuilder()
    .withUrl(getConnectionUrl(), {
        "headers": { "sessionId": getSessionId() }
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();


connection.on("UpdateGeneratorStatus", function (projectId, actionId, allActions, allSteps) {
    allSteps.forEach(function (step, index, arr) {
        getStepRowHtml(step, allActions);
    })

    return true;
});


connection.on("ReceiveMessage", function (user, message) {
    var li = document.createElement("li");
    document.getElementById("messagesList").appendChild(li);

    li.textContent = `${user} says ${message}`;
});

connection.start().then(function () {
    console.log("connection.started");
}).catch(function (err) {
    return console.error(err.toString());
});

function getStepRowHtml(step, allActions) {
    var stepTitle = step.description;
    var stepValue = step.waitingMessage;
    var actions = allActions.filter(a => a.generationStepId == step.id);
    if (actions.length == 0) {
        return
    }
    var elapsedSeconds = 0;
    var action = actions[0];

    if (action.isCompleted) {
        stepValue = step.completedMessage;
        elapsedSeconds = action.elapsedTime / 1000;
        $("#step_icon_waiting_" + step.id).attr('style', 'display:none !important;');
        $("#step_icon_in_progress_" + step.id).attr('style', 'display:none !important;');

        $("#step_icon_completed_" + step.id).attr('style', 'display:block !important;');
        $("#step_elapsed_time_" + step.id).text(parseInt(elapsedSeconds) + "s");
        if (action.outputMessage != null && action.outputMessage.length > 0 && action.outputMessage.startsWith("http")) {
            $("#step_result_" + step.id).attr('style', 'display:block !important;');
            $("#step_result_" + step.id).html("<a href='" + action.outputMessage + "' target='_blank' rel='noopener noreferrer' style='color:blue;' >" + action.outputMessage + "</a>");
        }

    } else if (action.startDate !== null) {
        stepValue = step.inProgressMessage;
        elapsedSeconds = (new Date() - new Date(action.startDate)) / 1000 / 60 / 60;
        $("#step_icon_waiting_" + step.id).attr('style', 'display:none !important;');
        $("#step_icon_completed_" + step.id).attr('style', 'display:none !important;');

        $("#step_icon_in_progress_" + step.id).attr('style', 'display:block !important;color:chocolate;width:22px; height:22px;');

        $("#step_elapsed_time_" + step.id).text("In Progress");
    } else {
        $("#step_icon_waiting_" + step.id).attr('style', 'display:block !important;');

        $("#step_icon_completed_" + step.id).attr('style', 'display:none !important;');
        $("#step_icon_in_progress_" + step.id).attr('style', 'display:none !important;');
        $("#step_elapsed_time_" + step.id).text("Not Started");
    }

    $("#step_title_" + step.id).text(stepTitle);
    $("#step_message_" + step.id).text(stepValue);
  
}

function newGuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function getConnectionUrl() {
    let connectionUrl = "https://api.quickcode.net/quickcodeHub?sessionId=" + getSessionId();
    console.log('location.hostname : ' + location.hostname);
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
        connectionUrl = "https://localhost:5005/quickcodeHub?sessionId=" + getSessionId();
    }

    return connectionUrl;
}

function getSessionId() {
    let sessionId = localStorage.getItem("SignalRSessionId");

    if (sessionId === null) {
        sessionId = newGuid();
    }
    localStorage.setItem("SignalRSessionId", sessionId);
    return sessionId;
}

function updateLoadingText(step, siteName) {
    setTimeout(function () {
        $("#loadingText").text("Please wait...");
    }, 10);
}
