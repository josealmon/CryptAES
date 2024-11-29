document.addEventListener("DOMContentLoaded", () => {
  const encryptBtn = document.getElementById("encryptBtn");
  const decryptBtn = document.getElementById("decryptBtn");
  const encryptSection = document.getElementById("encryptSection");
  const decryptSection = document.getElementById("decryptSection");
  const fileForm = document.getElementById("fileForm");
  const messageEl = document.getElementById("message");

  // Toggle between encrypt and decrypt
  encryptBtn.addEventListener("click", () => {
    encryptBtn.classList.add("active");
    decryptBtn.classList.remove("active");
    encryptSection.style.display = "flex";
    decryptSection.style.display = "none";
    fileForm.reset();
  });

  decryptBtn.addEventListener("click", () => {
    decryptBtn.classList.add("active");
    encryptBtn.classList.remove("active");
    decryptSection.style.display = "flex";
    encryptSection.style.display = "none";
    fileForm.reset();
  });

  fileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

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

      // Importante: verificar la respuesta JSON para manejar errores
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Processing failed");
      }

      const blob = await response.blob();
      const filename = isEncrypt ? `encrypted_${file.name}` : `decrypted_${file.name}`;

      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = filename;
      downloadLink.click();

      messageEl.textContent = isEncrypt ? "File encrypted successfully!" : "File decrypted successfully!";
    } catch (error) {
      messageEl.textContent = `Error: ${error.message}`;
      console.error("Decryption error:", error);
    }
  });
});
