const socket = io();

const myFace = document.querySelector("#myFace");
const muteBtn = document.querySelector("#mute");
const cameraBtn = document.querySelector("#camera");
const cameraSelect = document.querySelector("#cameras");
const call = document.querySelector("#call");

//audio + video
let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

call.classList.add("hidden");

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind == "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
                option.selected = true;
            }
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        console.log(error);
    }
}


//mozilla mediaDevices.getUserMedia
async function getMedia(deviceId) {
    const initialConstraints = {
        audio: true,
        video: {
            facingmode: "user"
        },
    };
    const cameraConstraints = {
        audio: true,
        video: {
            deviceId: {
                exact: deviceId
            }
        },
    }
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstraints
        );
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCameras();
        }
    } catch (error) {
        console.log(error);
    }

}

const handleMuteClick = () => {
    myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute"
        muted = false;
    }
}

const handleCameraClick = () => {
    myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    if (cameraOff) {
        cameraBtn.innerText = "Turn ON Camera";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn OFF Camera"
        cameraOff = true;
    }
}

const handleCameraChange = async () => {
    await getMedia(cameraSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSerders().find(sender =>
            sender.track.kind === "video"
        );
        videoSender.replaceTrack(videoTrack);
    }
}



muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);


// welcome Form
const welcome = document.querySelector("#welcome");
const welcomForm = welcome.querySelector("form");
const error = welcome.querySelector(".error");



async function initCall() {
    welcome.classList.add("hidden");
    call.classList.remove("hidden");
    await getMedia();
    makeConnection();
}



function checkBeforeSubmit(isValid) {
    if(isValid) {
        submitAfterCheck();
    }else{
        error.classList.remove("hidden");
    }
};

async function submitAfterCheck() {
    const input = welcomForm.querySelector("input");
    await initCall();
    socket.emit("join_room", roomName);
    input.value = "";
}

function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomForm.querySelector("input");
    roomName = input.value;
    error.classList.add("hidden");
    socket.emit("check_room", roomName, checkBeforeSubmit);
}
welcomForm.addEventListener("submit", handleWelcomeSubmit);



// SocketCode 
socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("Sent offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);

});
socket.on("answer", async (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
    console.log("Receive iceCandidate");
    myPeerConnection.addIceCandidate(ice);
});



// RTC code
function makeConnection() {
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream.getTracks().forEach(track => {
        myPeerConnection.addTrack(track, myStream);
    })
}

function handleIce(data) {
    console.log("Sent iceCandidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peerFace = document.querySelector("#peerFace");
    peerFace.srcObject = data.stream;
}