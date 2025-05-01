document.addEventListener("DOMContentLoaded", () => {
  // Form submit handler
  document.getElementById("voterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const voterId = document.getElementById("voterId").value.trim();
    const dob = document.getElementById("dob").value;

    if (!/^[A-Za-z0-9]{10}$/.test(voterId) || calculateAge(dob) < 18) {
      alert("Invalid Voter ID or age must be 18+.");
      return;
    }

    showPage(2);
  });

  // Fingerprint scan button
  document.getElementById("scanBtn").addEventListener("click", () => {
    scanFingerprint();
  });

  // Retry button inside modal
  document.getElementById("retryBtn").addEventListener("click", () => {
    closeModal();
    showPage(2);
  });
});

function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function showPage(pageNum) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page" + pageNum).classList.add("active");
  document.getElementById("scanStatus").textContent = "Please place your finger on the scanner";
  document.getElementById("fingerprintIcon").classList.remove("visible");
}

async function scanFingerprint() {
  const scanStatus = document.getElementById("scanStatus");
  const sensor = document.getElementById("fingerprintSensor");
  const icon = document.getElementById("fingerprintIcon");
  const button = document.getElementById("scanBtn");

  scanStatus.textContent = "Scanning...";
  sensor.classList.add("scanning");
  icon.classList.add("visible");
  button.disabled = true;

  try {
    const response = await fetch("http://localhost:5000/scan_fingerprint");
    const data = await response.json();

    setTimeout(() => {
      sensor.classList.remove("scanning");
      icon.classList.remove("visible");
      button.disabled = false;

      if (data.status === "success") {
        document.getElementById("successMessage").textContent =
          `Voter ID: ${data.voterID}, Name: ${data.name}, Assembly: ${data.assembly}`;
        showResultModal(true);
      } else {
        document.getElementById("errorMessage").textContent = data.message || "❌ Verification failed!";
        showResultModal(false);
      }
    }, 1000);

  } catch (err) {
    console.error(err);
    scanStatus.textContent = "Connection failed. Try again.";
    sensor.classList.remove("scanning");
    icon.classList.remove("visible");
    button.disabled = false;
    document.getElementById("errorMessage").textContent = "❌ Could not connect to server.";
    showResultModal(false);
  }
}

function showResultModal(success) {
  const modal = document.getElementById("resultModal");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);
  document.getElementById("successBox").style.display = success ? "block" : "none";
  document.getElementById("errorBox").style.display = success ? "none" : "block";
}

function resetFlow() {
  document.getElementById("resultModal").classList.remove("active");
  setTimeout(() => {
    document.getElementById("resultModal").style.display = "none";
    document.getElementById("voterForm").reset();
    showPage(1);
  }, 300);
}

function closeModal() {
  document.getElementById("resultModal").classList.remove("active");
  setTimeout(() => {
    document.getElementById("resultModal").style.display = "none";
  }, 300);
}
