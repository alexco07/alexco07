// REPLACE with your Web App URL after deployment
const GAS_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE'; 

const video = document.getElementById('video');
const status = document.getElementById('status');

// Load models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    );
    status.innerText = "Models Loaded. Ready.";
}

async function getDescriptor() {
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
}

async function registerFace() {
    const name = document.getElementById('nameInput').value;
    if (!name) return alert("Enter a name");

    status.innerText = "Processing...";
    const detection = await getDescriptor();
    
    if (!detection) return status.innerText = "No face detected!";

    // Send to GAS
    await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ name: name, descriptor: Array.from(detection.descriptor) })
    });
    
    status.innerText = "Registered: " + name;
}

async function identifyFace() {
    status.innerText = "Identifying...";
    
    // 1. Fetch Known Faces
    const response = await fetch(GAS_URL);
    const knownFaces = await response.json();
    
    // 2. Format for face-api
    const labeledDescriptors = knownFaces.map(item => {
        return new faceapi.LabeledFaceDescriptors(
            item.name,
            [new Float32Array(item.descriptor)]
        );
    });

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

    // 3. Detect current face
    const detection = await getDescriptor();
    if (!detection) return status.innerText = "No face detected!";

    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
    status.innerText = "Result: " + bestMatch.label + " (" + bestMatch.distance.toFixed(2) + ")";
}
