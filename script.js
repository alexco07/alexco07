// REPLACE with your deployed Web App URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxc_-rmsBGEEYidMuLFSEiccxkNwSTUWtKv7tsxMoVEDEhoDCFs8VR9WL20oxbm7kYC/exec'; 

const video = document.getElementById('video');
const status = document.getElementById('status');

// Load models from local /models folder
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => { video.srcObject = stream; })
        .catch(err => { console.error(err); status.innerText = "Error: Camera access denied."; });
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
    if (!name) return alert("Enter a name first");

    status.innerText = "Processing...";
    const detection = await getDescriptor();
    
    if (!detection) return status.innerText = "No face detected!";

    // Send to GAS
    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ name: name, descriptor: Array.from(detection.descriptor) }),
            mode: 'no-cors' // Using no-cors because Apps Script redirect issues
        });
        status.innerText = "Registered: " + name;
    } catch (err) {
        status.innerText = "Error saving to database.";
    }
}

async function identifyFace() {
    status.innerText = "Identifying...";
    
    // 1. Fetch Known Faces
    const response = await fetch(GAS_URL);
    const knownFaces = await response.json();
    
    if (knownFaces.length === 0) return status.innerText = "Database empty.";

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
    status.innerText = "Result: " + bestMatch.label + " (Distance: " + bestMatch.distance.toFixed(2) + ")";
}
