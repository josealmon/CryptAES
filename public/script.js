document.addEventListener("DOMContentLoaded", () => {
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");
  const encryptSection = document.getElementById("encryptSection");
  const decryptSection = document.getElementById("decryptSection");
  const fileForm = document.getElementById("fileForm");
  const messageEl = document.getElementById("message");

  // Add reference to submit buttons
  const encryptSubmitBtn = document.getElementById("encryptSubmitBtn");
  const decryptSubmitBtn = document.getElementById("decryptSubmitBtn");

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  // Validation function
  function validateForm(fileInput, keyInput, submitBtn) {
    const file = fileInput.files[0];
    const isValidSize = file ? file.size <= MAX_FILE_SIZE : false;
    const isValidKey = keyInput.value.trim() !== "";

    submitBtn.disabled = !(isValidSize && isValidKey);

    if (file && !isValidSize) {
      messageEl.textContent = "File size must be less than 100MB";
    } else {
      messageEl.textContent = "";
    }
  }

  // Add listeners for encrypt inputs
  document.getElementById("encryptFile").addEventListener("change", () => {
    validateForm(document.getElementById("encryptFile"), document.getElementById("encryptKey"), encryptSubmitBtn);
  });

  document.getElementById("encryptKey").addEventListener("input", () => {
    validateForm(document.getElementById("encryptFile"), document.getElementById("encryptKey"), encryptSubmitBtn);
  });

  // Add listeners for decrypt inputs
  document.getElementById("decryptFile").addEventListener("change", () => {
    validateForm(document.getElementById("decryptFile"), document.getElementById("decryptKey"), decryptSubmitBtn);
  });

  document.getElementById("decryptKey").addEventListener("input", () => {
    validateForm(document.getElementById("decryptFile"), document.getElementById("decryptKey"), decryptSubmitBtn);
  });

  document.querySelectorAll(".file-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const fileName = e.target.files[0]?.name || "No file chosen";
      e.target.parentElement.querySelector(".file-name").textContent = fileName;

      // Validate file size immediately
      const submitBtn = e.target.id === "encryptFile" ? encryptSubmitBtn : decryptSubmitBtn;
      const keyInput = e.target.id === "encryptFile" ? document.getElementById("encryptKey") : document.getElementById("decryptKey");
      validateForm(e.target, keyInput, submitBtn);
    });
  });

  // Toggle between encrypt and decrypt
  encryptBtn.addEventListener("click", () => {
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");
    encryptSection.style.display = "flex";
    decryptSection.style.display = "none";
    fileForm.reset();
    encryptSubmitBtn.disabled = true;
  });

  decryptBtn.addEventListener("click", () => {
    decryptBtn.classList.add("active");
    encryptBtn.classList.remove("active");
    decryptSection.style.display = "flex";
    encryptSection.style.display = "none";
    fileForm.reset();
    decryptSubmitBtn.disabled = true;
  });

  fileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const overlay = document.querySelector(".overlay");

    // Show overlay with spinner
    overlay.style.display = "flex";
    messageEl.textContent = "Processing...";

    const isEncrypt = encryptBtn.classList.contains("active");
    const fileInput = isEncrypt ? document.getElementById("encryptFile") : document.getElementById("decryptFile");
    const keyInput = isEncrypt ? document.getElementById("encryptKey") : document.getElementById("decryptKey");

    const file = fileInput.files[0];
    const key = keyInput.value;

    if (!file || !key) {
      messageEl.textContent = "Please select a file and enter a key";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("key", key);

    try {
      const endpoint = isEncrypt ? "/encrypt" : "/decrypt";
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON (error) or blob (success)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }

      const blob = await response.blob();
      const filename = isEncrypt ? `encrypted_${file.name}` : `decrypted_${file.name}`;

      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = filename;
      downloadLink.click();

      messageEl.textContent = isEncrypt ? "File encrypted successfully!" : "File decrypted successfully!";
    } catch (error) {
      messageEl.textContent = error.message;
      console.error("Processing error:", error);
    } finally {
      // Hide overlay when done
      overlay.style.display = "none";
    }
  });
});
